"""
Script to import proposal templates from materials folder into database.
Parses markdown files and CSV datasets to create proposal templates.
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

# Add parent directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
sys.path.insert(0, BASE_DIR)

# Load environment variables
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

# Database configuration
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

# Paths
MATERIALS_DIR = os.path.join(BASE_DIR, "materials")
PROPOSALS_DIR = os.path.join(MATERIALS_DIR, "proposals")
DATASETS_DIR = os.path.join(MATERIALS_DIR, "proposal generator datasets-20251207T102310Z-3-001", "proposal generator datasets")


def connect_db():
    """Create database connection."""
    return psycopg2.connect(**DB_CONFIG)


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


def remove_emojis(text: str) -> str:
    """Remove emojis from text."""
    # Comprehensive emoji pattern
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"  # enclosed characters
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U00002600-\U000026FF"  # miscellaneous symbols
        "\U00002700-\U000027BF"  # dingbats
        "\u200D"  # zero-width joiner
        "\uFE0F"  # variation selector
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text).strip()


def extract_markdown_sections(content: str) -> Dict:
    """Extract sections from markdown proposal."""
    sections = {}

    # Remove emojis from content for parsing
    clean_content = remove_emojis(content)

    # Extract title (remove emojis)
    title_match = re.search(r"^#\s+(.+)$", clean_content, re.MULTILINE)
    if title_match:
        sections["title"] = remove_emojis(title_match.group(1)).strip()

    # Extract problem statement (with or without emoji)
    problem_match = re.search(r"###?\s*(?:💥\s*)?Problem\s*\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if problem_match:
        sections["problem"] = remove_emojis(problem_match.group(1)).strip()

    # Extract hypothesis (with or without emoji)
    hypothesis_match = re.search(r"###?\s*(?:👨‍🔬\s*)?Hypothesis\s*\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if hypothesis_match:
        sections["hypothesis"] = remove_emojis(hypothesis_match.group(1)).strip()

    # Extract implementation (with or without emoji)
    impl_match = re.search(r"##?\s*(?:💻\s*)?Implementation\s*[^\n]*\n(.*?)(?=\n##|\Z)", content, re.DOTALL | re.IGNORECASE)
    if impl_match:
        sections["implementation"] = remove_emojis(impl_match.group(1)).strip()

    # Extract description
    desc_match = re.search(r"#\s*Project\s*Description\s*\n(.*?)(?=\n#|\Z)", clean_content, re.DOTALL | re.IGNORECASE)
    if desc_match:
        sections["description"] = remove_emojis(desc_match.group(1)).strip()

    # Extract tags from metadata table
    tags_match = re.search(r"Tags\s*\|\s*(.+?)(?:\n|$)", content, re.IGNORECASE)
    if tags_match:
        tags_str = tags_match.group(1).strip()
        sections["tags"] = [remove_emojis(tag).strip() for tag in tags_str.split(",") if tag.strip()]

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

        # Create prompt from problem and description (already cleaned of emojis)
        problem = sections.get("problem", "")
        description = sections.get("description", "")
        hypothesis = sections.get("hypothesis", "")

        # Ensure no emojis remain
        problem = remove_emojis(problem)
        description = remove_emojis(description)
        hypothesis = remove_emojis(hypothesis)
        title = remove_emojis(title)

        prompt_parts = []
        if problem:
            prompt_parts.append(f"Problem: {problem}")
        if description:
            prompt_parts.append(f"Description: {description}")
        if hypothesis:
            prompt_parts.append(f"Hypothesis: {hypothesis}")

        prompt = "\n".join(prompt_parts) if prompt_parts else f"Generate a proposal for: {title}"

        # Create description (ensure clean)
        description_text = description or problem or f"Proposal template for {title}"
        description_text = remove_emojis(description_text)
        if len(description_text) > 500:
            description_text = description_text[:500] + "..."

        # Extract tags
        tags = sections.get("tags", [])
        if not tags:
            # Extract tags from filename or content
            filename_tags = [tag for tag in file_path.stem.split("-") if len(tag) > 3]
            tags = filename_tags[:5]  # Limit to 5 tags

        return {
            "title": title,
            "category": category,
            "description": description_text,
            "prompt": prompt,
            "content": content[:5000],  # Limit content size
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
        print(f"Error parsing {file_path}: {e}")
        return None


def parse_csv_dataset(file_path: Path) -> List[Dict]:
    """Parse CSV dataset file and extract template data."""
    templates = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            # Try to detect delimiter
            sample = f.read(1024)
            f.seek(0)
            delimiter = "," if "," in sample else "\t"

            reader = csv.DictReader(f, delimiter=delimiter)

            for idx, row in enumerate(reader):
                # Handle different CSV formats
                instruction = row.get("Instruction") or row.get("instruction") or ""
                prompt = row.get("Prompt") or row.get("prompt") or row.get("user_input") or ""
                output = row.get("Output") or row.get("output") or row.get("proposal_output") or ""

                if not prompt and not instruction:
                    continue

                # Determine category from filename
                category = "Business"  # Default
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

                # Create title
                title = prompt[:100] if prompt else instruction[:100]
                if len(title) > 100:
                    title = title[:97] + "..."
                if not title:
                    title = f"Template {idx + 1} from {file_path.stem}"

                # Create description
                description = instruction or prompt[:200] or "Proposal template from dataset"
                if len(description) > 500:
                    description = description[:500] + "..."

                # Use instruction as prompt if available, otherwise use prompt field
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
        print(f"Error parsing CSV {file_path}: {e}")

    return templates


def insert_template(conn, template: Dict) -> bool:
    """Insert a template into the database."""
    try:
        with conn.cursor() as cur:
            # Check if template already exists (by title and source_file)
            cur.execute("""
                SELECT template_id FROM proposal_templates
                WHERE title = %s AND source_file = %s
            """, (template["title"], template["source_file"]))

            if cur.fetchone():
                print(f"  Template '{template['title']}' already exists, skipping...")
                return False

            # Insert new template
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
    """Main function to import all templates."""
    print("Starting proposal template import...")
    print(f"Materials directory: {MATERIALS_DIR}")
    print(f"Proposals directory: {PROPOSALS_DIR}")
    print(f"Datasets directory: {DATASETS_DIR}")
    print(f"DB Config: host={DB_CONFIG.get('host')}, dbname={DB_CONFIG.get('dbname')}, user={DB_CONFIG.get('user')}")

    # Connect to database
    try:
        conn = connect_db()
        print("✓ Connected to database")

        # Verify table exists first
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'proposal_templates'
                );
            """)
            table_exists = cur.fetchone()[0]
            if not table_exists:
                print("✗ ERROR: proposal_templates table does not exist!")
                print("Please run the migration first:")
                print("  docker-compose exec postgres psql -U postgres -d talent_match_db -f /tmp/migration.sql")
                print("Or run: python backend/scripts/run_migration_and_import.py")
                conn.close()
                return
            else:
                print("✓ proposal_templates table exists")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        import traceback
        traceback.print_exc()
        return

    # Process markdown files
    print("\n--- Processing Markdown Files ---")
    markdown_count = 0
    if os.path.exists(PROPOSALS_DIR):
        for md_file in Path(PROPOSALS_DIR).glob("*.md"):
            print(f"Processing: {md_file.name}")
            template = parse_markdown_proposal(md_file)
            if template:
                if insert_template(conn, template):
                    markdown_count += 1
                    print(f"  ✓ Imported: {template['title']}")
    else:
        print(f"  ✗ Proposals directory not found: {PROPOSALS_DIR}")

    # Process CSV files
    print("\n--- Processing CSV Dataset Files ---")
    csv_count = 0
    if os.path.exists(DATASETS_DIR):
        for csv_file in Path(DATASETS_DIR).glob("*.csv"):
            print(f"Processing: {csv_file.name}")
            templates = parse_csv_dataset(csv_file)
            for template in templates:
                if insert_template(conn, template):
                    csv_count += 1
            print(f"  ✓ Imported {len(templates)} templates from {csv_file.name}")
    else:
        print(f"  ✗ Datasets directory not found: {DATASETS_DIR}")

    # Summary
    print("\n--- Import Summary ---")
    print(f"Markdown templates imported: {markdown_count}")
    print(f"CSV templates imported: {csv_count}")
    print(f"Total templates imported: {markdown_count + csv_count}")

    # Get total count from database
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM proposal_templates")
        total = cur.fetchone()[0]
        print(f"Total templates in database: {total}")

    conn.close()
    print("\n✓ Import completed!")


if __name__ == "__main__":
    main()
