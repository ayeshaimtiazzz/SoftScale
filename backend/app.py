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
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import UploadFile, File  
import io
from fastapi import UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from talent import (
    load_faiss_index, FAISS_PATHS, clean_text, infer_domain,
    fetch_target_embeddings, compute_skill_similarity,
    normalize_domain, DOMAINS, KEYWORD_BOOST
)
from typing import Optional

# Load environment variables from .env file
# Try to load from project root first, then backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)  # Go up one level to project root
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))  # Try project root first
load_dotenv()  # Fallback to backend/.env if it exists

# Embedding Model Configuration
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
MODEL = SentenceTransformer(EMBED_MODEL_NAME)

# Embeddings Directory Configuration
EMBEDDINGS_DIR_NAME = "embeddings"
EMBEDDINGS_DIR = os.path.join(BASE_DIR, EMBEDDINGS_DIR_NAME)
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES"))

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS")
# Parse comma-separated origins or use "*" for all
if CORS_ORIGINS == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer()

# Database Connection
def connect_db():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

def get_db():
    return connect_db()


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

def insert_dynamic(conn, table_name, preset_values=None):
    preset_values = preset_values or {}
    columns_info = get_table_columns(conn, table_name)
    primary_keys = get_primary_keys(conn, table_name)
    skip_cols = set(primary_keys) | {
        "embedding_vector_id", "resume_text", "created_at", "updated_at", "name", "email", "company_id", "skill_embedding"
    }
    data = {}
    for col_name, col_type in columns_info:
        if col_name in preset_values or col_name in skip_cols:
            continue
        if col_type == "jsonb":
            data[col_name] = json.dumps([])  # Default to empty array
        else:
            data[col_name] = preset_values.get(col_name, None)
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

def chunk_text(text, max_words=200):
    words = text.split()
    return [' '.join(words[i:i + max_words]) for i in range(0, len(words), max_words)]

def get_weighted_embedding(text, model, normalize=True):
    chunks = chunk_text(text)
    if not chunks:
        return np.zeros(model.get_sentence_embedding_dimension(), dtype="float32")
    chunk_embeddings = model.encode(chunks, normalize_embeddings=normalize)
    chunk_embeddings = np.array(chunk_embeddings)
    weights = np.linspace(0.8, 1.2, len(chunks))
    weights = softmax(weights)
    weighted_avg = np.average(chunk_embeddings, axis=0, weights=weights)
    if normalize:
        weighted_avg = weighted_avg / np.linalg.norm(weighted_avg)
    return weighted_avg.astype("float32")



def get_faiss_index_path(entity, embeddings_dir=EMBEDDINGS_DIR):
    os.makedirs(embeddings_dir, exist_ok=True)
    return os.path.join(embeddings_dir, f"{entity}_index.faiss")

def ensure_faiss_index(dim, entity, embeddings_dir=EMBEDDINGS_DIR):
    path = get_faiss_index_path(entity, embeddings_dir)
    if os.path.exists(path):
        index = faiss.read_index(path)
        if index.d != dim:
            raise ValueError(f"Dimension mismatch for FAISS index {entity}: expected {dim}, got {index.d}")
        return index
    else:
        return faiss.IndexFlatIP(dim)

def save_faiss_index(index, entity, embeddings_dir=EMBEDDINGS_DIR):
    path = get_faiss_index_path(entity, embeddings_dir)
    faiss.write_index(index, path)

def store_embedding_faiss(embedding, table_name, embeddings_dir=EMBEDDINGS_DIR):
    embedding = np.array(embedding, dtype='float32').reshape(1, -1)
    dim = embedding.shape[1]
    index = ensure_faiss_index(dim, table_name, embeddings_dir)
    vector_id = int(index.ntotal)
    index.add(embedding)
    save_faiss_index(index, table_name, embeddings_dir)
    return vector_id

def generate_and_store_embedding_from_profile(record_id, role, conn, embeddings_dir=EMBEDDINGS_DIR):
    table_column_map = {
        "job_seeker": ["career_objective", "resume_text", "domain"],
        "freelancer": ["professional_summary", "resume_text", "domain"],
        "company": ["company_description"],
        "job": ["job_title", "job_description", "preferred_domain"],
        "projects": ["project_title", "project_description", "domain"]
    }
    if role not in table_column_map:
        return
    table_name = role
    pk_cols = get_primary_keys(conn, table_name)
    if not pk_cols:
        return
    pk_col = list(pk_cols)[0]
    with conn.cursor() as cur:
        cur.execute(sql.SQL("SELECT * FROM {} WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (record_id,))
        row = cur.fetchone()
        if not row:
            return
        col_names = [d[0] for d in cur.description]
        row_data = dict(zip(col_names, row))
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
        return
    cleaned = clean_text(full_text)
    emb = get_weighted_embedding(cleaned, MODEL, normalize=True)
    if emb.ndim == 1:
        emb = np.expand_dims(emb, axis=0)
    vector_id = store_embedding_faiss(emb, table_name, embeddings_dir)
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET embedding_vector_id = %s WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (vector_id, record_id))
        conn.commit()

def generate_and_store_skill_embedding(record_id, table_name, conn):
    skill_column_map = {
        "freelancer": "skills",
        "job_seeker": "skills",
        "job": "required_skills",
        "projects": "required_skills"
    }
    if table_name not in skill_column_map:
        return
    skill_column = skill_column_map[table_name]
    pk_col = list(get_primary_keys(conn, table_name))[0]
    with conn.cursor() as cur:
        query = sql.SQL("SELECT {col} FROM {table} WHERE {pk} = %s").format(
            col=sql.Identifier(skill_column),
            table=sql.Identifier(table_name),
            pk=sql.Identifier(pk_col)
        )
        cur.execute(query, (record_id,))
        row = cur.fetchone()
        if not row or not row[0]:
            return
        skills_text = row[0]
    cleaned_skills = clean_text(skills_text)
    if not cleaned_skills:
        return
    emb = get_weighted_embedding(cleaned_skills, MODEL, normalize=True)
    emb_list = emb.tolist()
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET skill_embedding = %s WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (json.dumps(emb_list), record_id))
        conn.commit()

# JWT Helpers
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")



@app.get("/")
def read_root():
    return {"message": "Backend is running! Use /docs for API docs."}
from fastapi import Body

class SetRoleRequest(BaseModel):
    user_id: int
    role: str  # "job_seeker", "freelancer", "company_admin"

class UserSignup(BaseModel):
    name: str
    email: str
    password: str
class UserLogin(BaseModel):
    email: str
    password: str

class CompanyProfile(BaseModel):
    user_id: int
    company_name: str
    company_description: str
    country: str = None
    city: str = None
    company_size: str = None
    domain: str

@app.get("/get-user-details")
def get_user_details(user_id: int = Depends(verify_token)):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, name, email FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            return {"user_id": row[0], "name": row[1], "email": row[2]}
    finally:
        conn.close()

@app.post("/set-role")
def set_role(data: SetRoleRequest):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # 1️⃣ Update role in users table
            cur.execute("UPDATE users SET role = %s WHERE user_id = %s RETURNING user_id;", 
                        (data.role, data.user_id))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            conn.commit()

        # 2️⃣ Role-specific table insertion
        conn2 = get_db()
        try:
            if data.role == "job_seeker":
                pass
            elif data.role == "freelancer":
                pass
            elif data.role == "company_admin":
                pass

            conn2.commit()
        finally:
            conn2.close()

        return {"message": f"Role '{data.role}' assigned successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# Signup Endpoint (CORRECTED: No role handling, clean structure)
@app.post("/signup")
def signup(user: UserSignup):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # 1️⃣ Check if user already exists
            cur.execute("SELECT user_id FROM users WHERE email = %s;", (user.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="User already exists")

            # 2️⃣ Hash password
            hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # 3️⃣ Insert user WITHOUT role (3 placeholders, 3 values)
            cur.execute("""
                INSERT INTO users (name, email, password,role)
                VALUES (%s, %s, %s,%s)
                RETURNING user_id;
            """, (user.name, user.email, hashed_password,'pending'))
            user_id = cur.fetchone()[0]
            conn.commit()

        # No role-specific setup here - it's handled in /set-role after role selection
        return {"message": "User created successfully", "user_id": user_id}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()



# Login Endpoint with Custom Errors
@app.post("/login")
def login(user: UserLogin):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, password, role FROM users WHERE email = %s;", (user.email,))
            db_user = cur.fetchone()
            if not db_user:
                raise HTTPException(status_code=401, detail="Incorrect username")

            user_id, stored_pw, role = db_user

            # ✅ CASE 1: stored_pw is bcrypt hash
            if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
                if not bcrypt.checkpw(user.password.encode('utf-8'), stored_pw.encode('utf-8')):
                    raise HTTPException(status_code=401, detail="Incorrect password")

            # ✅ CASE 2: stored_pw is plaintext → upgrade it
            else:
                if user.password != stored_pw:
                    raise HTTPException(status_code=401, detail="Incorrect password")

                # Automatically hash and update password for next time
                hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cur.execute("UPDATE users SET password = %s WHERE user_id = %s;", (hashed_pw, user_id))
                conn.commit()

            # Generate JWT token
            token = create_access_token({"user_id": user_id, "role": role})
            return {"access_token": token, "token_type": "bearer", "role": role}

    finally:
        conn.close()

def compute_similarity_faiss(source_index, target_index, source_embedding_id, target_embedding_ids, target_texts, top_k=3):
    # FIX: Filter out None embeddings to avoid TypeError
    valid_indices = [i for i, eid in enumerate(target_embedding_ids) if eid is not None]
    if not valid_indices:
        return np.array([]), np.array([])  # Return empty arrays if no valid embeddings
    
    # Extract valid eids and corresponding texts
    valid_target_eids = [target_embedding_ids[i] for i in valid_indices]
    valid_target_texts = [target_texts[i] for i in valid_indices]  # Not used in this function, but kept for consistency
    
    # Reconstruct source vector (assuming source_embedding_id is always valid)
    source_vec = np.zeros((1, source_index.d), dtype='float32')
    source_index.reconstruct(int(source_embedding_id), source_vec[0])
    
    # Reconstruct target vectors only for valid eids
    target_vecs = np.zeros((len(valid_target_eids), target_index.d), dtype='float32')
    for i, eid in enumerate(valid_target_eids):
        target_index.reconstruct(int(eid), target_vecs[i])  # Now safe, eid is not None
    
    # Normalize and search
    faiss.normalize_L2(source_vec)
    faiss.normalize_L2(target_vecs)
    
    search_index = faiss.IndexFlatIP(target_index.d)
    search_index.add(target_vecs)
    D, I = search_index.search(source_vec, min(top_k, len(valid_target_eids)))  # Limit to available vectors
    
    # Map I (indices into valid_target_eids) back to original target_embedding_ids indices
    original_I = np.array([valid_indices[idx] for idx in I[0]])
    
    return D[0], original_I



@app.post("/create-company-profile")
def create_company_profile(profile: CompanyProfile):
    conn = get_db()
    try:
        # Insert into company table
        insert_dynamic(conn, "company", {
            "user_id": profile.user_id,
            "company_name": profile.company_name,
            "company_description": profile.company_description,
            "country": profile.country,
            "city": profile.city,
            "company_size": profile.company_size,
            "domain": profile.domain,
        })
        
        # Get the inserted company_id
        with conn.cursor() as cur:
            cur.execute("SELECT company_id FROM company WHERE user_id = %s ORDER BY company_id DESC LIMIT 1", (profile.user_id,))
            company_id = cur.fetchone()[0]
        
        # Generate and store profile embedding
        generate_and_store_embedding_from_profile(company_id, "company", conn)
        
        conn.commit()
        return {"message": "Company profile created successfully", "company_id": company_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


class FreelancerProfile(BaseModel):
    user_id: int
    full_name: str
    gender: str
    country: str = None
    city: str = None
    date_of_birth: str = None
    email: str
    phone_number: str
    linkedin_url: str = None
    degree: str = None
    graduation_year: int = None
    experience_year: int = None
    experience_level: str
    professional_summary: str = None
    certifications: str = None
    portfolio: str = None
    skills: str = None
    domain: str
    work_preference: str
    availability: str
    hourly_rate: float = None
    projects: str



# Add these helper functions if not already defined (from your pipeline code)
def update_resume_text(conn, table_name, user_id, resume_text):
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET resume_text = %s WHERE user_id = %s").format(sql.Identifier(table_name)),
                    (resume_text, user_id))
        conn.commit()

def extract_text_from_pdf(file_path):
    text = ""
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"⚠️ Error reading PDF: {e}")
    return text

def extract_text_from_txt(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"⚠️ Error reading TXT: {e}")
        return ""



@app.post("/create-freelancer-profile")
def create_freelancer_profile(
    user_id: int = Form(...),
    full_name: str = Form(...),
    gender: str = Form(...),
    country: str = Form(None),
    city: str = Form(None),
    date_of_birth: str = Form(None),
    email: str = Form(...),
    phone_number: str = Form(...),
    linkedin_url: str = Form(None),
    degree: str = Form(None),
    graduation_year: int = Form(None),
    experience_year: int = Form(None),
    experience_level: str = Form(...),
    professional_summary: str = Form(None),
    certifications: str = Form(None),
    portfolio: str = Form(None),
    skills: str = Form(None),
    domain: str = Form(...),
    work_preference: str = Form(...),
    availability: str = Form(...),
    hourly_rate: float = Form(None),
    projects: str = Form(...),  # JSON string from frontend
    resume_file: UploadFile = File(None)
):
    conn = get_db()
    try:
        # Validate user_id exists in users table
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

        # Prepare data for insert_dynamic (exclude resume_text, as it's handled separately)
        data = {
            "user_id": user_id,
            "full_name": full_name,
            "gender": gender,
            "country": country,
            "city": city,
            "date_of_birth": datetime.strptime(date_of_birth, "%Y-%m-%d").date() if date_of_birth else None,
            "email": email,
            "phone_number": phone_number,
            "linkedin_url": linkedin_url,
            "degree": degree,
            "graduation_year": graduation_year,
            "experience_year": experience_year,
            "experience_level": experience_level,
            "professional_summary": professional_summary,
            "certifications": certifications,
            "portfolio": portfolio,
            "skills": skills,
            "domain": domain,
            "work_preference": work_preference,
            "availability": availability,
            "hourly_rate": hourly_rate,
            "projects": projects,  # Already a JSON string from frontend
        }

        # Insert into freelancer table (resume_text will be updated separately)
        insert_dynamic(conn, "freelancer", data)

        # Handle resume text extraction and update (same logic as your pipeline code)
        if resume_file:
            resume_text = ""
            try:
                content = resume_file.file.read()
                if resume_file.content_type == "text/plain":
                    # For TXT, decode directly
                    resume_text = content.decode("utf-8").strip()
                elif resume_file.content_type == "application/pdf":
                    # For PDF, use PyPDF2 (adapted from your extract_text_from_pdf)
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                    for page in pdf_reader.pages:
                        resume_text += page.extract_text() or ""
                    resume_text = resume_text.strip()
                else:
                    raise HTTPException(status_code=400, detail="Resume must be a .txt or .pdf file")

                if resume_text:
                    update_resume_text(conn, "freelancer", user_id, resume_text)
                    print(f"✅ Resume text saved to DB for user_id={user_id}, length={len(resume_text)}")
                else:
                    print(f"⚠️ No text extracted from resume for user_id={user_id}")
            except Exception as e:
                print(f"⚠️ Error processing resume for user_id={user_id}: {e}")
                # Optionally raise an error: raise HTTPException(status_code=500, detail="Failed to process resume file")

        # Get the inserted freelancer_id
        with conn.cursor() as cur:
            cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s ORDER BY freelancer_id DESC LIMIT 1", (user_id,))
            freelancer_id = cur.fetchone()[0]

        # Generate and store profile embedding
        generate_and_store_embedding_from_profile(freelancer_id, "freelancer", conn, EMBEDDINGS_DIR)

        # Generate and store skill embedding
        generate_and_store_skill_embedding(freelancer_id, "freelancer", conn)

        conn.commit()
        return {"message": "Freelancer profile created successfully", "freelancer_id": freelancer_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/create-job-seeker-profile")
def create_job_seeker_profile(
    user_id: int = Form(...),
    full_name: str = Form(...),
    gender: str = Form(...),
    country: str = Form(None),
    city: str = Form(None),
    date_of_birth: str = Form(None),
    phone_number: str = Form(...),
    email: str = Form(...),
    linkedin_url: str = Form(None),
    education: str = Form(...),  # JSON string from frontend
    degree: str = Form(None),
    graduation_year: int = Form(None),
    university: str = Form(None),
    skills: str = Form(None),
    career_objective: str = Form(None),
    domain: str = Form(...),
    contact_info: str = Form(None),
    expected_salary: float = Form(None),
    job_type: str = Form(...),
    experience_level: str = Form(...),
    past_jobs: str = Form(...),  # JSON string from frontend
    resume_file: UploadFile = File(None)
):
    conn = get_db()
    try:
        # Validate user_id exists in users table
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

        # Prepare data for insert_dynamic (exclude resume_text, as it's handled separately)
        data = {
            "user_id": user_id,
            "full_name": full_name,
            "gender": gender,
            "country": country,
            "city": city,
            "date_of_birth": datetime.strptime(date_of_birth, "%Y-%m-%d").date() if date_of_birth else None,
            "phone_number": phone_number,
            "email": email,
            "linkedin_url": linkedin_url,
            "education": education,  # Already a JSON string from frontend
            "degree": degree,
            "graduation_year": graduation_year,
            "university": university,
            "skills": skills,
            "career_objective": career_objective,
            "domain": domain,
            "contact_info": contact_info,
            "expected_salary": expected_salary,
            "job_type": job_type,
            "experience_level": experience_level,
            "past_jobs": past_jobs,  # Already a JSON string from frontend
        }

        # Insert into job_seeker table (resume_text will be updated separately)
        insert_dynamic(conn, "job_seeker", data)

        # Handle resume text extraction and update (same logic as freelancer)
        if resume_file:
            resume_text = ""
            try:
                content = resume_file.file.read()
                if resume_file.content_type == "text/plain":
                    # For TXT, decode directly
                    resume_text = content.decode("utf-8").strip()
                elif resume_file.content_type == "application/pdf":
                    # For PDF, use PyPDF2 (adapted from your extract_text_from_pdf)
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                    for page in pdf_reader.pages:
                        resume_text += page.extract_text() or ""
                    resume_text = resume_text.strip()
                else:
                    raise HTTPException(status_code=400, detail="Resume must be a .txt or .pdf file")

                if resume_text:
                    update_resume_text(conn, "job_seeker", user_id, resume_text)
                    print(f"✅ Resume text saved to DB for user_id={user_id}, length={len(resume_text)}")
                else:
                    print(f"⚠️ No text extracted from resume for user_id={user_id}")
            except Exception as e:
                print(f"⚠️ Error processing resume for user_id={user_id}: {e}")
                # Optionally raise an error: raise HTTPException(status_code=500, detail="Failed to process resume file")

        # Get the inserted candidate_id
        with conn.cursor() as cur:
            cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s ORDER BY candidate_id DESC LIMIT 1", (user_id,))
            candidate_id = cur.fetchone()[0]

        # Generate and store profile embedding
        generate_and_store_embedding_from_profile(candidate_id, "job_seeker", conn, EMBEDDINGS_DIR)

        # Generate and store skill embedding
        generate_and_store_skill_embedding(candidate_id, "job_seeker", conn)

        conn.commit()
        return {"message": "Job Seeker profile created successfully", "candidate_id": candidate_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class PostJobRequest(BaseModel):
    user_id: int
    job_title: str
    job_description: str
    job_type: str
    required_experience: str
    required_skills: str
    work_mode: str
    salary: float = None
    preferred_domain: str
class PostProjectRequest(BaseModel):
    user_id: int
    project_title: str
    project_description: str
    project_type: str
    payment_type: str
    work_mode: str
    required_experience: str
    required_skills: str
    team_size: int = None
    duration: str
    domain: str
    salary: int = None

@app.post("/post-job")
def post_job(request: PostJobRequest):
    conn = get_db()
    try:
        # Validate user and get company_id
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (request.user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            cur.execute("SELECT company_id FROM company WHERE user_id = %s", (request.user_id,))
            company_row = cur.fetchone()
            if not company_row:
                raise HTTPException(status_code=404, detail="Company profile not found")
            company_id = company_row[0]
        # Prepare data
        data = {
            "company_id": company_id,
            "job_title": request.job_title,
            "job_description": request.job_description,
            "job_type": request.job_type,
            "required_experience": request.required_experience,
            "required_skills": request.required_skills,
            "work_mode": request.work_mode,
            "salary": request.salary,
            "preferred_domain": request.preferred_domain,
        }

        # Insert into job table
        insert_dynamic(conn, "job", data)
        # Get job_id
        with conn.cursor() as cur:
            cur.execute("SELECT job_id FROM job WHERE company_id = %s ORDER BY created_at DESC LIMIT 1", (company_id,))
            job_id = cur.fetchone()[0]
        # Generate embeddings
        generate_and_store_embedding_from_profile(job_id, "job", conn, EMBEDDINGS_DIR)
        generate_and_store_skill_embedding(job_id, "job", conn)
        conn.commit()
        return {"message": "Job posted successfully", "job_id": job_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/post-project")
def post_project(request: PostProjectRequest):
    conn = get_db()
    try:
        # Validate user and get company_id
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (request.user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            cur.execute("SELECT company_id FROM company WHERE user_id = %s", (request.user_id,))
            company_row = cur.fetchone()
            if not company_row:
                raise HTTPException(status_code=404, detail="Company profile not found")
            company_id = company_row[0]

        # Prepare data
        data = {
            "company_id": company_id,
            "project_title": request.project_title,
            "project_description": request.project_description,
            "project_type": request.project_type,
            "payment_type": request.payment_type,
            "work_mode": request.work_mode,
            "required_experience": request.required_experience,
            "required_skills": request.required_skills,
            "team_size": request.team_size,
            "duration": request.duration,
            "domain": request.domain,
            "salary": request.salary,
        }

        # Insert into projects table
        insert_dynamic(conn, "projects", data)

        # Get project_id
        with conn.cursor() as cur:
            cur.execute("SELECT project_id FROM projects WHERE company_id = %s ORDER BY created_at DESC LIMIT 1", (company_id,))
            project_id = cur.fetchone()[0]

        # Generate embeddings
        generate_and_store_embedding_from_profile(project_id, "projects", conn, EMBEDDINGS_DIR)
        generate_and_store_skill_embedding(project_id, "projects", conn)

        conn.commit()
        return {"message": "Project posted successfully", "project_id": project_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Define allowed filter values (for validation)
ALLOWED_SALARY_RANGES = ["0 - 500", "500 - 1,000", "1,000 - 2,000", "2,000 - 5,000", "5,000+"]
ALLOWED_EXPERIENCE_LEVELS = ["beginner", "intermediate", "expert"]
ALLOWED_JOB_TYPES = ["full-time", "part-time", "contract", "internship"]
ALLOWED_PROJECT_TYPES = ["short-term", "long-term", "General", "milestone"]
ALLOWED_WORK_MODES = ["remote", "hybrid", "on-site"]

# Provided scale_scores function
def scale_scores(raw_scores):
    """
    Scales a list of raw scores so the highest becomes ~98%, others proportional.
    - raw_scores: List of floats (e.g., [0.6, 0.3, 0.1])
    - Returns: List of scaled scores (e.g., [98.0, 49.0, 16.3])
    """
    if not raw_scores:
        return []
    
    max_score = max(raw_scores)
    if max_score > 0:
        scaled = [(score / max_score) * 98 for score in raw_scores]
        scaled = [min(s, 100) for s in scaled]  # Cap at 100%
    else:
        scaled = [0.0] * len(raw_scores)  # All 0 if max is 0
    
    return [round(s, 1) for s in scaled]

def parse_salary_range(range_str):
    if range_str == "Any":
        return None, None
    if " - " in range_str:
        parts = range_str.split(" - ")
        min_val = int(parts[0].replace(",", ""))
        max_val = int(parts[1].replace(",", ""))
        return min_val, max_val
    elif "+" in range_str:
        min_val = int(range_str.replace(",", "").replace("+", ""))
        return min_val, None
    return None, None

def perform_talent_match(conn, source_table, target_table, source_row, source_cols, source_text_cols, target_text_cols, domain_col=None, filters=None, filter_keys=None, top_k=10):
    if not source_row:
        return []
    
    source_text = " ".join([str(source_row[source_cols.index(c)]) for c in source_text_cols if c in source_cols])
    source_text = clean_text(source_text)
    source_domain = source_row[source_cols.index(domain_col)] if domain_col and domain_col in source_cols else None

    # Infer domain if missing
    if not source_domain or source_domain.strip() == "":
        inferred_domain = infer_domain(source_text)
        source_domain = inferred_domain

    target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, domain_col, source_domain, filters, filter_keys)

    if not target_embedding_ids:
        # Fallback to all domains
        target_pks, target_embedding_ids, target_texts = fetch_target_embeddings(conn, target_table, target_text_cols, None, None, filters, filter_keys)

    if not target_embedding_ids:
        return []

    source_index = load_faiss_index(FAISS_PATHS[source_table])
    target_index = load_faiss_index(FAISS_PATHS[target_table])
    
    D, I = compute_similarity_faiss(source_index, target_index, source_row[source_cols.index('embedding_vector_id')], target_embedding_ids, target_texts, top_k)
    skill_similarities = compute_skill_similarity(conn, source_table, target_table, source_row, source_cols, target_pks, top_k)

    WEIGHT_TEXT = 0.7
    WEIGHT_SKILL = 0.3
    raw_scores = WEIGHT_TEXT * D + WEIGHT_SKILL * np.array(skill_similarities)[I]
    scaled_scores = scale_scores(raw_scores.tolist())  # Scale the scores

    results = []
    for rank, (score, idx) in enumerate(sorted(zip(scaled_scores, I), reverse=True)[:top_k]):
        target_pk = target_pks[idx]
        target_info = target_texts[idx]
        
        # Fetch additional details for display (using correct column names)
        pk_col = "freelancer_id" if target_table == "freelancer" else "candidate_id" if target_table == "job_seeker" else "job_id" if target_table == "job" else "project_id"
        with conn.cursor() as cur:
            if target_table in ["freelancer", "job_seeker"]:
                salary_col = "hourly_rate" if target_table == "freelancer" else "expected_salary"
                cur.execute(f"SELECT full_name, email, skills, experience_level, country, city, domain FROM {target_table} WHERE {pk_col} = %s", (target_pk,))
                row = cur.fetchone()
                if row:
                    results.append({
                        "id": target_pk,
                        "name": row[0],
                        "email": row[1],
                        "skills": row[2],
                        "experience": row[3],
                        "location": f"{row[4]}, {row[5]}",
                        "domain": row[6],  # For display
                        "match_score": score,
                    })
            elif target_table in ["job", "projects"]:
                # Correct JOIN + proper table aliasing to avoid ambiguity
                pk_col = "job_id" if target_table == "job" else "project_id"

                # Job and Project column mappings
                title_col = "job_title" if target_table == "job" else "project_title"
                desc_col = "job_description" if target_table == "job" else "project_description"
                type_col = "job_type" if target_table == "job" else "project_type"
                domain_field = "preferred_domain" if target_table == "job" else "domain"

                cur.execute(f"""
                    SELECT 
                        j.{title_col},
                        j.{domain_field},
                        j.required_experience,
                        j.work_mode,
                        c.country,
                        c.city,
                        c.company_name
                    FROM {target_table} j
                    JOIN company c ON j.company_id = c.company_id
                    WHERE j.{pk_col} = %s
                """, (target_pk,))
                
                row = cur.fetchone()
                if row:
                    results.append({
                        "id": target_pk,
                        "title": row[0],
                        "domain": row[1],
                        "required_experience": row[2],
                        "work_mode": row[3],
                        "country": row[4],
                        "city": row[5],
                        "company_name": row[6],
                        "match_score": score,
                    })

    return results


# Unified /talent-match endpoint
@app.get("/talent-match")
def talent_match(
          post_id: Optional[int] = None,  # Use Optional[int] for clarity
          top_k: int = 10,
          salary_range: Optional[str] = None,
          experience_level: Optional[str] = None,
          job_type: Optional[str] = None,
          project_type: Optional[str] = None,
          work_mode: Optional[str] = None,
          country: Optional[str] = None,
          city: Optional[str] = None,
          user_id: int = Depends(verify_token)
       ):
       conn = get_db()
       try:
           # Get user role
           with conn.cursor() as cur:
               cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
               role_row = cur.fetchone()
               if not role_row:
                   raise HTTPException(status_code=404, detail="User not found")
               role = role_row[0]
           
           if role not in ["freelancer", "job_seeker", "company_admin"]:
               raise HTTPException(status_code=400, detail="Invalid role for talent match")
           
           # Role-based setup
           if role == "company_admin":
               if not post_id:
                   raise HTTPException(status_code=400, detail="post_id required for company admins")
               # Check ownership and determine type
               with conn.cursor() as cur:
                   cur.execute("SELECT company_id FROM company WHERE user_id = %s", (user_id,))
                   company_row = cur.fetchone()
                   if not company_row:
                       raise HTTPException(status_code=403, detail="Company profile not found")
                   company_id = company_row[0]
                   cur.execute("SELECT 'job' AS type FROM job WHERE job_id = %s AND company_id = %s UNION SELECT 'project' AS type FROM projects WHERE project_id = %s AND company_id = %s", (post_id, company_id, post_id, company_id))
                   post_type_row = cur.fetchone()
                   if not post_type_row:
                       raise HTTPException(status_code=404, detail="Post not found or not owned by you")
                   post_type = post_type_row[0]
               
               # Set source/target
               source_table = "job" if post_type == "job" else "projects"
               source_pk = "job_id" if post_type == "job" else "project_id"
               target_table = "job_seeker" if post_type == "job" else "freelancer"
               source_text_cols = ["job_title", "job_description", "preferred_domain"] if post_type == "job" else ["project_title", "project_description", "domain"]
               target_text_cols = ["career_objective", "resume_text", "domain"] if target_table == "job_seeker" else ["professional_summary", "resume_text", "domain"]
               domain_col = "preferred_domain" if target_table == "job" else "domain"
               
               # Fetch source row
               with conn.cursor() as cur:
                   cur.execute(f"SELECT * FROM {source_table} WHERE {source_pk} = %s", (post_id,))
                   source_row = cur.fetchone()
                   source_cols = [d[0] for d in cur.description]
           
           else:  # freelancer or job_seeker
               source_table = role
               target_table = "projects" if role == "freelancer" else "job"
               source_text_cols = ["professional_summary", "resume_text", "domain"] if role == "freelancer" else ["career_objective", "resume_text", "domain"]
               target_text_cols = ["project_title", "project_description", "domain"] if target_table == "projects" else ["job_title", "job_description", "preferred_domain"]
               domain_col = "domain" if target_table == "projects" else "preferred_domain"
               
               # Fetch source row
               with conn.cursor() as cur:
                   cur.execute(f"SELECT * FROM {source_table} WHERE user_id = %s", (user_id,))
                   source_row = cur.fetchone()
                   if not source_row:
                       raise HTTPException(status_code=404, detail="Profile not found")
                   source_cols = [d[0] for d in cur.description]
           
           # Prepare and validate filters
           filters = {}
           filter_keys = []
           if salary_range and salary_range in ALLOWED_SALARY_RANGES:
               filters["salary_range"] = salary_range
               filter_keys.append("salary_range")
           if experience_level and experience_level.lower() in ALLOWED_EXPERIENCE_LEVELS:
               filters["experience_level"] = experience_level.lower()
               filter_keys.append("experience_level")
           if job_type and target_table == "job" and job_type.lower() in ALLOWED_JOB_TYPES:
               filters["type"] = job_type.lower()
               filter_keys.append("type")
           if project_type and target_table == "projects" and project_type.lower() in ALLOWED_PROJECT_TYPES:
               filters["type"] = project_type.lower()
               filter_keys.append("type")
           if work_mode and work_mode.lower() in ALLOWED_WORK_MODES:
               filters["work_mode"] = work_mode.lower()
               filter_keys.append("work_mode")
           if country:
               filters["country"] = country
               filter_keys.append("country")
           if city:
               filters["city"] = city
               filter_keys.append("city")
           
           # Perform match
           matches = perform_talent_match(conn, source_table, target_table, source_row, source_cols, source_text_cols, target_text_cols, domain_col, filters, filter_keys, top_k)
           print(f"DEBUG: User {user_id} (role: {role}) requested matches. Found {len(matches)} matches.")
           if matches:
               print(f"Sample match: {matches[0]}")
           return {"matches": matches}
       finally:
           conn.close()

@app.get("/get-company-posts")
def get_company_posts(user_id: int = Depends(verify_token)):
    conn = get_db()
    try:
        # Get company_id from user_id
        with conn.cursor() as cur:
            cur.execute("SELECT company_id FROM company WHERE user_id = %s", (user_id,))
            company_row = cur.fetchone()
            if not company_row:
                raise HTTPException(status_code=404, detail="Company profile not found")
            company_id = company_row[0]
        
        # Fetch jobs and projects
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 'job' AS type, job_id AS id, job_title AS title, preferred_domain AS domain
                FROM job WHERE company_id = %s
                UNION ALL
                SELECT 'projects' AS type, project_id AS id, project_title AS title, domain
                FROM projects WHERE company_id = %s
                ORDER BY type, id;
            """, (company_id, company_id))
            posts = cur.fetchall()
        
        # Format response
        result = [{"type": row[0], "id": row[1], "title": row[2], "domain": row[3]} for row in posts]
        return {"posts": result}
    finally:
        conn.close()


from fastapi import APIRouter, HTTPException, Query, Depends


from fastapi import APIRouter, HTTPException, Query, Depends, FastAPI  # Added FastAPI import
from typing import Optional  # For optional dependencies if needed



router = APIRouter()

@router.get("/api/profile/{item_id}")
def get_profile(
    item_id: int,
    type: str = Query(..., description="Type of item: 'candidate' (alias for 'job_seeker'), 'job', 'project', or 'freelancer'"),
):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if type == "candidate":
                cur.execute("SELECT * FROM job_seeker WHERE candidate_id = %s", (item_id,))
            elif type == "freelancer":
                cur.execute("SELECT * FROM freelancer WHERE freelancer_id = %s", (item_id,))
            elif type == "job":
                cur.execute("SELECT * FROM job WHERE job_id = %s", (item_id,))
            elif type == "project":
                cur.execute("SELECT * FROM projects WHERE project_id = %s", (item_id,))
            else:
                raise HTTPException(status_code=400, detail="Invalid type specified")

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"No record found for {type} with ID {item_id}")

            # Get column names dynamically
            colnames = [desc[0] for desc in cur.description]
            record = dict(zip(colnames, row))

            # Remove specified fields if they exist
            fields_to_remove = ['created_at', 'skill_embedding', 'embedding_vector_id', 'candidate_id', 'freelancer_id', 'company_id', 'job_id', 'project_id']
            for field in fields_to_remove:
                record.pop(field, None)

        return {"type": type, "data": record}

    finally:
        conn.close()


app.include_router(router)
if __name__ == "__main__":
    import uvicorn
    # Server configuration
    host = os.getenv("BACKEND_HOST")
    port = int(os.getenv("BACKEND_PORT"))
    uvicorn.run(app, host=host, port=port) 