"""
Complete script that creates table AND imports templates.
This script will show all output and handle errors properly.
"""
import os
import sys
import re
import csv
import json
import psycopg2
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Force output to be unbuffered
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = BASE_DIR
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

# Database configuration
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "talent_match_db"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "4681"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

# Paths
MATERIALS_DIR = os.path.join(BASE_DIR, "backend", "materials")
PROPOSALS_DIR = os.path.join(MATERIALS_DIR, "proposals")
DATASETS_DIR = os.path.join(MATERIALS_DIR, "proposal generator datasets-20251207T102310Z-3-001", "proposal generator datasets")

def print_step(step_num, message):
    """Print a step header."""
    print("\n" + "=" * 70)
    print(f"STEP {step_num}: {message}")
    print("=" * 70)
    sys.stdout.flush()

def connect_db():
    """Create database connection."""
    try:
        print(f"Connecting to database: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}")
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Connected to database")
        sys.stdout.flush()
        return conn
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        print(f"  Config: host={DB_CONFIG['host']}, dbname={DB_CONFIG['dbname']}, user={DB_CONFIG['user']}")
        sys.stdout.flush()
        return None

def create_table(conn):
    """Create the proposal_templates table."""
    try:
        with conn.cursor() as cur:
            # Create table
            cur.execute("""
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
            """)

            # Create indexes
            cur.execute("CREATE INDEX IF NOT EXISTS idx_proposal_templates_category ON proposal_templates(category);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_proposal_templates_domain ON proposal_templates(domain);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_proposal_templates_active ON proposal_templates(is_active);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_proposal_templates_tags ON proposal_templates USING GIN(tags);")

            conn.commit()
            print("✓ Table and indexes created successfully!")
            sys.stdout.flush()
            return True
    except Exception as e:
        print(f"✗ Error creating table: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.stdout.flush()
        return False

def parse_markdown_frontmatter(content: str) -> Dict:
    """Parse YAML frontmatter from markdown file."""
    frontmatter = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            yaml_content = parts[1].strip()
            for line in yaml_content.split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    frontmatter[key.strip()] = value.strip()
    return frontmatter

def extract_markdown_sections(content: str) -> Dict:
    """Extract sections from markdown proposal."""
    sections = {}

    # Extract title
    title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if title_match:
        sections["title"] = title_match.group(1).strip()

    # Extract problem statement
    problem_match = re.search(r"###?\s*💥\s*Problem\s*\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if problem_match:
        sections["problem"] = problem_match.group(1).strip()

    # Extract hypothesis
    hypothesis_match = re.search(r"###?\s*👨‍🔬\s*Hypothesis\s*\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if hypothesis_match:
        sections["hypothesis"] = hypothesis_match.group(1).strip()

    # Extract implementation
    impl_match = re.search(r"##?\s*💻\s*Implementation\s*[^\n]*\n(.*?)(?=\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if impl_match:
        sections["implementation"] = impl_match.group(1).strip()

    # Extract description
    desc_match = re.search(r"#\s*Project\s*Description\s*\n(.*?)(?=\n#|\Z)", content, re.DOTALL | re.IGNORECASE)
    if desc_match:
        sections["description"] = desc_match.group(1).strip()

    # Extract tags from metadata table
    tags_match = re.search(r"Tags\s*\|\s*(.+?)(?:\n|$)", content, re.IGNORECASE)
    if tags_match:
        tags_str = tags_match.group(1).strip()
        sections["tags"] = [tag.strip() for tag in tags_str.split(",") if tag.strip()]

    return sections

def parse_markdown_proposal(file_path: Path) -> Optional[Dict]:
    """Parse a markdown proposal file and extract template data."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        frontmatter = parse_markdown_frontmatter(content)
        sections = extract_markdown_sections(content)

        # Determine title
        title = (
            frontmatter.get("title") or
            sections.get("title") or
            file_path.stem.replace("-", " ").replace("_", " ").title()
        )

        # Determine category based on content/domain
        category = "Technical"  # Default
        if any(word in content.lower() for word in ["healthcare", "medical", "hospital", "patient"]):
            category = "Healthcare"
        elif any(word in content.lower() for word in ["research", "discovery", "study"]):
            category = "Research"
        elif any(word in content.lower() for word in ["business", "startup", "market"]):
            category = "Business"
        elif any(word in content.lower() for word in ["wallet", "identity", "credential"]):
            category = "Technical"

        # Create prompt from problem and description
        problem = sections.get("problem", "")
        description = sections.get("description", "")
        hypothesis = sections.get("hypothesis", "")

        prompt_parts = []
        if problem:
            prompt_parts.append(f"Problem: {problem}")
        if description:
            prompt_parts.append(f"Description: {description}")
        if hypothesis:
            prompt_parts.append(f"Hypothesis: {hypothesis}")

        prompt = "\n".join(prompt_parts) if prompt_parts else f"Generate a proposal for: {title}"

        # Create description
        description_text = description or problem or f"Proposal template for {title}"
        if len(description_text) > 500:
            description_text = description_text[:500] + "..."

        # Extract tags
        tags = sections.get("tags", [])
        if not tags:
            filename_tags = [tag for tag in file_path.stem.split("-") if len(tag) > 3]
            tags = filename_tags[:5]

        return {
            "title": title,
            "category": category,
            "description": description_text,
            "prompt": prompt,
            "content": content[:5000],
            "tags": tags,
            "domain": frontmatter.get("domain", "General"),
            "tone": "Professional",
            "complexity": "Medium",
            "source_file": file_path.name,
            "metadata": json.dumps({
                "has_problem": bool(problem),
                "has_hypothesis": bool(hypothesis),
                "has_implementation": bool(sections.get("implementation")),
                "sections": list(sections.keys())
            })
        }
    except Exception as e:
        print(f"  Error parsing {file_path}: {e}")
        return None

def parse_csv_dataset(file_path: Path) -> List[Dict]:
    """Parse CSV dataset file and extract template data."""
    templates = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            sample = f.read(1024)
            f.seek(0)
            delimiter = "," if "," in sample else "\t"

            reader = csv.DictReader(f, delimiter=delimiter)

            for idx, row in enumerate(reader):
                instruction = row.get("Instruction") or row.get("instruction") or ""
                prompt = row.get("Prompt") or row.get("prompt") or row.get("user_input") or ""
                output = row.get("Output") or row.get("output") or row.get("proposal_output") or ""

                if not prompt and not instruction:
                    continue

                category = "Business"
                filename_lower = file_path.stem.lower()
                if "healthcare" in filename_lower or "medical" in filename_lower:
                    category = "Healthcare"
                elif "education" in filename_lower:
                    category = "Education"
                elif "construction" in filename_lower:
                    category = "Construction"
                elif "it" in filename_lower or "software" in filename_lower:
                    category = "Technical"
                elif "startup" in filename_lower or "pitch" in filename_lower:
                    category = "Business"
                elif "tender" in filename_lower:
                    category = "Business"

                title = prompt[:100] if prompt else instruction[:100]
                if len(title) > 100:
                    title = title[:97] + "..."
                if not title:
                    title = f"Template {idx + 1} from {file_path.stem}"

                description = instruction or prompt[:200] or "Proposal template from dataset"
                if len(description) > 500:
                    description = description[:500] + "..."

                final_prompt = instruction if instruction else prompt

                templates.append({
                    "title": title,
                    "category": category,
                    "description": description,
                    "prompt": final_prompt,
                    "content": output[:5000] if output else "",
                    "tags": [category.lower(), "dataset"],
                    "domain": category,
                    "tone": "Professional",
                    "complexity": "Medium",
                    "source_file": f"{file_path.name} (row {idx + 1})",
                    "metadata": json.dumps({
                        "has_output": bool(output),
                        "dataset_source": file_path.name
                    })
                })
    except Exception as e:
        print(f"  Error parsing CSV {file_path}: {e}")

    return templates

def insert_template(conn, template: Dict) -> bool:
    """Insert a template into the database."""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT template_id FROM proposal_templates
                WHERE title = %s AND source_file = %s
            """, (template["title"], template["source_file"]))

            if cur.fetchone():
                return False

            cur.execute("""
                INSERT INTO proposal_templates
                (title, category, description, prompt, content, tags, domain, tone, complexity, source_file, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                template["title"],
                template["category"],
                template["description"],
                template["prompt"],
                template["content"],
                template["tags"],
                template["domain"],
                template["tone"],
                template["complexity"],
                template["source_file"],
                template["metadata"]
            ))
            conn.commit()
            return True
    except Exception as e:
        print(f"  Error inserting template '{template['title']}': {e}")
        conn.rollback()
        return False

def main():
    """Main function."""
    print("\n" + "=" * 70)
    print("PROPOSAL TEMPLATES - COMPLETE SETUP AND IMPORT")
    print("=" * 70)
    print(f"\nMaterials directory: {MATERIALS_DIR}")
    print(f"Proposals directory: {PROPOSALS_DIR}")
    print(f"Datasets directory: {DATASETS_DIR}")
    sys.stdout.flush()

    # Step 1: Connect to database
    print_step(1, "Connecting to Database")
    conn = connect_db()
    if not conn:
        print("\n✗ Cannot proceed without database connection.")
        sys.exit(1)

    # Step 2: Create table
    print_step(2, "Creating proposal_templates Table")
    if not create_table(conn):
        print("\n✗ Failed to create table. Exiting.")
        conn.close()
        sys.exit(1)

    # Step 3: Import markdown files
    print_step(3, "Importing Markdown Templates")
    markdown_count = 0
    if os.path.exists(PROPOSALS_DIR):
        md_files = list(Path(PROPOSALS_DIR).glob("*.md"))
        print(f"Found {len(md_files)} markdown files")
        for md_file in md_files:
            print(f"  Processing: {md_file.name}")
            template = parse_markdown_proposal(md_file)
            if template:
                if insert_template(conn, template):
                    markdown_count += 1
                    print(f"    ✓ Imported: {template['title'][:60]}")
                else:
                    print(f"    ⚠ Skipped (duplicate)")
            sys.stdout.flush()
    else:
        print(f"  ✗ Directory not found: {PROPOSALS_DIR}")

    # Step 4: Import CSV files
    print_step(4, "Importing CSV Templates")
    csv_count = 0
    if os.path.exists(DATASETS_DIR):
        csv_files = list(Path(DATASETS_DIR).glob("*.csv"))
        print(f"Found {len(csv_files)} CSV files")
        for csv_file in csv_files:
            print(f"  Processing: {csv_file.name}")
            templates = parse_csv_dataset(csv_file)
            imported = 0
            for template in templates:
                if insert_template(conn, template):
                    csv_count += 1
                    imported += 1
            print(f"    ✓ Imported {imported} templates")
            sys.stdout.flush()
    else:
        print(f"  ✗ Directory not found: {DATASETS_DIR}")

    # Step 5: Final summary
    print_step(5, "Final Summary")
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM proposal_templates;")
        total = cur.fetchone()[0]
        print(f"✓ Total templates in database: {total}")
        print(f"✓ Markdown templates imported: {markdown_count}")
        print(f"✓ CSV templates imported: {csv_count}")

    conn.close()

    print("\n" + "=" * 70)
    print("✓ SETUP COMPLETE!")
    print("=" * 70)
    print("\nYou can now use the proposal generation feature in the frontend!")
    sys.stdout.flush()

if __name__ == "__main__":
    # Also write to a log file
    log_file = os.path.join(BASE_DIR, "import_log.txt")
    log_fp = open(log_file, 'w', encoding='utf-8')

    class Tee:
        def __init__(self, *files):
            self.files = files
        def write(self, obj):
            for f in self.files:
                f.write(obj)
                f.flush()
        def flush(self):
            for f in self.files:
                f.flush()

    # Tee output to both console and file
    sys.stdout = Tee(sys.stdout, log_fp)
    sys.stderr = Tee(sys.stderr, log_fp)

    try:
        print(f"Log file: {log_file}")
        print("Starting import process...\n")
        main()
        print(f"\n✓ Complete! Check {log_file} for full log.")
    except KeyboardInterrupt:
        print("\n\nScript interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        log_fp.close()
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__

