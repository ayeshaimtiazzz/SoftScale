import os
import faiss
import psycopg2
import numpy as np
from psycopg2 import sql
import re
import json
from fuzzywuzzy import fuzz
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
load_dotenv()

# ======================
# CONFIG
# ======================
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

# Embeddings Directory Configuration
EMBEDDINGS_DIR_NAME =  "embeddings"
FAISS_DIR = os.path.join(BASE_DIR, EMBEDDINGS_DIR_NAME)
os.makedirs(FAISS_DIR, exist_ok=True)

FAISS_PATHS = {
    "freelancer": os.path.join(FAISS_DIR, "freelancer_index.faiss"),
    "job_seeker": os.path.join(FAISS_DIR, "job_seeker_index.faiss"),
    "job": os.path.join(FAISS_DIR, "job_index.faiss"),
    "projects": os.path.join(FAISS_DIR, "projects_index.faiss"),
}

# ---------------- DOMAINS ----------------
DOMAINS = [
    "Healthcare",
    "Information Technology",
    "Software",
    "SaaS",
    "Finance",
    "Education",
    "E-commerce",
    "Marketing",
    "Manufacturing",
    "Retail",
    "Hospitality",
    "Transportation",
    "Telecommunications",
    "Real Estate",
    "Energy",
    "Energy & Utilities",
    "Automotive",
    "Agriculture",
    "Pharmaceuticals",
    "Media",
    "Media & Entertainment",
    "Entertainment",
    "Government",
    "Non-profit",
    "Legal",
    "Other",
    "Research & Development",
    "Cloud Computing",
    "Software Development",
    "Data Science",
    "Automation",
    "Web Development",
    "Mobile Apps",
    "AI & ML",
    "AI",
    "Cybersecurity"
]

# ---------------- KEYWORD BOOST ----------------
KEYWORD_BOOST = {
    "software": ["Software", "SaaS", "Information Technology", "Software Development"],
    "development": ["Software", "SaaS", "Research & Development", "Information Technology", "Software Development", "Web Development"],
    "app": ["Software", "SaaS", "Mobile Apps"],
    "platform": ["Software", "SaaS"],
    "AI & ML": ["AI", "Artificial Intelligence", "Machine Learning"],
    "AI": ["AI", "Artificial Intelligence"],
    "artificial intelligence": ["AI"],
    "machine learning": ["AI", "Data Science"],
    "data": ["Data Science"],
    "automation": ["Automation"],
    "cloud": ["Cloud Computing"],
    "cybersecurity": ["Cybersecurity"],
    "security": ["Cybersecurity"],
    "web": ["Web Development"],
    "frontend": ["Web Development"],
    "backend": ["Web Development"],
    "mobile": ["Mobile Apps"],
    "ios": ["Mobile Apps"],
    "android": ["Mobile Apps"],
    "health": ["Healthcare"],
    "finance": ["Finance"],
    "education": ["Education"],
    "media": ["Media", "Media & Entertainment"],
    "entertainment": ["Media & Entertainment", "Entertainment"],
    "legal": ["Legal"],
    "energy": ["Energy", "Energy & Utilities"],
    "utilities": ["Energy & Utilities"],
    "research": ["Research & Development"],
    # Add more as needed
}

# ======================
# DB CONNECTION
# ======================
def connect_db():
    return psycopg2.connect(**DB_CONFIG)

# ======================
# FETCH RANDOM ROW
# ======================
def fetch_random_row(conn, table):
    with conn.cursor() as cur:
        cur.execute(sql.SQL("SELECT * FROM {} ORDER BY RANDOM() LIMIT 1;").format(sql.Identifier(table)))
        row = cur.fetchone()
        desc = [d[0] for d in cur.description]
        return row, desc

# ======================
# COMPUTE SKILL SIMILARITY
# ======================
def compute_skill_similarity(conn, source_table, target_table, source_row, source_cols, target_pks, top_k=3):
    # (Unchanged from your original code)
    pk_map = {
        "freelancer": "freelancer_id",
        "job_seeker": "candidate_id",
        "job": "job_id",
        "projects": "project_id"
    }

    pk_col = pk_map[target_table]

    if 'skill_embedding' in source_cols:
        source_skill_emb = source_row[source_cols.index('skill_embedding')]
    else:
        source_skill_emb = None
    if isinstance(source_skill_emb, str):
        try:
            source_skill_emb = json.loads(source_skill_emb)
        except:
            source_skill_emb = None

    if not source_skill_emb:
        return [0.0] * len(target_pks)

    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT skill_embedding FROM {} WHERE {} = ANY(%s)").format(
                sql.Identifier(target_table),
                sql.Identifier(pk_col)
            ),
            (target_pks,)
        )
        rows = cur.fetchall()

    skill_sims = []
    for row in rows:
        skill_emb = row[0]
        if not skill_emb:
            skill_sims.append(0.0)
            continue
        if isinstance(skill_emb, str):
            try:
                skill_emb = json.loads(skill_emb)
            except:
                skill_emb = None

        if skill_emb is None:
            skill_sims.append(0.0)
            continue

        v1, v2 = np.array(source_skill_emb), np.array(skill_emb)
        if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0:
            skill_sims.append(0.0)
        else:
            sim = float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
            skill_sims.append(sim)

    return skill_sims

# ======================
# LOAD FAISS INDEX
# ======================
def load_faiss_index(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"[ERROR] FAISS index not found: {path}")
    index = faiss.read_index(path)
    print(f"[OK] Loaded index from {path} (ntotal={index.ntotal})")
    return index

# ======================
# CLEAN & SHORTEN TEXT
# ======================
def clean_text(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()

def shorten_text(text, max_words=50):
    words = text.split()
    return " ".join(words[:max_words]) + ("..." if len(words) > max_words else "")

# ======================
# NORMALIZE DOMAIN
# ======================
def normalize_domain(domain):
    if not domain:
        return None
    domain = domain.lower().strip()
    domain = re.sub(r'[^a-z0-9\s&]', '', domain)
    domain = domain.replace('and', '&')
    domain = re.sub(r'\s+', ' ', domain)
    return domain.strip()

# ======================
# INFER DOMAIN (Added for on-the-fly inference)
# ======================
def infer_domain(text):
    """Infer domain from text using KEYWORD_BOOST scoring."""
    if not text:
        return "Other"

    text = clean_text(text)
    scores = {domain: 0 for domain in DOMAINS}

    for keyword, boosted_domains in KEYWORD_BOOST.items():
        if keyword in text:
            count = text.count(keyword)
            for domain in boosted_domains:
                if domain in scores:
                    scores[domain] += count

    if any(scores.values()):
        return max(scores, key=scores.get)
    return "Other"

def normalize_string(s):
    if not s:
        return None
    s = s.lower().strip()  # Lowercase and strip whitespace
    s = re.sub(r'[^a-z0-9\s]', '', s)  # Remove non-alphanumeric characters except spaces
    s = re.sub(r'\s+', ' ', s)  # Normalize multiple spaces to single
    return s.strip()  # Final strip


from fuzzywuzzy import fuzz  # Ensure this is imported at the top of your file

def fetch_target_embeddings(conn, target_table, target_text_cols, domain_col, source_domain, filters=None, filter_keys=None):
    cur = conn.cursor()
    if target_table == "job":
        pk_col = "job_id"
    elif target_table == "projects":
        pk_col = "project_id"
    elif target_table == "job_seeker":
        pk_col = "candidate_id"
    elif target_table == "freelancer":
        pk_col = "freelancer_id"
    else:
        raise ValueError(f"Unknown table: {target_table}")

    # Build base query: SELECT * to include ALL columns (for filtering access)
    query_parts = [
        sql.SQL("SELECT * FROM {}").format(sql.Identifier(target_table))
    ]
    params = []

    # Add domain filter if source_domain provided and domain_col exists
    if source_domain and domain_col:
        # Compute candidate domains for flexible matching
        candidate_domains = set()
        norm_source = normalize_domain(source_domain)
        candidate_domains.add(norm_source)
        source_lower = source_domain.lower()
        for keyword, boosted_domains in KEYWORD_BOOST.items():
            if keyword in source_lower:
                for d in boosted_domains:
                    candidate_domains.add(normalize_domain(d))
        # Also add reverse: if source is in boosted, add the keyword's domains
        for keyword, boosted_domains in KEYWORD_BOOST.items():
            if norm_source in [normalize_domain(d) for d in boosted_domains]:
                candidate_domains.add(normalize_domain(keyword))
                for d in boosted_domains:
                    candidate_domains.add(normalize_domain(d))

        # Update the WHERE clause to use IN for candidate domains
        query_parts.append(
            sql.SQL("WHERE (") + sql.Identifier(domain_col) + sql.SQL(" IS NULL OR LOWER(") + sql.Identifier(domain_col) + sql.SQL(") IN %s)")
        )
        params.append(tuple(candidate_domains))

    # Execute query for domain-matched rows
    full_query = sql.SQL(" ").join(query_parts)
    cur.execute(full_query, params)
    rows = cur.fetchall()
    column_names = [desc[0] for desc in cur.description]  # Get all column names dynamically

    # If no rows after domain, fallback to all rows without domain
    if not rows and source_domain and domain_col:
        fallback_query_parts = [
            sql.SQL("SELECT * FROM {}").format(sql.Identifier(target_table))
        ]
        full_fallback_query = sql.SQL(" ").join(fallback_query_parts)
        cur.execute(full_fallback_query)
        rows = cur.fetchall()
        column_names = [desc[0] for desc in cur.description]  # Update column names for fallback
        print(f"[INFO] Domain-matched rows for '{source_domain}': {len(rows)}")

    # Apply additional filters in Python (post-fetch) with debugging and iterative removal
    if filters and rows:
        filter_keys = list(filters.keys())  # List of filter keys to apply (e.g., ['country', 'city'])
        applied_filters = []  # Track applied filters for backtracking
        filtered_rows = rows[:]  # Start with all rows

        # Apply filters one by one with debugging
        for filter_key in filter_keys:
            temp_filtered = []
            for row in filtered_rows:
                row_dict = dict(zip(column_names, row))  # Build dict with ALL columns

                include_row = True
                # Use fuzzy matching for string filters (80% threshold), exact for numeric
                if filter_key == 'country' and filters.get('country'):
                    row_val = normalize_string(row_dict.get('country'))
                    filter_val = normalize_string(filters['country'])
                    if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                        include_row = False
                elif filter_key == 'city' and filters.get('city'):
                    row_val = normalize_string(row_dict.get('city'))
                    filter_val = normalize_string(filters['city'])
                    if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                        include_row = False
                elif filter_key == 'salary_range' and filters.get('salary_range'):
                    # Assuming salary_range is a string like "500 - 1000", parse and check
                    # Adjust based on your data; this is a placeholder for range checking
                    salary = row_dict.get('salary')  # Or 'hourly_rate', etc.
                    if salary is not None:
                        try:
                            min_sal, max_sal = map(int, filters['salary_range'].split(' - '))
                            if not (min_sal <= salary <= max_sal):
                                include_row = False
                        except ValueError:
                            pass  # Skip if parsing fails
                elif filter_key == 'experience_level' and filters.get('experience_level'):
                    row_val = normalize_string(row_dict.get('experience_level') or row_dict.get('required_experience'))
                    filter_val = normalize_string(filters['experience_level'])
                    if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                        include_row = False
                elif filter_key == 'type' and filters.get('type'):
                    row_val = normalize_string(row_dict.get('job_type') or row_dict.get('project_type'))
                    filter_val = normalize_string(filters['type'])
                    if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                        include_row = False
                elif filter_key == 'work_mode' and filters.get('work_mode'):
                    row_val = normalize_string(row_dict.get('work_mode'))
                    filter_val = normalize_string(filters['work_mode'])
                    if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                        include_row = False

                if include_row:
                    temp_filtered.append(row)

            applied_filters.append(filter_key)
            filtered_rows = temp_filtered
            print(f"[INFO] After applying filter '{filter_key}': {len(filtered_rows)} rows left.")

        # If no rows after all filters, backtrack by removing filters one by one
        while len(filtered_rows) == 0 and applied_filters:
            removed_filter = applied_filters.pop()
            print(f"[WARNING] No rows after all filters. Removing filter '{removed_filter}' and reapplying remaining.")
            # Reapply from scratch with remaining filters
            filtered_rows = rows[:]
            for filter_key in applied_filters:
                temp_filtered = []
                for row in filtered_rows:
                    row_dict = dict(zip(column_names, row))

                    include_row = True
                    # Repeat the same if-elif logic as above for each filter_key
                    if filter_key == 'country' and filters.get('country'):
                        row_val = normalize_string(row_dict.get('country'))
                        filter_val = normalize_string(filters['country'])
                        if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                            include_row = False
                    elif filter_key == 'city' and filters.get('city'):
                        row_val = normalize_string(row_dict.get('city'))
                        filter_val = normalize_string(filters['city'])
                        if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                            include_row = False
                    elif filter_key == 'salary_range' and filters.get('salary_range'):
                        salary = row_dict.get('salary')
                        if salary is not None:
                            try:
                                min_sal, max_sal = map(int, filters['salary_range'].split(' - '))
                                if not (min_sal <= salary <= max_sal):
                                    include_row = False
                            except ValueError:
                                pass
                    elif filter_key == 'experience_level' and filters.get('experience_level'):
                        row_val = normalize_string(row_dict.get('experience_level') or row_dict.get('required_experience'))
                        filter_val = normalize_string(filters['experience_level'])
                        if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                            include_row = False
                    elif filter_key == 'type' and filters.get('type'):
                        row_val = normalize_string(row_dict.get('job_type') or row_dict.get('project_type'))
                        filter_val = normalize_string(filters['type'])
                        if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                            include_row = False
                    elif filter_key == 'work_mode' and filters.get('work_mode'):
                        row_val = normalize_string(row_dict.get('work_mode'))
                        filter_val = normalize_string(filters['work_mode'])
                        if row_val and filter_val and fuzz.ratio(row_val, filter_val) < 80:
                            include_row = False

                    if include_row:
                        temp_filtered.append(row)
                filtered_rows = temp_filtered
                print(f"[INFO] After reapplying filter '{filter_key}': {len(filtered_rows)} rows left.")

        # If still 0, use all rows (no filters)
        if len(filtered_rows) == 0:
            print("[WARNING] No rows even after removing all filters. Using all fetched rows.")
            filtered_rows = rows

        rows = filtered_rows
        print(f"[OK] Final rows after filters: {len(rows)} (showing up to {min(3, len(rows))} for similarity).")

    # Extract final lists
    target_pks = [r[column_names.index(pk_col)] for r in rows]  # Use column index for pk
    target_embedding_ids = [r[column_names.index('embedding_vector_id')] for r in rows]
    target_texts = [dict(zip(column_names, r)) for r in rows]  # Full dict for each row

    return target_pks, target_embedding_ids, target_texts

# ======================
# SIMILARITY USING PRECOMPUTED EMBEDDINGS
# ======================
def compute_similarity_faiss(source_index, target_index, source_embedding_id, target_embedding_ids, target_texts, top_k=3):

    source_vec = np.zeros((1, source_index.d), dtype='float32')
    source_index.reconstruct(int(source_embedding_id), source_vec[0])

    target_vecs = np.zeros((len(target_embedding_ids), target_index.d), dtype='float32')
    for i, eid in enumerate(target_embedding_ids):
        target_index.reconstruct(int(eid), target_vecs[i])

    faiss.normalize_L2(source_vec)
    faiss.normalize_L2(target_vecs)

    search_index = faiss.IndexFlatIP(target_index.d)
    search_index.add(target_vecs)
    D, I = search_index.search(source_vec, top_k)

    return D[0], I[0]

# ======================
# TEST SIMILARITY
# ======================
def test_similarity(conn, source_table, target_table, source_index, target_index,
                    source_text_cols, target_text_cols, domain_col=None, filters=None, filter_keys=None, top_k=3):
    source_row, source_cols = fetch_random_row(conn, source_table)
    if not source_row:
        print(f"No records in {source_table}")
        return

    source_text = " ".join([str(source_row[source_cols.index(c)]) for c in source_text_cols if c in source_cols])
    source_text = clean_text(source_text)
    source_domain = source_row[source_cols.index(domain_col)] if domain_col and domain_col in source_cols else None

    # NEW: Infer domain if missing
    if not source_domain or source_domain.strip() == "":
        inferred_domain = infer_domain(source_text)
        source_domain = inferred_domain
        print(f"[WARNING] Domain was missing— inferred as '{source_domain}' from text.")

    print(f"\n[QUERY] Query from [{source_table}] (domain={source_domain}):\n{shorten_text(source_text, 100)}\n")

    target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, domain_col, source_domain, filters, filter_keys)  # Pass filter_keys


    if not target_embedding_ids:
        print(f"[WARNING] Oops! No {target_table}s found for domain '{source_domain}'. Showing best matches from all domains.\n")
        target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, None, None,filters)
        if not target_embedding_ids:
            print(f"[WARNING] No {target_table}s found even after fallback. Skipping similarity computation.\n")
            return
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

# ======================
# MAIN FUNCTION
# ======================
def automatic_talent_match():


    conn = connect_db()
    try:
        freelancer_index = load_faiss_index(FAISS_PATHS["freelancer"])
        jobseeker_index = load_faiss_index(FAISS_PATHS["job_seeker"])
        project_index = load_faiss_index(FAISS_PATHS["projects"])
        job_index = load_faiss_index(FAISS_PATHS["job"])
        example_filters = {
           'country': 'USA',  # Example: filter by country
           'city': 'New York',  # Example: filter by city
           'salary_min': 50000,  # Example: min salary/rate
           'salary_max': 150000,  # Example: max salary/rate
           'experience_level': 'Senior',  # Example: experience level
           'type': 'Full-time',  # Example: job/project type
           'workmode': 'Remote'  # Example: work mode
        }
        example_filter_keys = ['country', 'city']
        # Existing: Job Seeker to Job
        test_similarity(conn, "job_seeker", "job", jobseeker_index, job_index,
                       source_text_cols=["career_objective", "resume_text", "domain"],
                       target_text_cols=["job_title", "job_description", "preferred_domain"],
                       domain_col="preferred_domain",
                       filters=example_filters,
                       filter_keys=example_filter_keys,
                       top_k=3)

        # Existing: Freelancer to Projects
        test_similarity(conn, "freelancer", "projects", freelancer_index, project_index,
                       source_text_cols=["professional_summary", "resume_text", "domain"],
                       target_text_cols=["project_title", "project_description", "domain"],
                       domain_col="domain",
                       filters=example_filters,  # Added filters
                       filter_keys=example_filter_keys,
                       top_k=3)

        # NEW: Job to Job Seeker
        test_similarity(conn, "job", "job_seeker", job_index, jobseeker_index,
                       source_text_cols=["job_title", "job_description", "preferred_domain"],
                       target_text_cols=["career_objective", "resume_text", "domain"],
                       domain_col="domain",
                       filters=example_filters,
                       filter_keys=example_filter_keys,
                       top_k=3)

        # NEW: Projects to Freelancer
        test_similarity(conn, "projects", "freelancer", project_index, freelancer_index,
                       source_text_cols=["project_title", "project_description", "domain"],
                       target_text_cols=["professional_summary", "resume_text", "domain"],
                       domain_col="domain",
                       filters=example_filters,  # Added filters
                       top_k=3)

    finally:
        conn.close()
        print("\n[OK] Matching complete. Connection closed.")

# ======================
# ENTRY POINT
# ======================
if __name__ == "__main__":
    automatic_talent_match()
