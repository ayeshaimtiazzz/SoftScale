#!/usr/bin/env python3
"""
Database Backup Script
Creates a complete backup dump of the PostgreSQL database including all data.
"""
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings

def create_backup():
    """Create a database backup dump."""
    # Get database configuration
    db_name = settings.DB_NAME or os.getenv("DB_NAME", "talent_match_db")
    db_user = settings.DB_USER or os.getenv("DB_USER", "postgres")
    db_password = settings.DB_PASSWORD or os.getenv("DB_PASSWORD", "4681")
    db_host = settings.DB_HOST or os.getenv("DB_HOST", "localhost")
    db_port = settings.DB_PORT or os.getenv("DB_PORT", "5432")

    # Create backup directory if it doesn't exist
    backup_dir = Path(__file__).parent.parent / "database" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Generate backup filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"softscale_backup_{timestamp}.sql"
    backup_path = backup_dir / backup_filename

    # Set PGPASSWORD environment variable for pg_dump
    env = os.environ.copy()
    env["PGPASSWORD"] = db_password

    # Build pg_dump command
    # Options:
    # -Fc: Custom format (compressed, allows selective restore)
    # -Fp: Plain SQL format (readable, can be edited)
    # Using -Fp for plain SQL format that's easy to read and restore
    pg_dump_cmd = [
        "pg_dump",
        "-h", db_host,
        "-p", str(db_port),
        "-U", db_user,
        "-d", db_name,
        "-F", "p",  # Plain SQL format
        "-f", str(backup_path),
        "--verbose",  # Show progress
        "--no-owner",  # Don't include ownership commands
        "--no-acl",  # Don't include access privileges
    ]

    print("=" * 70)
    print("SoftScale Database Backup")
    print("=" * 70)
    print(f"Database: {db_name}")
    print(f"Host: {db_host}:{db_port}")
    print(f"User: {db_user}")
    print(f"Backup file: {backup_path}")
    print("=" * 70)
    print()

    try:
        # Execute pg_dump
        result = subprocess.run(
            pg_dump_cmd,
            env=env,
            check=True,
            capture_output=True,
            text=True
        )

        # Check if backup file was created and has content
        if backup_path.exists() and backup_path.stat().st_size > 0:
            file_size = backup_path.stat().st_size
            file_size_mb = file_size / (1024 * 1024)
            print(f"✓ Backup created successfully!")
            print(f"  File: {backup_path}")
            print(f"  Size: {file_size_mb:.2f} MB ({file_size:,} bytes)")
            print()
            print(f"To restore this backup, use:")
            print(f"  psql -h {db_host} -p {db_port} -U {db_user} -d {db_name} < {backup_path}")
            return str(backup_path)
        else:
            print("✗ Error: Backup file was not created or is empty")
            return None

    except subprocess.CalledProcessError as e:
        print(f"✗ Error running pg_dump:")
        print(f"  {e.stderr}")
        print()
        print("Make sure:")
        print("  1. PostgreSQL client tools (pg_dump) are installed")
        print("  2. Database is running and accessible")
        print("  3. Database credentials are correct")
        return None
    except FileNotFoundError:
        print("✗ Error: pg_dump command not found")
        print()
        print("Please install PostgreSQL client tools:")
        print("  - Windows: Download from https://www.postgresql.org/download/windows/")
        print("  - macOS: brew install postgresql")
        print("  - Linux: sudo apt-get install postgresql-client (Ubuntu/Debian)")
        print("           sudo yum install postgresql (RHEL/CentOS)")
        return None
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return None

def create_backup_docker():
    """Create a database backup from Docker container."""
    db_name = settings.DB_NAME or os.getenv("DB_NAME", "talent_match_db")
    db_user = settings.DB_USER or os.getenv("DB_USER", "postgres")
    db_password = settings.DB_PASSWORD or os.getenv("DB_PASSWORD", "4681")
    container_name = "softscale-postgres"

    # Create backup directory
    backup_dir = Path(__file__).parent.parent / "database" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Generate backup filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"softscale_backup_{timestamp}.sql"
    backup_path = backup_dir / backup_filename

    print("=" * 70)
    print("SoftScale Database Backup (Docker)")
    print("=" * 70)
    print(f"Container: {container_name}")
    print(f"Database: {db_name}")
    print(f"Backup file: {backup_path}")
    print("=" * 70)
    print()

    # Build docker exec command
    docker_cmd = [
        "docker", "exec",
        container_name,
        "pg_dump",
        "-U", db_user,
        "-d", db_name,
        "-F", "p",  # Plain SQL format
        "--no-owner",
        "--no-acl",
    ]

    try:
        # Execute docker exec and redirect output to file
        with open(backup_path, "w", encoding="utf-8") as f:
            result = subprocess.run(
                docker_cmd,
                env={"PGPASSWORD": db_password},
                stdout=f,
                stderr=subprocess.PIPE,
                check=True,
                text=True
            )

        # Check if backup file was created
        if backup_path.exists() and backup_path.stat().st_size > 0:
            file_size = backup_path.stat().st_size
            file_size_mb = file_size / (1024 * 1024)
            print(f"✓ Backup created successfully!")
            print(f"  File: {backup_path}")
            print(f"  Size: {file_size_mb:.2f} MB ({file_size:,} bytes)")
            print()
            print(f"To restore this backup, use:")
            print(f"  docker exec -i {container_name} psql -U {db_user} -d {db_name} < {backup_path}")
            return str(backup_path)
        else:
            print("✗ Error: Backup file was not created or is empty")
            return None

    except subprocess.CalledProcessError as e:
        print(f"✗ Error running pg_dump in Docker:")
        print(f"  {e.stderr}")
        print()
        print("Make sure:")
        print("  1. Docker is running")
        print(f"  2. Container '{container_name}' is running")
        print("  3. Database credentials are correct")
        return None
    except FileNotFoundError:
        print("✗ Error: docker command not found")
        print("  Make sure Docker is installed and in your PATH")
        return None
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return None

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Backup SoftScale database")
    parser.add_argument(
        "--docker",
        action="store_true",
        help="Use Docker container for backup (default: try local, fallback to docker)"
    )
    args = parser.parse_args()

    if args.docker:
        create_backup_docker()
    else:
        # Try local first, fallback to docker if pg_dump not found
        result = create_backup()
        if result is None:
            print()
            print("Attempting Docker backup as fallback...")
            print()
            create_backup_docker()


