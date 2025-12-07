"""
Complete script to create table and import all proposal templates.
This script will show all output and verify the import.
"""
import os
import sys
import subprocess

# Add backend to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
sys.path.insert(0, BACKEND_DIR)

def run_sql_command(sql):
    """Run a SQL command via docker-compose."""
    cmd = [
        'docker-compose', 'exec', '-T', 'postgres',
        'psql', '-U', 'postgres', '-d', 'talent_match_db'
    ]

    try:
        result = subprocess.run(
            cmd,
            input=sql,
            text=True,
            capture_output=True,
            timeout=30,
            cwd=BASE_DIR
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def create_table():
    """Create the proposal_templates table."""
    print("=" * 70)
    print("STEP 1: Creating proposal_templates table...")
    print("=" * 70)

    sql = """
    CREATE TABLE IF NOT EXISTS proposal_templates (
        template_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        prompt TEXT NOT NULL,
        content TEXT,
        tags TEXT[],
        domain VARCHAR(100),
        tone VARCHAR(50),
        complexity VARCHAR(50),
        source_file VARCHAR(255),
        metadata JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    success, stdout, stderr = run_sql_command(sql)
    if success:
        print("✓ Table created successfully")
        if stdout:
            print(stdout)
    else:
        print(f"✗ Error creating table: {stderr}")
        return False

    # Create indexes
    print("\nCreating indexes...")
    indexes_sql = """
    CREATE INDEX IF NOT EXISTS idx_proposal_templates_category ON proposal_templates(category);
    CREATE INDEX IF NOT EXISTS idx_proposal_templates_domain ON proposal_templates(domain);
    CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active);
    CREATE INDEX IF NOT EXISTS idx_proposal_templates_tags ON proposal_templates USING GIN(tags);
    """

    success, stdout, stderr = run_sql_command(indexes_sql)
    if success:
        print("✓ Indexes created successfully")
    else:
        print(f"⚠ Warning creating indexes: {stderr}")

    return True

def verify_table():
    """Verify the table exists."""
    print("\n" + "=" * 70)
    print("STEP 2: Verifying table exists...")
    print("=" * 70)

    sql = "SELECT COUNT(*) as count FROM proposal_templates;"
    success, stdout, stderr = run_sql_command(sql)

    if success:
        print("✓ Table exists and is accessible")
        print(stdout)
        return True
    else:
        print(f"✗ Table verification failed: {stderr}")
        return False

def import_templates():
    """Run the import script."""
    print("\n" + "=" * 70)
    print("STEP 3: Importing templates from materials folder...")
    print("=" * 70)

    import_script = os.path.join(BACKEND_DIR, "scripts", "import_proposal_templates.py")

    if not os.path.exists(import_script):
        print(f"✗ Import script not found: {import_script}")
        return False

    try:
        # Change to backend directory to ensure proper imports
        result = subprocess.run(
            [sys.executable, import_script],
            cwd=BACKEND_DIR,
            text=True,
            capture_output=True,
            timeout=300  # 5 minute timeout
        )

        # Print all output
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)

        if result.returncode == 0:
            print("\n✓ Import completed successfully!")
            return True
        else:
            print(f"\n✗ Import failed with return code: {result.returncode}")
            return False

    except subprocess.TimeoutExpired:
        print("✗ Import timed out after 5 minutes")
        return False
    except Exception as e:
        print(f"✗ Error running import: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_template_count():
    """Get the final count of templates."""
    print("\n" + "=" * 70)
    print("STEP 4: Final verification...")
    print("=" * 70)

    sql = "SELECT COUNT(*) as total FROM proposal_templates;"
    success, stdout, stderr = run_sql_command(sql)

    if success:
        print(stdout)
        # Try to extract the number
        try:
            lines = stdout.strip().split('\n')
            for line in lines:
                if line.strip().isdigit():
                    count = int(line.strip())
                    print(f"\n✓ Total templates in database: {count}")
                    return count
        except:
            pass
    else:
        print(f"✗ Could not get count: {stderr}")

    return 0

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("PROPOSAL TEMPLATES - COMPLETE SETUP AND IMPORT")
    print("=" * 70 + "\n")

    # Step 1: Create table
    if not create_table():
        print("\n✗ Failed to create table. Exiting.")
        sys.exit(1)

    # Step 2: Verify table
    if not verify_table():
        print("\n✗ Table verification failed. Exiting.")
        sys.exit(1)

    # Step 3: Import templates
    if not import_templates():
        print("\n✗ Import failed. Check errors above.")
        sys.exit(1)

    # Step 4: Get final count
    count = get_template_count()

    print("\n" + "=" * 70)
    print("✓ SETUP COMPLETE!")
    print("=" * 70)
    print(f"\nTotal templates imported: {count}")
    print("\nYou can now use the proposal generation feature in the frontend!")
    print("=" * 70 + "\n")
