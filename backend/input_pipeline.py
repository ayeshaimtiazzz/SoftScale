import os
import re
import json
import psycopg2
from psycopg2 import sql
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import PyPDF2
from scipy.special import softmax
from dotenv import load_dotenv

from talent import (
    connect_db as talent_connect_db,  # Avoid conflict
    load_faiss_index,
    FAISS_PATHS,
    clean_text,
    shorten_text,
    infer_domain,
    fetch_target_embeddings,
    compute_similarity_faiss,
    compute_skill_similarity,
    normalize_domain,
    DOMAINS,
    KEYWORD_BOOST
)

def test_similarity(conn, source_table, target_table, source_index, target_index,
                    source_text_cols, target_text_cols, domain_col=None, filters=None, filter_keys=None, top_k=3, source_row=None):
    if source_row is None:
        print("we couldnt find you in our database :()")
    else:
        # If source_row is provided, assume it's a tuple and get columns
        with conn.cursor() as cur:
            cur.execute(sql.SQL("SELECT * FROM {} LIMIT 1").format(sql.Identifier(source_table)))
            source_cols = [d[0] for d in cur.description]
        # source_row is already provided

    if not source_row:
        print(f"No records in {source_table}")
        return

    source_text = " ".join([str(source_row[source_cols.index(c)]) for c in source_text_cols if c in source_cols])
    source_text = clean_text(source_text)
    source_domain = source_row[source_cols.index(domain_col)] if domain_col and domain_col in source_cols else None

    # Infer domain if missing
    if not source_domain or source_domain.strip() == "":
        inferred_domain = infer_domain(source_text)
        source_domain = inferred_domain
        print(f"[WARNING] Domain was missing— inferred as '{source_domain}' from text.")

    print(f"\n[QUERY] Query from [{source_table}] (domain={source_domain}):\n{shorten_text(source_text, 100)}\n")

    target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, domain_col, source_domain, filters, filter_keys)

    if not target_embedding_ids:
        print(f"[WARNING] Oops! No {target_table}s found for domain '{source_domain}'. Showing best matches from all domains.\n")
        target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, None, None, filters)

    D, I = compute_similarity_faiss(source_index, target_index, source_row[source_cols.index('embedding_vector_id')], target_embedding_ids, target_texts, top_k)
    skill_similarities = compute_skill_similarity(conn, source_table, target_table, source_row, source_cols, target_pks, top_k)

    WEIGHT_TEXT = 0.7
    WEIGHT_SKILL = 0.3
    final_scores = WEIGHT_TEXT * D + WEIGHT_SKILL * np.array(skill_similarities)[I]

    results = sorted(zip(final_scores, I), reverse=True)
    print("⚡ Top Matches (sorted by weighted score):")
    for rank, (score, idx) in enumerate(results):
        target_info = " | ".join(str(v) for v in target_texts[idx].values())
        print(f"{rank + 1}. {target_table} → {shorten_text(target_info, 150)}")
        print(f"   Text Sim: {D[I.tolist().index(idx)]:.3f} | Skill Sim: {skill_similarities[idx]:.3f} | Final Weighted: {score:.3f}\n")

# ========= Config =========
# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

# Default embeddings directory from env
DEFAULT_EMBEDDINGS_DIR = os.getenv("EMBEDDINGS_DIR")
FAISS_INDEX_PATH = "profile_index.faiss"
EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME")

# ======== Load model once ========
MODEL = SentenceTransformer(EMBED_MODEL_NAME)

# =========================
# Database Connection
# =========================
def connect_db():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )


# =========================
# Homepage functions
# =========================

def freelancer_homepage(user_id):
    conn = connect_db()
    while True:
        print(f"\nWelcome Freelancer (user_id={user_id})!")
        print("1. Talent Match")
        print("2. Logout")
        choice = input("Select an option: ").strip()

        if choice == "1":
            print("\n[INFO] Talent Match - Find Projects for You")

            # Fetch freelancer's profile
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM freelancer WHERE user_id = %s;", (user_id,))
                freelancer_row = cur.fetchone()
            if not freelancer_row:
                print("[ERROR] No profile found. Please complete your profile.")
                continue

            # Ask for filters
            apply_filters = input("Apply filters? (y/n): ").strip().lower()
            filters = {}
            filter_keys = []
            if apply_filters == "y":
                print("\nAvailable Filters:")
                print("- country: e.g., USA")
                print("- city: e.g., New York")
                print("- salary_min: e.g., 50")
                print("- salary_max: e.g., 200")
                print("- experience_level: e.g., Senior")
                print("- job_type: e.g., Freelance")
                print("- work_mode: e.g., Remote")
                print("Enter filters as key=value pairs, separated by commas (e.g., country=USA,salary_min=50). Leave blank to skip.")

                filter_input = input("Filters: ").strip()
                if filter_input:
                    for pair in filter_input.split(","):
                        if "=" in pair:
                            key, val = pair.split("=", 1)
                            key = key.strip()
                            val = val.strip()
                            if key in ["salary_min", "salary_max"]:
                                try:
                                    filters[key] = int(val)
                                except ValueError:
                                    print(f"[WARNING] Invalid number for {key}, skipping.")
                                    continue
                            else:
                                filters[key] = val
                            filter_keys.append(key)
                print(f"[OK] Filters applied: {filters}")

            # Load FAISS indexes
            try:
                freelancer_index = load_faiss_index(FAISS_PATHS["freelancer"])
                project_index = load_faiss_index(FAISS_PATHS["projects"])
            except Exception as e:
                print(f"[ERROR] Error loading FAISS indexes: {e}")
                continue

            # Run match: Freelancer profile to Projects
            talent_conn = talent_connect_db()
            try:
                test_similarity(
                    talent_conn, "freelancer", "projects", freelancer_index, project_index,
                    source_text_cols=["professional_summary", "resume_text", "domain"],
                    target_text_cols=["project_title", "project_description", "domain"],
                    domain_col="domain",
                    filters=filters,
                    filter_keys=filter_keys,
                    top_k=3,
                    source_row=freelancer_row  # Use user's profile
                )
            except Exception as e:
                print(f"[ERROR] Error during matching: {e}")
            finally:
                talent_conn.close()

        elif choice == "2":
            print("Logging out...\n")
            break
        else:
            print("[ERROR] Invalid option. Try again.")
    conn.close()



def job_seeker_homepage(user_id):
    conn = connect_db()
    while True:
        print(f"\nWelcome Job Seeker (user_id={user_id})!")
        print("1. Talent Match")
        print("2. Logout")
        choice = input("Select an option: ").strip()

        if choice == "1":
            print("\n[INFO] Talent Match - Find Jobs for You")

            # Fetch job seeker's profile
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM job_seeker WHERE user_id = %s;", (user_id,))
                jobseeker_row = cur.fetchone()
            if not jobseeker_row:
                print("[ERROR] No profile found. Please complete your profile.")
                continue

            # Ask for filters
            apply_filters = input("Apply filters? (y/n): ").strip().lower()
            filters = {}
            filter_keys = []
            if apply_filters == "y":
                print("\nAvailable Filters:")
                print("- country: e.g., USA")
                print("- city: e.g., New York")
                print("- salary_min: e.g., 50000")
                print("- salary_max: e.g., 100000")
                print("- experience_level: e.g., Senior")
                print("- job_type: e.g., Full-time")
                print("- work_mode: e.g., Remote")
                print("Enter filters as key=value pairs, separated by commas (e.g., country=USA,salary_min=50000). Leave blank to skip.")

                filter_input = input("Filters: ").strip()
                if filter_input:
                    for pair in filter_input.split(","):
                        if "=" in pair:
                            key, val = pair.split("=", 1)
                            key = key.strip()
                            val = val.strip()
                            if key in ["salary_min", "salary_max"]:
                                try:
                                    filters[key] = int(val)
                                except ValueError:
                                    print(f"[WARNING] Invalid number for {key}, skipping.")
                                    continue
                            else:
                                filters[key] = val
                            filter_keys.append(key)
                print(f"[OK] Filters applied: {filters}")

            # Load FAISS indexes
            try:
                jobseeker_index = load_faiss_index(FAISS_PATHS["job_seeker"])
                job_index = load_faiss_index(FAISS_PATHS["job"])
            except Exception as e:
                print(f"[ERROR] Error loading FAISS indexes: {e}")
                continue

            # Run match: Job Seeker profile to Jobs
            talent_conn = talent_connect_db()
            try:
                test_similarity(
                    talent_conn, "job_seeker", "job", jobseeker_index, job_index,
                    source_text_cols=["career_objective", "resume_text", "domain"],
                    target_text_cols=["job_title", "job_description", "preferred_domain"],
                    domain_col="preferred_domain",
                    filters=filters,
                    filter_keys=filter_keys,
                    top_k=3,
                    source_row=jobseeker_row  # Use user's profile
                )
            except Exception as e:
                print(f"[ERROR] Error during matching: {e}")
            finally:
                talent_conn.close()

        elif choice == "2":
            print("Logging out...\n")
            break
        else:
            print("[ERROR] Invalid option. Try again.")
    conn.close()



def company_homepage(user_id):
       print(f"\n🏢 Welcome Company Admin (user_id={user_id})!")

       while True:
           print("\nMenu Options:")
           print("1. Post Job")
           print("2. Post Project")
           print("3. Talent Match")
           print("4. Logout")
           choice = input("Select an option: ").strip()

           # =====================================================
           # OPTION 1 → POST JOB (unchanged)
           # =====================================================
           if choice == "1":
               print("\n💼 Post a Job")

               conn = connect_db()
               with conn.cursor() as cur:
                   cur.execute("SELECT company_id FROM company WHERE user_id = %s;", (user_id,))
                   company_id = cur.fetchone()[0]
               conn.close()

               job_data = {
                   "company_id": company_id,
                   "job_title": input("Job Title: ").strip(),
                   "job_description": input("Job Description: ").strip(),
                   "job_type": input("Job Type: ").strip(),
                   "required_experience": input("Required Experience: ").strip(),
                   "required_skills": input("Required Skills (comma-separated): ").strip(),
                   "work_mode": input("Work Mode: ").strip(),
                   "salary": input("Salary: ").strip(),
                   "preferred_domain": input("Preferred Domain: ").strip()
               }

               conn = connect_db()
               insert_dynamic(conn, "job", preset_values=job_data)
               with conn.cursor() as cur:
                   cur.execute(
                       "SELECT job_id FROM job WHERE company_id = %s ORDER BY created_at DESC LIMIT 1;",
                       (company_id,)
                   )
                   job_id = cur.fetchone()[0]
               conn.close()

               conn = connect_db()
               generate_and_store_embedding_from_profile(job_id, "job", conn)
               generate_and_store_skill_embedding(job_id, "job", conn)
               conn.close()
               print("[OK] Job posted successfully!\n")

           # =====================================================
           # OPTION 2 → POST PROJECT (unchanged)
           # =====================================================
           elif choice == "2":
               print("\n[INFO] Post a Project")

               conn = connect_db()
               with conn.cursor() as cur:
                   cur.execute("SELECT company_id FROM company WHERE user_id = %s;", (user_id,))
                   company_id = cur.fetchone()[0]
               conn.close()

               # Restrict allowed project types
               allowed_types = ["short-term", "long-term", "General"]
               project_type = input(f"Project Type ({'/'.join(allowed_types)}): ").strip()
               if project_type not in allowed_types:
                   print("[ERROR] Invalid project type. Please enter one of:", ", ".join(allowed_types))
                   continue

               project_data = {
                   "company_id": company_id,
                   "project_title": input("Project Title: ").strip(),
                   "project_description": input("Project Description: ").strip(),
                   "project_type": project_type,
                   "payment_type": input("Payment Type (fixed/hourly): ").strip(),
                   "work_mode": input("Work Mode (remote/hybrid/onsite): ").strip(),
                   "required_experience": input("Required Experience: ").strip(),
                   "required_skills": input("Required Skills (comma-separated): ").strip(),
                   "team_size": input("Team Size: ").strip(),
                   "duration": input("Duration: ").strip(),
                   "domain": input("Domain: ").strip()
               }

               conn = connect_db()
               insert_dynamic(conn, "projects", preset_values=project_data)
               with conn.cursor() as cur:
                   cur.execute(
                       "SELECT project_id FROM projects WHERE company_id = %s ORDER BY created_at DESC LIMIT 1;",
                       (company_id,)
                   )
                   project_id = cur.fetchone()[0]
               conn.close()

               conn = connect_db()
               generate_and_store_embedding_from_profile(project_id, "projects", conn)
               generate_and_store_skill_embedding(project_id, "projects", conn)
               conn.close()
               print("[OK] Project posted successfully!\n")

           # =====================================================
           # OPTION 3 → TALENT MATCH (UPDATED)
           # =====================================================
           elif choice == "3":
               print("\n[INFO] Talent Match")

               # Get company_id
               conn = connect_db()
               with conn.cursor() as cur:
                   cur.execute("SELECT company_id FROM company WHERE user_id = %s;", (user_id,))
                   company_id = cur.fetchone()[0]

               # Fetch all jobs and projects for the company
               conn = connect_db()
               with conn.cursor() as cur:
                    cur.execute("""
                        SELECT 'job' AS type, job_id AS id, job_title AS title, job_description AS description
                        FROM job WHERE company_id = %s
                        UNION ALL
                        SELECT 'project' AS type, project_id AS id, project_title AS title, project_description AS description
                        FROM projects WHERE company_id = %s
                        ORDER BY type, id;
                    """, (company_id, company_id))
                    posts = cur.fetchall()
               conn.close()

               if not posts:
                   print("[ERROR] No jobs or projects posted yet. Post some first!")
                   continue

               print("\nYour Posted Jobs/Projects:")
               for post in posts:
                   post_type, post_id, title, description = post
                   print(f"- {post_type.capitalize()} ID: {post_id} - Title: {title} - Description: {shorten_text(description, 100)}")

               # User selects ID
               selected_id = input("\nEnter the ID of the job/project to find matches for: ").strip()
               try:
                   selected_id = int(selected_id)
               except ValueError:
                   print("[ERROR] Invalid ID. Please enter a number.")
                   continue

               # Determine type and fetch row
               selected_type = None
               selected_row = None
               conn = connect_db()
               with conn.cursor() as cur:
                   # Check if it's a job
                   cur.execute("SELECT * FROM job WHERE job_id = %s AND company_id = %s;", (selected_id, company_id))
                   selected_row = cur.fetchone()
                   if selected_row:
                       selected_type = "job"
                       target_table = "job_seeker"
                       source_text_cols = ["job_title", "job_description", "preferred_domain"]
                       target_text_cols = ["career_objective", "resume_text", "domain"]
                       domain_col = "preferred_domain"
                   else:
                       # Check if it's a project
                       cur.execute("SELECT * FROM projects WHERE project_id = %s AND company_id = %s;", (selected_id, company_id))
                       selected_row = cur.fetchone()
                       if selected_row:
                           selected_type = "projects"
                           target_table = "freelancer"
                           source_text_cols = ["project_title", "project_description", "domain"]
                           target_text_cols = ["professional_summary", "resume_text", "domain"]
                           domain_col = "domain"
               conn.close()

               if not selected_row:
                   print("[ERROR] ID not found or not owned by you.")
                   continue

               print(f"\n[INFO] Finding matches for your {selected_type} (ID: {selected_id})...")

               # Ask for filters
               apply_filters = input("Apply filters? (y/n): ").strip().lower()
               filters = {}
               filter_keys = []
               if apply_filters == "y":
                   print("\nAvailable Filters:")
                   print("- country: e.g., USA")
                   print("- city: e.g., New York")
                   print("- salary_min: e.g., 50000 (for jobs) or 50 (for projects)")
                   print("- salary_max: e.g., 100000 (for jobs) or 200 (for projects)")
                   print("- experience_level: e.g., Senior")
                   print("- job_type: e.g., Full-time (for jobs) or Freelance (for projects)")
                   print("- work_mode: e.g., Remote")
                   print("Enter filters as key=value pairs, separated by commas (e.g., country=USA,salary_min=50000). Leave blank to skip.")

                   filter_input = input("Filters: ").strip()
                   if filter_input:
                       for pair in filter_input.split(","):
                           if "=" in pair:
                               key, val = pair.split("=", 1)
                               key = key.strip()
                               val = val.strip()
                               if key in ["salary_min", "salary_max"]:
                                   try:
                                       filters[key] = int(val)
                                   except ValueError:
                                       print(f"[WARNING] Invalid number for {key}, skipping.")
                                       continue
                               else:
                                   filters[key] = val
                               filter_keys.append(key)
                   print(f"[OK] Filters applied: {filters}")

               # Load FAISS indexes
               try:
                   source_index = load_faiss_index(FAISS_PATHS[selected_type])
                   target_index = load_faiss_index(FAISS_PATHS[target_table])
               except Exception as e:
                   print(f"[ERROR] Error loading FAISS indexes: {e}")
                   continue

               # Run match
               talent_conn = talent_connect_db()
               try:
                   test_similarity(
                       talent_conn, selected_type, target_table, source_index, target_index,
                       source_text_cols=source_text_cols,
                       target_text_cols=target_text_cols,
                       domain_col=domain_col,
                       filters=filters,
                       filter_keys=filter_keys,
                       top_k=3,
                       source_row=selected_row  # Use selected row
                   )
               except Exception as e:
                   print(f"[ERROR] Error during matching: {e}")
               finally:
                   talent_conn.close()

           # =====================================================
           # OPTION 4 → LOGOUT (unchanged)
           # =====================================================
           elif choice == "4":
               print("Logging out...\n")
               break

           else:
               print("[ERROR] Invalid option. Please try again.\n")

# =========================
# Helpers
# =========================

def generate_and_store_skill_embedding(record_id, table_name, conn=None):
    # map table to the correct skill column
    skill_column_map = {
        "freelancer": "skills",
        "job_seeker": "skills",
        "job": "required_skills",
        "projects": "required_skills"
    }

    if table_name not in skill_column_map:
        print(f"[WARNING] No skill column defined for table {table_name}")
        return

    skill_column = skill_column_map[table_name]
    pk_map = {
        "freelancer": "freelancer_id",
        "job_seeker": "candidate_id",
        "job": "job_id",
        "projects": "project_id"
    }

    pk_col = pk_map.get(table_name)
    if not pk_col:
        print(f"[WARNING] Primary key not defined for {table_name}")
        return

    # fetch skills text from table
    with conn.cursor() as cur:
        query = sql.SQL("SELECT {col} FROM {table} WHERE {pk} = %s").format(
            col=sql.Identifier(skill_column),
            table=sql.Identifier(table_name),
            pk=sql.Identifier(pk_col)
        )
        cur.execute(query, (record_id,))

        row = cur.fetchone()
        if not row or not row[0]:
            print(f"[WARNING] No skills found for {table_name} id={record_id}")
            return
        skills_text = row[0]

    cleaned_skills = clean_text(skills_text)
    if not cleaned_skills:
        print(f"[WARNING] Skills text empty after cleaning for {table_name} id={record_id}")
        return

    emb = get_weighted_embedding(cleaned_skills, MODEL, normalize=True)
    emb_list = emb.tolist()  # shape (dim,) -> list

    # Store embedding in JSON column
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET skill_embedding = %s WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (json.dumps(emb_list), record_id))
        conn.commit()

    print(f"[OK] Stored skill embedding for {table_name} id={record_id}")

def clean_text(text):
    if not text:
        return ""
    text = str(text)
    text = text.lower()
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'[^a-zA-Z0-9\s\.,\-]', ' ', text)  # keep some punctuation
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_text_from_pdf(file_path):
    text = ""
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"[WARNING] Error reading PDF: {e}")
    return text

def extract_text_from_txt(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"[WARNING] Error reading TXT: {e}")
        return ""


def save_faiss_index(index):
    faiss.write_index(index, FAISS_INDEX_PATH)

def get_primary_keys(conn, table_name):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid
            AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass
            AND i.indisprimary;
        """, (table_name,))
        return {row[0] for row in cur.fetchall()}

def get_table_columns(conn, table_name):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))
        return cur.fetchall()

# =========================
# Insert (dynamic) but skip PK and system cols
# =========================
def insert_dynamic(conn, table_name, preset_values=None):
    preset_values = preset_values or {}

    # Fetch table column names & types
    columns_info = get_table_columns(conn, table_name)
    primary_keys = get_primary_keys(conn, table_name)

    skip_cols = set(primary_keys) | {
        "embedding_vector_id", "resume_text", "created_at", "updated_at", "name", "email","company_id","skill_embedding"
    }

    data = {}
    print(f"\n--- {table_name.replace('_',' ').title()} Details ---")

    for col_name, col_type in columns_info:
        if col_name in preset_values or col_name in skip_cols:
            continue

        # 🧩 Handle JSONB columns interactively
        if col_type == "jsonb":
            print(f"\n--- Adding entries for {col_name.replace('_',' ').title()} ---")

            items = []
            while True:
                entry = {}
                # Define what kind of structure to collect based on column name
                if "project" in col_name:
                    entry["project_name"] = input("Project name: ").strip()
                    entry["description"] = input("Project description: ").strip()
                elif "job" in col_name:
                    entry["job_title"] = input("Job title: ").strip()
                    entry["description"] = input("Job description: ").strip()
                else:
                    # generic key-value pair if not recognized
                    key = input("Key: ").strip()
                    value = input("Value: ").strip()
                    entry[key] = value

                items.append(entry)
                more = input("Add another entry? (y/n): ").strip().lower()
                if more != "y":
                    break

            data[col_name] = json.dumps(items)
            print(f"[OK] Added {len(items)} entries for {col_name}.")

        else:
            # Normal input for non-JSON columns
            val = input(f"{col_name.replace('_', ' ').title()}: ").strip()
            data[col_name] = val if val else None

    final_data = {**data, **preset_values}
    col_names = list(final_data.keys())

    query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table_name),
        sql.SQL(", ").join(map(sql.Identifier, col_names)),
        sql.SQL(", ").join(sql.Placeholder() * len(col_names))
    )

    with conn.cursor() as cur:
        cur.execute(query, [final_data[c] for c in col_names])
        conn.commit()

    print(f"[OK] Inserted into {table_name}.")


def chunk_text(text, max_words=200):
    """Split long text into smaller chunks (for resumes or descriptions)"""
    words = text.split()
    return [' '.join(words[i:i + max_words]) for i in range(0, len(words), max_words)]

def get_weighted_embedding(text, model, normalize=True):
    """Generate embedding by chunking and applying weighted averaging"""
    chunks = chunk_text(text)
    if not chunks:
        return np.zeros(model.get_sentence_embedding_dimension(), dtype="float32")

    # Encode all chunks
    chunk_embeddings = model.encode(chunks, normalize_embeddings=normalize)
    chunk_embeddings = np.array(chunk_embeddings)

    # Weight: newer/more recent chunks slightly higher
    weights = np.linspace(0.8, 1.2, len(chunks))  # bias towards last chunks
    weights = softmax(weights)  # normalize weights
    weighted_avg = np.average(chunk_embeddings, axis=0, weights=weights)
    if normalize:
        weighted_avg = weighted_avg / np.linalg.norm(weighted_avg)
    return weighted_avg.astype("float32")

# =========================
# Update resume_text column after parsing
# =========================
def update_resume_text(conn, table_name, user_id, resume_text):
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET resume_text = %s WHERE user_id = %s").format(sql.Identifier(table_name)),
                    (resume_text, user_id))
        conn.commit()

import os
import faiss
import numpy as np
import json
from psycopg2 import sql

# -----------------------------
# FAISS helper functions
# -----------------------------
def get_faiss_index_path(entity, embeddings_dir=None):
    """Return the FAISS index file path for a given entity/table"""
    if embeddings_dir is None:
        embeddings_dir = DEFAULT_EMBEDDINGS_DIR
    os.makedirs(embeddings_dir, exist_ok=True)
    return os.path.join(embeddings_dir, f"{entity}_index.faiss")

def ensure_faiss_index(dim, entity, embeddings_dir=None):
    """Return a FAISS index (created or loaded) for a specific entity"""
    if embeddings_dir is None:
        embeddings_dir = DEFAULT_EMBEDDINGS_DIR
    path = get_faiss_index_path(entity, embeddings_dir)
    if os.path.exists(path):
        index = faiss.read_index(path)
        # Ensure index has correct dimension
        if index.d != dim:
            raise ValueError(f"Dimension mismatch for FAISS index {entity}: expected {dim}, got {index.d}")
        return index
    else:
        return faiss.IndexFlatIP(dim)  # or IndexFlatL2 depending on your setup

def save_faiss_index(index, entity, embeddings_dir=None):
    """Save a FAISS index to disk"""
    if embeddings_dir is None:
        embeddings_dir = DEFAULT_EMBEDDINGS_DIR
    path = get_faiss_index_path(entity, embeddings_dir)
    faiss.write_index(index, path)


# -----------------------------
# Store embedding in FAISS
# -----------------------------
def store_embedding_faiss(embedding, table_name, embeddings_dir=None):
    """
    Stores an embedding into the existing FAISS index in the embeddings folder.
    Returns the vector_id assigned to this embedding.
    """
    if embeddings_dir is None:
        embeddings_dir = DEFAULT_EMBEDDINGS_DIR
    embedding = np.array(embedding, dtype='float32').reshape(1, -1)
    dim = embedding.shape[1]

    index = ensure_faiss_index(dim, table_name, embeddings_dir)
    vector_id = int(index.ntotal)  # assign new id
    index.add(embedding)
    save_faiss_index(index, table_name, embeddings_dir)

    print(f"[OK] Stored embedding for table='{table_name}' → vector_id={vector_id}")
    return vector_id


# -----------------------------
# Build profile text and create embedding
# -----------------------------
def generate_and_store_embedding_from_profile(record_id, role, conn, embeddings_dir=None):
    """Fetch record, create embedding, store in FAISS, and update embedding_vector_id in DB"""
    if embeddings_dir is None:
        embeddings_dir = DEFAULT_EMBEDDINGS_DIR

    # table -> columns for embedding
    table_column_map = {
        "job_seeker": ["career_objective", "resume_text", "domain"],
        "freelancer": ["professional_summary", "resume_text", "domain"],
        "company": ["company_description"],
        "job": ["job_title", "job_description", "preferred_domain"],
        "projects": ["project_title", "project_description", "domain"]
    }

    if role not in table_column_map:
        print(f"[WARNING] Role/table '{role}' not supported for embedding.")
        return

    table_name = role

    # get primary key
    pk_cols = get_primary_keys(conn, table_name)
    if not pk_cols:
        print(f"[WARNING] Could not determine primary key for table '{table_name}'.")
        return
    pk_col = list(pk_cols)[0]

    # fetch row
    with conn.cursor() as cur:
        cur.execute(sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (record_id,))
        row = cur.fetchone()
        if not row:
            print(f"[WARNING] No record found in '{table_name}' where {pk_col}={record_id}")
            return
        col_names = [d[0] for d in cur.description]
        row_data = dict(zip(col_names, row))

    # build text
    text_parts = []
    for fld in table_column_map[table_name]:
        val = row_data.get(fld)
        if val is None:
            continue
        if isinstance(val, (list, dict)):
            text_parts.append(json.dumps(val, ensure_ascii=False))
        else:
            text_parts.append(str(val))
    for extra in ("degree", "experience_year"):
        if extra in row_data and row_data[extra]:
            text_parts.append(str(row_data[extra]))

    full_text = " ".join(text_parts).strip()
    if not full_text:
        print(f"[WARNING] No meaningful text found for embedding for {table_name} id={record_id}")
        return

    cleaned = clean_text(full_text)

    # generate embedding
    emb = get_weighted_embedding(cleaned, MODEL, normalize=True)
    if emb.ndim == 1:
        emb = np.expand_dims(emb, axis=0)

    # store embedding in FAISS
    vector_id = store_embedding_faiss(emb, table_name, embeddings_dir)

    # update embedding_vector_id in DB
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET embedding_vector_id = %s WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (vector_id, record_id))
        conn.commit()

    print(f"[OK] Updated DB: table='{table_name}', {pk_col}={record_id} → vector_id={vector_id}")


# =========================
# Main flow
# =========================

def main():
    print("[OK] Script started successfully")
    conn = connect_db()

    try:
        print("🧩 Add or Login User")
        name = input("Name: ").strip()
        email = input("Email: ").strip()
        password = input("Password: ").strip()
        role = input("Role (job_seeker/freelancer/company_admin): ").strip()

        # =========================
        # Step 1: Check if user already exists
        # =========================
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, role FROM users WHERE email = %s;", (email,))
            existing_user = cur.fetchone()

        if existing_user:
            user_id, existing_role = existing_user
            print(f"\n[OK] User already exists! Logging you in as {existing_role}...\n")

            # Redirect to homepage based on role
            if existing_role == "freelancer":
                freelancer_homepage(user_id)
            elif existing_role == "job_seeker":
                job_seeker_homepage(user_id)
            elif existing_role in ("company_admin", "company"):
                company_homepage(user_id)
            else:
                print("[WARNING] Unknown role. Please contact admin.")
            return  # Stop here (no re-insertion)

        # =========================
        # Step 2: New user creation
        # =========================
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (name, email, password, role)
                VALUES (%s, %s, %s, %s) RETURNING user_id;
            """, (name, email, password, role))
            user_id = cur.fetchone()[0]
            conn.commit()
            print(f"[OK] User created with ID: {user_id}")

        # =========================
        # Step 3: Role-specific logic
        # =========================
        if role in ("job_seeker", "freelancer"):
            insert_dynamic(conn, role, {"user_id": user_id})

            resume_path = input("📎 Resume file path (PDF or TXT) [leave blank to skip]: ").strip()
            if resume_path:
                if os.path.exists(resume_path):
                    if resume_path.lower().endswith(".pdf"):
                        resume_text = extract_text_from_pdf(resume_path)
                    else:
                        resume_text = extract_text_from_txt(resume_path)

                    if resume_text:
                        table_name = "job_seeker" if role == "job_seeker" else "freelancer"
                        update_resume_text(conn, table_name, user_id, resume_text)
                        print("[OK] Resume text saved to DB.")

                        generate_and_store_embedding_from_profile(user_id, role, conn)
                        generate_and_store_skill_embedding(user_id, role, conn)
                    else:
                        print("[WARNING] No text extracted from resume.")
                else:
                    print("[WARNING] Resume file not found at that path.")
            else:
                print("ℹ️ No resume uploaded. Generating embedding from other profile fields (if present).")
                generate_and_store_embedding_from_profile(user_id, role, conn)
                generate_and_store_skill_embedding(user_id, role, conn)

            # Redirect to homepage
            if role == "freelancer":
                freelancer_homepage(user_id)
            else:
                job_seeker_homepage(user_id)

        elif role == "company_admin":
            insert_dynamic(conn, "company", {"user_id": user_id})

            # Fetch the new company_id
            with conn.cursor() as cur:
                cur.execute("SELECT company_id FROM company WHERE user_id = %s;", (user_id,))
                company_id = cur.fetchone()[0]

            generate_and_store_embedding_from_profile(company_id, "company", conn)
            company_homepage(user_id)

        else:
            print("[WARNING] Invalid role entered.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
