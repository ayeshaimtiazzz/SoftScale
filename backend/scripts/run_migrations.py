"""Database migration runner.

This script automatically runs database migrations in the correct order.
It tracks which migrations have been applied to avoid running them twice.
"""
import os
import sys
import psycopg2
from pathlib import Path

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

# Check if running in Docker
IS_DOCKER = os.path.exists("/app") or os.getenv("DOCKER_CONTAINER") == "true"


def get_migration_files():
    """Get all migration files in order."""
    import os

    database_dir = None

    # First, try environment variable (set in docker-compose)
    env_db_dir = os.getenv("DATABASE_DIR")
    if env_db_dir:
        # Handle both absolute and relative paths
        env_path = Path(env_db_dir)
        if not env_path.is_absolute():
            # If relative, try from /app and from current working directory
            env_path = Path("/app") / env_db_dir
            if not env_path.exists():
                env_path = Path(os.getcwd()) / env_db_dir

        if env_path.exists() and (env_path / "schema.sql").exists():
            print(f"Using database directory from DATABASE_DIR env: {env_path}")
            database_dir = env_path

    # If not found via env var, try common locations
    if not database_dir:
        possible_dirs = [
            Path("/app/database"),  # Docker mount point (inside /app) - NEW LOCATION
            Path("/database"),  # Docker mount point (root level)
            Path("/app/../database").resolve(),  # Resolved relative path
            Path(__file__).parent.parent / "database",  # From script location (backend/database)
            Path(__file__).parent.parent.parent / "database",  # From script location (project root)
        ]

        # Add current working directory variations
        cwd = Path(os.getcwd())
        possible_dirs.extend([
            cwd / "database",
            cwd.parent / "database",
        ])

        print(f"Current working directory: {os.getcwd()}")
        print("Checking for database directory:")
        for dir_path in possible_dirs:
            try:
                exists = dir_path.exists()
                has_schema = (dir_path / "schema.sql").exists() if exists else False
                print(f"  - {dir_path}: exists={exists}, has_schema.sql={has_schema}")
                if exists and has_schema:
                    database_dir = dir_path
                    break
            except Exception as e:
                print(f"  - {dir_path}: Error - {e}")

    if not database_dir:
        # Last resort: list directories for debugging
        print("\nDebug: Root directory contents:")
        try:
            for item in Path("/").iterdir():
                print(f"  /{item.name}")
        except Exception as e:
            print(f"  Error: {e}")

        print("\nDebug: /app directory contents:")
        try:
            if Path("/app").exists():
                for item in Path("/app").iterdir():
                    print(f"  /app/{item.name}")
        except Exception as e:
            print(f"  Error: {e}")

        raise FileNotFoundError(
            f"Could not find database directory with schema.sql file.\n"
            f"Checked: {', '.join(str(d) for d in possible_dirs)}"
        )

    print(f"Using database directory: {database_dir}")

    # Define migration order
    migrations = [
        ("schema.sql", "Base schema"),
        ("migration_add_refresh_tokens.sql", "Add refresh tokens table"),
        ("migration_add_proposal_templates.sql", "Add proposal templates table"),
        ("migration_add_deals_table.sql", "Add deals table for CRM/Deal Management"),
        ("migration_add_proposals_table.sql", "Add proposals table for Proposal-Deal Integration"),
        ("migration_add_deal_notes_and_notifications.sql", "Add deal notes, notifications, and prospects tables"),
    ]

    migration_files = []
    for filename, description in migrations:
        filepath = database_dir / filename
        if filepath.exists():
            migration_files.append((filepath, description))
        else:
            print(f"Warning: Migration file not found: {filepath}")

    return migration_files


def create_migrations_table(conn):
    """Create the migrations tracking table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """)
        conn.commit()


def is_migration_applied(conn, migration_name):
    """Check if a migration has already been applied."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = %s",
            (migration_name,)
        )
        count = cur.fetchone()[0]
        return count > 0


def mark_migration_applied(conn, migration_name, description):
    """Mark a migration as applied."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO schema_migrations (migration_name, description)
               VALUES (%s, %s)
               ON CONFLICT (migration_name) DO NOTHING""",
            (migration_name, description)
        )
        conn.commit()


def run_migration(conn, filepath, description):
    """Run a single migration file."""
    migration_name = filepath.name

    # Check if already applied
    if is_migration_applied(conn, migration_name):
        print(f"Skipping {migration_name} (already applied)")
        return True

    print(f"Running {migration_name}...")

    try:
        # Read and execute the migration file
        with open(filepath, 'r', encoding='utf-8') as f:
            sql = f.read()

        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()

        # Mark as applied
        mark_migration_applied(conn, migration_name, description)
        print(f"Successfully applied {migration_name}")
        return True

    except Exception as e:
        conn.rollback()
        print(f"Error applying {migration_name}: {str(e)}")
        return False


def run_all_migrations():
    """Run all pending migrations."""
    import time
    import sys

    # Check if we should run in Docker
    if not IS_DOCKER:
        print("WARNING: Not running in Docker container!")
        print("   This script should be run inside the Docker container where the database is accessible.")
        print("\n   Please run it using:")
        print("   docker-compose exec backend python scripts/run_migrations.py")
        print("\n   Or if using docker directly:")
        print("   docker exec -it softscale-backend python scripts/run_migrations.py")
        sys.exit(1)

    print("Starting database migrations...")

    # Try to connect with retries (database might not be ready yet)
    max_retries = 5
    retry_delay = 2
    conn = None

    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(**settings.db_config)
            print(f"Connected to database: {settings.DB_NAME}")
            break
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                print(f"Database not ready (attempt {attempt + 1}/{max_retries}), retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                print(f"Database connection error after {max_retries} attempts: {str(e)}")
                print("   Make sure the database is running and accessible.")
                return False

    if not conn:
        return False

    try:

        # Create migrations tracking table
        create_migrations_table(conn)

        # Get all migration files
        migration_files = get_migration_files()

        if not migration_files:
            print("Warning: No migration files found!")
            return False

        print(f"Found {len(migration_files)} migration(s) to check")

        # Run each migration
        success_count = 0
        for filepath, description in migration_files:
            if run_migration(conn, filepath, description):
                success_count += 1
            else:
                print(f"Failed to apply migration: {filepath.name}")
                if conn:
                    conn.close()
                return False

        print(f"\nAll migrations completed successfully! ({success_count}/{len(migration_files)})")
        return True

    except Exception as e:
        print(f"Unexpected error during migrations: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import sys
    try:
        success = run_all_migrations()
        if success:
            print("Migrations completed successfully!")
        else:
            print("Migrations failed - check errors above.")
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Fatal error in migration script: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

