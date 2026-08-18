"""Check which migrations have been applied."""
import os
import sys
import psycopg2

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

# Check if running in Docker
IS_DOCKER = os.path.exists("/app") or os.getenv("DOCKER_CONTAINER") == "true"

def check_migrations():
    """Check migration status."""
    # Check if we should run in Docker
    if not IS_DOCKER:
        print("WARNING: Not running in Docker container!")
        print("   This script should be run inside the Docker container where the database is accessible.")
        print("\n   Please run it using:")
        print("   docker-compose exec backend python scripts/check_migrations.py")
        print("\n   Or if using docker directly:")
        print("   docker exec -it softscale-backend python scripts/check_migrations.py")
        sys.exit(1)

    try:
        conn = psycopg2.connect(**settings.db_config)
        with conn.cursor() as cur:
            # Check if migrations table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'schema_migrations'
                )
            """)
            table_exists = cur.fetchone()[0]

            if not table_exists:
                print("Migration tracking table does not exist.")
                print("Migrations have not been run yet.")
                return

            # Get applied migrations
            cur.execute("""
                SELECT migration_name, description, applied_at
                FROM schema_migrations
                ORDER BY applied_at
            """)
            migrations = cur.fetchall()

            if not migrations:
                print("No migrations have been applied yet.")
            else:
                print(f"Found {len(migrations)} applied migration(s):\n")
                for name, desc, applied_at in migrations:
                    print(f"  - {name}")
                    print(f"    Description: {desc}")
                    print(f"    Applied at: {applied_at}")
                    print()

        conn.close()

    except psycopg2.OperationalError as e:
        print(f"Database connection error: {str(e)}")
        print("Make sure the database is running and accessible.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    check_migrations()

