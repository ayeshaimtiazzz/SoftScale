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
            cur.execute("SELECT user_id, name, email, role FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            return {"user_id": row[0], "name": row[1], "email": row[2], "role": row[3]}
    finally:
        conn.close()

@app.get("/check-profile-completion")
def check_profile_completion(user_id: int = Depends(verify_token)):
    """Check if user has completed their profile setup (role selection and form filling)"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Get user role
            cur.execute("SELECT role FROM users WHERE user_id = %s", (user_id,))
            role_row = cur.fetchone()
            if not role_row:
                raise HTTPException(status_code=404, detail="User not found")
            
            role = role_row[0]
            
            # If role is pending, profile is incomplete
            if role == "pending" or not role:
                return {"completed": False, "reason": "role_not_selected", "user_id": user_id}
            
            # Check if profile exists based on role
            profile_exists = False
            if role == "freelancer":
                cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s LIMIT 1", (user_id,))
                profile_exists = cur.fetchone() is not None
            elif role == "job_seeker":
                cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s LIMIT 1", (user_id,))
                profile_exists = cur.fetchone() is not None
            elif role in ("company_admin", "company"):
                cur.execute("SELECT company_id FROM company WHERE user_id = %s LIMIT 1", (user_id,))
                profile_exists = cur.fetchone() is not None
            
            if not profile_exists:
                return {"completed": False, "reason": "profile_not_created", "user_id": user_id, "role": role}
            
            return {"completed": True, "user_id": user_id, "role": role}
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

            # CASE 1: stored_pw is bcrypt hash
            if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
                if not bcrypt.checkpw(user.password.encode('utf-8'), stored_pw.encode('utf-8')):
                    raise HTTPException(status_code=401, detail="Incorrect password")

            # CASE 2: stored_pw is plaintext → upgrade it
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

# Account Settings Models
class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    email_notifications: Optional[bool] = True
    push_notifications: Optional[bool] = True
    billing_alerts: Optional[bool] = True
    marketing_emails: Optional[bool] = False

# Billing Models
class PaymentMethod(BaseModel):
    card_type: str
    last_four: str
    expiry_month: int
    expiry_year: int
    is_default: bool = False

class SubscriptionPlan(BaseModel):
    plan_name: str
    price: float
    billing_cycle: str  # "monthly", "yearly"
    features: list

class BillingHistoryItem(BaseModel):
    invoice_id: str
    date: str
    amount: float
    status: str  # "paid", "pending", "failed"
    description: str

# Account Settings Endpoints
@app.put("/update-user-details")
def update_user_details(update_data: UpdateUserRequest, user_id: int = Depends(verify_token)):
    """Update user's name and/or email"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            updates = []
            values = []
            
            if update_data.name:
                updates.append("name = %s")
                values.append(update_data.name)
            
            if update_data.email:
                # Check if email already exists
                cur.execute("SELECT user_id FROM users WHERE email = %s AND user_id != %s", (update_data.email, user_id))
                if cur.fetchone():
                    raise HTTPException(status_code=400, detail="Email already in use")
                updates.append("email = %s")
                values.append(update_data.email)
            
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(updates)} WHERE user_id = %s RETURNING user_id, name, email, role"
            cur.execute(query, values)
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            conn.commit()
            return {"message": "User details updated successfully", "user_id": row[0], "name": row[1], "email": row[2], "role": row[3]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/change-password")
def change_password(password_data: ChangePasswordRequest, user_id: int = Depends(verify_token)):
    """Change user password"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Get current password
            cur.execute("SELECT password FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            stored_pw = row[0]
            
            # Verify current password
            if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
                if not bcrypt.checkpw(password_data.current_password.encode('utf-8'), stored_pw.encode('utf-8')):
                    raise HTTPException(status_code=401, detail="Current password is incorrect")
            else:
                if password_data.current_password != stored_pw:
                    raise HTTPException(status_code=401, detail="Current password is incorrect")
            
            # Hash new password
            hashed_password = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Update password (updated_at column may not exist in all database instances)
            cur.execute("UPDATE users SET password = %s WHERE user_id = %s", 
                       (hashed_password, user_id))
            conn.commit()
            
            return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/notification-preferences")
def get_notification_preferences(user_id: int = Depends(verify_token)):
    """Get user notification preferences"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Check if preferences table exists, if not return defaults
            cur.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'user_preferences' AND table_schema = 'public'
            """)
            if not cur.fetchone():
                # Return default preferences if table doesn't exist
                return {
                    "email_notifications": True,
                    "push_notifications": True,
                    "billing_alerts": True,
                    "marketing_emails": False
                }
            
            cur.execute("""
                SELECT email_notifications, push_notifications, billing_alerts, marketing_emails
                FROM user_preferences WHERE user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            
            if row:
                return {
                    "email_notifications": row[0],
                    "push_notifications": row[1],
                    "billing_alerts": row[2],
                    "marketing_emails": row[3]
                }
            else:
                # Return defaults if no preferences set
                return {
                    "email_notifications": True,
                    "push_notifications": True,
                    "billing_alerts": True,
                    "marketing_emails": False
                }
    finally:
        conn.close()

@app.put("/notification-preferences")
def update_notification_preferences(preferences: NotificationPreferences, user_id: int = Depends(verify_token)):
    """Update user notification preferences"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Create table if it doesn't exist
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
                    email_notifications BOOLEAN DEFAULT TRUE,
                    push_notifications BOOLEAN DEFAULT TRUE,
                    billing_alerts BOOLEAN DEFAULT TRUE,
                    marketing_emails BOOLEAN DEFAULT FALSE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Insert or update preferences
            cur.execute("""
                INSERT INTO user_preferences (user_id, email_notifications, push_notifications, billing_alerts, marketing_emails)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    billing_alerts = EXCLUDED.billing_alerts,
                    marketing_emails = EXCLUDED.marketing_emails,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                user_id,
                preferences.email_notifications if preferences.email_notifications is not None else True,
                preferences.push_notifications if preferences.push_notifications is not None else True,
                preferences.billing_alerts if preferences.billing_alerts is not None else True,
                preferences.marketing_emails if preferences.marketing_emails is not None else False
            ))
            conn.commit()
            
            return {"message": "Notification preferences updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Billing Endpoints
@app.get("/subscription")
def get_subscription(user_id: int = Depends(verify_token)):
    """Get user's current subscription plan"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Create subscriptions table if it doesn't exist
            cur.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    subscription_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    plan_name VARCHAR(100) DEFAULT 'Free',
                    price DECIMAL(10, 2) DEFAULT 0,
                    billing_cycle VARCHAR(20) DEFAULT 'monthly',
                    status VARCHAR(20) DEFAULT 'active',
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                )
            """)
            
            cur.execute("""
                SELECT plan_name, price, billing_cycle, status, start_date, end_date
                FROM subscriptions WHERE user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            
            if row:
                return {
                    "plan_name": row[0],
                    "price": float(row[1]),
                    "billing_cycle": row[2],
                    "status": row[3],
                    "start_date": row[4].isoformat() if row[4] else None,
                    "end_date": row[5].isoformat() if row[5] else None
                }
            else:
                # Return default free plan
                return {
                    "plan_name": "Free",
                    "price": 0.0,
                    "billing_cycle": "monthly",
                    "status": "active",
                    "start_date": None,
                    "end_date": None
                }
    finally:
        conn.close()

@app.put("/subscription")
def update_subscription(subscription: SubscriptionPlan, user_id: int = Depends(verify_token)):
    """Update user's subscription plan"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Ensure subscriptions table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    subscription_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    plan_name VARCHAR(100) DEFAULT 'Free',
                    price DECIMAL(10, 2) DEFAULT 0,
                    billing_cycle VARCHAR(20) DEFAULT 'monthly',
                    status VARCHAR(20) DEFAULT 'active',
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                )
            """)
            
            # Insert or update subscription
            cur.execute("""
                INSERT INTO subscriptions (user_id, plan_name, price, billing_cycle, status, start_date)
                VALUES (%s, %s, %s, %s, 'active', CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    plan_name = EXCLUDED.plan_name,
                    price = EXCLUDED.price,
                    billing_cycle = EXCLUDED.billing_cycle,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, subscription.plan_name, subscription.price, subscription.billing_cycle))
            conn.commit()
            
            return {"message": "Subscription updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/payment-methods")
def get_payment_methods(user_id: int = Depends(verify_token)):
    """Get user's payment methods"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Create payment_methods table if it doesn't exist
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_methods (
                    payment_method_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    card_type VARCHAR(50),
                    last_four VARCHAR(4),
                    expiry_month INTEGER,
                    expiry_year INTEGER,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cur.execute("""
                SELECT payment_method_id, card_type, last_four, expiry_month, expiry_year, is_default
                FROM payment_methods WHERE user_id = %s ORDER BY is_default DESC, created_at DESC
            """, (user_id,))
            rows = cur.fetchall()
            
            return [
                {
                    "id": row[0],
                    "card_type": row[1],
                    "last_four": row[2],
                    "expiry_month": row[3],
                    "expiry_year": row[4],
                    "is_default": row[5]
                }
                for row in rows
            ]
    finally:
        conn.close()

@app.post("/payment-methods")
def add_payment_method(payment_method: PaymentMethod, user_id: int = Depends(verify_token)):
    """Add a new payment method"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Ensure payment_methods table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_methods (
                    payment_method_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    card_type VARCHAR(50),
                    last_four VARCHAR(4),
                    expiry_month INTEGER,
                    expiry_year INTEGER,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # If this is set as default, unset other defaults
            if payment_method.is_default:
                cur.execute("UPDATE payment_methods SET is_default = FALSE WHERE user_id = %s", (user_id,))
            
            # Insert new payment method
            cur.execute("""
                INSERT INTO payment_methods (user_id, card_type, last_four, expiry_month, expiry_year, is_default)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING payment_method_id
            """, (
                user_id,
                payment_method.card_type,
                payment_method.last_four,
                payment_method.expiry_month,
                payment_method.expiry_year,
                payment_method.is_default
            ))
            payment_id = cur.fetchone()[0]
            conn.commit()
            
            return {"message": "Payment method added successfully", "payment_method_id": payment_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.delete("/payment-methods/{payment_method_id}")
def delete_payment_method(payment_method_id: int, user_id: int = Depends(verify_token)):
    """Delete a payment method"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("SELECT user_id FROM payment_methods WHERE payment_method_id = %s", (payment_method_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Payment method not found")
            if row[0] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            cur.execute("DELETE FROM payment_methods WHERE payment_method_id = %s", (payment_method_id,))
            conn.commit()
            
            return {"message": "Payment method deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/billing-history")
def get_billing_history(user_id: int = Depends(verify_token)):
    """Get user's billing history"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # Create billing_history table if it doesn't exist
            cur.execute("""
                CREATE TABLE IF NOT EXISTS billing_history (
                    invoice_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    amount DECIMAL(10, 2),
                    status VARCHAR(20) DEFAULT 'pending',
                    description TEXT,
                    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cur.execute("""
                SELECT invoice_id, invoice_date, amount, status, description
                FROM billing_history WHERE user_id = %s ORDER BY invoice_date DESC LIMIT 50
            """, (user_id,))
            rows = cur.fetchall()
            
            return [
                {
                    "invoice_id": str(row[0]),
                    "date": row[1].isoformat() if row[1] else None,
                    "amount": float(row[2]),
                    "status": row[3],
                    "description": row[4]
                }
                for row in rows
            ]
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
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_txt(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error reading TXT: {e}")
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

        # Query database to get actual enum values for availability_enum
        db_enum_values = []
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'availability_enum') 
                    ORDER BY enumsortorder;
                """)
                db_enum_values = [row[0] for row in cur.fetchall()]
                print(f"DEBUG: Database enum values for availability_enum: {db_enum_values}")
        except Exception as e:
            print(f"DEBUG: Could not query enum values (column might be VARCHAR, not ENUM): {e}")

        # Map availability from frontend format to database enum format
        # Frontend sends: "full-time", "part-time", "freelance", "not available"
        # We need to match these to actual database enum values
        
        # First, try to match directly against database enum values (case-insensitive)
        availability_db = None
        if db_enum_values:
            availability_lower = availability.lower()
            for db_value in db_enum_values:
                db_value_lower = db_value.lower()
                # Try exact match
                if db_value_lower == availability_lower:
                    availability_db = db_value
                    break
                # Try common mappings
                if availability_lower == "full-time" and ("full" in db_value_lower or "time" in db_value_lower):
                    availability_db = db_value
                    break
                if availability_lower == "part-time" and ("part" in db_value_lower or "time" in db_value_lower):
                    availability_db = db_value
                    break
                if availability_lower == "freelance" and "freelance" in db_value_lower:
                    availability_db = db_value
                    break
                if availability_lower == "not available" and ("not" in db_value_lower or "available" in db_value_lower):
                    availability_db = db_value
                    break
        
        # If no match found, try fallback mappings
        if not availability_db:
            # Common fallback mappings - try different formats
            # Since "part_time" was rejected for job_type, try "part-time" with hyphen
            availability_mapping = {
                "full-time": "full-time",  # Try with hyphen first
                "part-time": "part-time",  # Try with hyphen (since part_time was rejected)
                "freelance": "freelance",
                "not available": "not_available"  # Try with underscore for spaces
            }
            availability_db = availability_mapping.get(availability, availability)
            
            # If still no match and we have DB enum values, try fuzzy matching
            if db_enum_values:
                availability_lower = availability.lower()
                for db_value in db_enum_values:
                    db_lower = db_value.lower()
                    # Fuzzy match: if frontend value is contained in DB value or vice versa
                    if availability_lower in db_lower or db_lower in availability_lower:
                        availability_db = db_value
                        print(f"DEBUG: Fuzzy matched '{availability}' to '{db_value}'")
                        break
        
        # Final check: if we have DB enum values and our value doesn't match, log warning
        if db_enum_values and availability_db not in db_enum_values:
            # Try one more time with case-insensitive match
            availability_db_lower = availability_db.lower()
            for db_value in db_enum_values:
                if db_value.lower() == availability_db_lower:
                    availability_db = db_value
                    break
            else:
                print(f"ERROR: '{availability_db}' (from frontend '{availability}') not in enum values: {db_enum_values}")
                # Use the first enum value as last resort (shouldn't happen, but prevents crash)
                if db_enum_values:
                    availability_db = db_enum_values[0]
                    print(f"WARNING: Using first enum value '{availability_db}' as fallback")
        
        print(f"DEBUG: Frontend sent availability: '{availability}' -> Using: '{availability_db}'")
        print(f"DEBUG: Available enum values were: {db_enum_values}")

        # Map work_preference from frontend format (with hyphens) to database enum format (with underscores)
        # Frontend sends: "on-site", "remote", "hybrid"
        # Database enum expects: "on_site", "remote", "hybrid"
        work_preference_mapping = {
            "on-site": "on_site",
            "remote": "remote",
            "hybrid": "hybrid"
        }
        work_preference_db = work_preference_mapping.get(work_preference, work_preference.replace("-", "_"))

        # Validate and sanitize linkedin_url - must be a valid URL or NULL
        # The check constraint likely requires a valid URL format (starts with http:// or https://) or NULL
        linkedin_url_validated = None
        if linkedin_url:
            linkedin_url = linkedin_url.strip()
            # Check if it's already a valid URL
            if linkedin_url.startswith(('http://', 'https://')):
                linkedin_url_validated = linkedin_url
            elif linkedin_url.startswith('www.'):
                # Add https:// if it starts with www.
                linkedin_url_validated = f"https://{linkedin_url}"
            elif 'linkedin.com' in linkedin_url.lower():
                # If it contains linkedin.com but no protocol, add https://
                linkedin_url_validated = f"https://{linkedin_url}"
            elif linkedin_url:
                # If it's not empty but doesn't look like a URL, set to None
                # The check constraint will fail if we pass invalid URL format
                print(f"WARNING: Invalid linkedin_url format: '{linkedin_url}'. Setting to NULL.")
                linkedin_url_validated = None

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
            "linkedin_url": linkedin_url_validated,
            "degree": degree,
            "graduation_year": graduation_year,
            "experience_year": experience_year,
            "experience_level": experience_level,
            "professional_summary": professional_summary,
            "certifications": certifications,
            "portfolio": portfolio,
            "skills": skills,
            "domain": domain,
            "work_preference": work_preference_db,  # Use mapped value for database enum
            "availability": availability_db,  # Use mapped value for database enum
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
                    print(f"Resume text saved to DB for user_id={user_id}, length={len(resume_text)}")
                else:
                    print(f"No text extracted from resume for user_id={user_id}")
            except Exception as e:
                print(f"Error processing resume for user_id={user_id}: {e}")
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
        error_msg = str(e)
        
        # Parse error to return field-specific messages
        field_error = None
        if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
            if "availability_enum" in error_msg:
                field_error = {"field": "availability", "message": "Please select a valid availability option."}
            elif "work_preference" in error_msg or "work_mode" in error_msg:
                field_error = {"field": "work_preference", "message": "Please select a valid work preference option."}
            else:
                field_error = {"field": "general", "message": "Invalid selection. Please check your form inputs."}
        elif "check constraint" in error_msg.lower():
            if "linkedin_url" in error_msg:
                field_error = {"field": "linkedin_url", "message": "LinkedIn URL must be a valid URL (starting with http:// or https://) or left empty."}
            else:
                # Extract field name from constraint name if possible
                field_error = {"field": "general", "message": "Invalid input format. Please check your entries."}
        elif "not null" in error_msg.lower() or "null value" in error_msg.lower():
            # Try to extract field name from error
            if "email" in error_msg.lower():
                field_error = {"field": "email", "message": "Email is required."}
            elif "phone" in error_msg.lower():
                field_error = {"field": "phone_number", "message": "Phone number is required."}
            else:
                field_error = {"field": "general", "message": "Required fields are missing."}
        
        if field_error:
            raise HTTPException(status_code=400, detail=field_error["message"])
        
        raise HTTPException(status_code=500, detail="An error occurred. Please try again.")
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
    job_type_db = job_type  # Initialize for error handling
    try:
        # Validate user_id exists in users table
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

        # Query database to get actual enum values for job_type_enum
        db_job_type_enum_values = []
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT enumlabel 
                    FROM pg_enum 
                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'job_type_enum') 
                    ORDER BY enumsortorder;
                """)
                db_job_type_enum_values = [row[0] for row in cur.fetchall()]
                print(f"DEBUG: Database enum values for job_type_enum: {db_job_type_enum_values}")
        except Exception as e:
            print(f"DEBUG: Could not query job_type_enum values (column might be VARCHAR, not ENUM): {e}")

        # Map job_type from frontend format to database enum format
        # Frontend JOB_TYPES_FORM sends: "permanent", "contract", "freelance", "internship"
        # We need to match these to actual database enum values
        
        # First, try to match directly against database enum values (case-insensitive)
        job_type_db = None
        if db_job_type_enum_values:
            job_type_lower = job_type.lower()
            for db_value in db_job_type_enum_values:
                db_value_lower = db_value.lower()
                # Try exact match
                if db_value_lower == job_type_lower:
                    job_type_db = db_value
                    break
                # Try common mappings
                if job_type_lower == "permanent" and ("full" in db_value_lower or "permanent" in db_value_lower):
                    job_type_db = db_value
                    break
                if job_type_lower == "freelance" and ("part" in db_value_lower or "freelance" in db_value_lower):
                    job_type_db = db_value
                    break
                if job_type_lower == "contract" and "contract" in db_value_lower:
                    job_type_db = db_value
                    break
                if job_type_lower == "internship" and "internship" in db_value_lower:
                    job_type_db = db_value
                    break
        
        # If no match found, try fallback mappings
        if not job_type_db:
            # Common fallback mappings - try different formats
            # Since "part_time" was rejected, try "part-time" with hyphen
            job_type_mapping = {
                "permanent": "full-time",  # Try with hyphen
                "contract": "contract",
                "freelance": "part-time",  # Try with hyphen (since part_time was rejected)
                "internship": "internship"
            }
            job_type_db = job_type_mapping.get(job_type, job_type)
            
            # If still no match and we have DB enum values, try fuzzy matching
            if db_job_type_enum_values:
                job_type_lower = job_type.lower()
                for db_value in db_job_type_enum_values:
                    db_lower = db_value.lower()
                    # Fuzzy match: if frontend value is contained in DB value or vice versa
                    if job_type_lower in db_lower or db_lower in job_type_lower:
                        job_type_db = db_value
                        print(f"DEBUG: Fuzzy matched '{job_type}' to '{db_value}'")
                        break
        
        # Final check: if we have DB enum values and our value doesn't match, log warning
        if db_job_type_enum_values and job_type_db not in db_job_type_enum_values:
            # Try one more time with case-insensitive match
            job_type_db_lower = job_type_db.lower()
            for db_value in db_job_type_enum_values:
                if db_value.lower() == job_type_db_lower:
                    job_type_db = db_value
                    break
            else:
                print(f"ERROR: '{job_type_db}' (from frontend '{job_type}') not in enum values: {db_job_type_enum_values}")
                # Use the first enum value as last resort (shouldn't happen, but prevents crash)
                if db_job_type_enum_values:
                    job_type_db = db_job_type_enum_values[0]
                    print(f"WARNING: Using first enum value '{job_type_db}' as fallback")
        
        print(f"DEBUG: Frontend sent job_type: '{job_type}' -> Using: '{job_type_db}'")
        print(f"DEBUG: Available enum values were: {db_job_type_enum_values}")

        # Validate and sanitize linkedin_url - must be a valid URL or NULL
        # The check constraint likely requires a valid URL format (starts with http:// or https://) or NULL
        linkedin_url_validated = None
        if linkedin_url:
            linkedin_url = linkedin_url.strip()
            # Check if it's already a valid URL
            if linkedin_url.startswith(('http://', 'https://')):
                linkedin_url_validated = linkedin_url
            elif linkedin_url.startswith('www.'):
                # Add https:// if it starts with www.
                linkedin_url_validated = f"https://{linkedin_url}"
            elif 'linkedin.com' in linkedin_url.lower():
                # If it contains linkedin.com but no protocol, add https://
                linkedin_url_validated = f"https://{linkedin_url}"
            elif linkedin_url:
                # If it's not empty but doesn't look like a URL, set to None
                # The check constraint will fail if we pass invalid URL format
                print(f"WARNING: Invalid linkedin_url format: '{linkedin_url}'. Setting to NULL.")
                linkedin_url_validated = None

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
            "linkedin_url": linkedin_url_validated,
            "education": education,  # Already a JSON string from frontend
            "degree": degree,
            "graduation_year": graduation_year,
            "university": university,
            "skills": skills,
            "career_objective": career_objective,
            "domain": domain,
            "contact_info": contact_info,
            "expected_salary": expected_salary,
            "job_type": job_type_db,  # Use mapped value for database enum
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
                    print(f"Resume text saved to DB for user_id={user_id}, length={len(resume_text)}")
                else:
                    print(f"No text extracted from resume for user_id={user_id}")
            except Exception as e:
                print(f"Error processing resume for user_id={user_id}: {e}")
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
        error_msg = str(e)
        
        # Parse error to return field-specific messages
        field_error = None
        if "enum" in error_msg.lower() or "invalid input value" in error_msg.lower():
            if "job_type_enum" in error_msg:
                field_error = {"field": "job_type", "message": "Please select a valid job type option."}
            elif "availability_enum" in error_msg:
                field_error = {"field": "availability", "message": "Please select a valid availability option."}
            else:
                field_error = {"field": "general", "message": "Invalid selection. Please check your form inputs."}
        elif "check constraint" in error_msg.lower():
            if "linkedin_url" in error_msg:
                field_error = {"field": "linkedin_url", "message": "LinkedIn URL must be a valid URL (starting with http:// or https://) or left empty."}
            else:
                field_error = {"field": "general", "message": "Invalid input format. Please check your entries."}
        elif "not null" in error_msg.lower() or "null value" in error_msg.lower():
            # Try to extract field name from error
            if "email" in error_msg.lower():
                field_error = {"field": "email", "message": "Email is required."}
            elif "phone" in error_msg.lower():
                field_error = {"field": "phone_number", "message": "Phone number is required."}
            else:
                field_error = {"field": "general", "message": "Required fields are missing."}
        
        if field_error:
            raise HTTPException(status_code=400, detail=field_error["message"])
        
        raise HTTPException(status_code=500, detail="An error occurred. Please try again.")
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
                    # Map table name to type for frontend
                    item_type = "freelancer" if target_table == "freelancer" else "candidate"
                    results.append({
                        "id": target_pk,
                        "name": row[0],
                        "email": row[1],
                        "skills": row[2],
                        "experience": row[3],
                        "experience_level": row[3],  # Add for consistency
                        "location": f"{row[4]}, {row[5]}",
                        "country": row[4],  # Add separate fields
                        "city": row[5],  # Add separate fields
                        "domain": row[6],  # For display
                        "match_score": score,
                        "type": item_type,  # Add type field for frontend
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
                    # Map table name to type for frontend
                    item_type = "job" if target_table == "job" else "project"
                    results.append({
                        "id": target_pk,
                        "title": row[0],
                        "domain": row[1],
                        "preferred_domain": row[1],  # Add for consistency with job table
                        "required_experience": row[2],
                        "experience_level": row[2],  # Add for consistency
                        "work_mode": row[3],
                        "workModel": row[3],  # Add alias for frontend compatibility
                        "country": row[4],
                        "city": row[5],
                        "company_name": row[6],
                        "match_score": score,
                        "type": item_type,  # Add type field for frontend
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
           
           # Normalize role name (handle both "jobseeker" and "job_seeker")
           if role == "jobseeker":
               role = "job_seeker"
           
           if role not in ["freelancer", "job_seeker", "company_admin"]:
               raise HTTPException(status_code=400, detail=f"Invalid role for talent match: {role}")
           
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
               # Map role to table name
               if role == "freelancer":
                   source_table = "freelancer"
               elif role == "job_seeker":
                   source_table = "job_seeker"
               else:
                   raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
               
               target_table = "projects" if role == "freelancer" else "job"
               source_text_cols = ["professional_summary", "resume_text", "domain"] if role == "freelancer" else ["career_objective", "resume_text", "domain"]
               target_text_cols = ["project_title", "project_description", "domain"] if target_table == "projects" else ["job_title", "job_description", "preferred_domain"]
               domain_col = "domain" if target_table == "projects" else "preferred_domain"
               
               # Fetch source row
               with conn.cursor() as cur:
                   cur.execute(f"SELECT * FROM {source_table} WHERE user_id = %s", (user_id,))
                   source_row = cur.fetchone()
                   if not source_row:
                       raise HTTPException(status_code=404, detail=f"Profile not found for {role}. Please complete your profile first.")
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

@router.get("/api/get-profile-id")
def get_profile_id(user_id: int = Depends(verify_token), role: str = Query(...)):
    """Get profile ID from user_id based on role - for company_admin and freelancer only"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if role == "freelancer":
                cur.execute("SELECT freelancer_id FROM freelancer WHERE user_id = %s ORDER BY freelancer_id DESC LIMIT 1", (user_id,))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Freelancer profile not found")
                return {"profile_id": row[0]}
            elif role == "company" or role == "company_admin":
                cur.execute("SELECT company_id FROM company WHERE user_id = %s ORDER BY company_id DESC LIMIT 1", (user_id,))
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Company profile not found")
                return {"profile_id": row[0]}
            else:
                raise HTTPException(status_code=400, detail="Invalid role specified. This endpoint only supports 'freelancer' and 'company'/'company_admin' roles.")
    finally:
        conn.close()

@router.get("/api/get-job-seeker-profile-id")
def get_job_seeker_profile_id(user_id: int = Depends(verify_token)):
    """Get job seeker profile ID from user_id - old route for job_seeker"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT candidate_id FROM job_seeker WHERE user_id = %s ORDER BY candidate_id DESC LIMIT 1", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Job seeker profile not found")
            return {"profile_id": row[0], "candidate_id": row[0]}
    finally:
        conn.close()

@router.get("/api/profile/{item_id}")
def get_profile(
    item_id: int,
    type: str = Query(..., description="Type of item: 'candidate' (alias for 'job_seeker'), 'job', 'project', 'freelancer', or 'company'"),
):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if type == "candidate":
                cur.execute("SELECT * FROM job_seeker WHERE candidate_id = %s", (item_id,))
            elif type == "freelancer":
                cur.execute("SELECT * FROM freelancer WHERE freelancer_id = %s", (item_id,))
            elif type == "company":
                cur.execute("SELECT * FROM company WHERE company_id = %s", (item_id,))
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

@router.get("/api/jobs")
def get_all_jobs():
    """Get all jobs for freelancers and job seekers"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    j.job_id,
                    j.job_title AS title,
                    j.job_description,
                    j.job_type,
                    j.required_experience AS experience_level,
                    j.required_skills AS skills,
                    j.work_mode,
                    j.salary,
                    j.preferred_domain AS domain,
                    c.company_name,
                    c.country,
                    c.city
                FROM job j
                JOIN company c ON j.company_id = c.company_id
                ORDER BY j.created_at DESC
            """)
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            jobs = []
            for row in rows:
                job = dict(zip(colnames, row))
                # Format salary as string if present
                if job.get('salary'):
                    job['salaryRange'] = f"${job['salary']:,.0f}"
                # Add type field for frontend
                job['type'] = 'job'
                jobs.append(job)
        return jobs
    finally:
        conn.close()

@router.get("/api/projects")
def get_all_projects():
    """Get all projects for freelancers"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    p.project_id,
                    p.project_title AS title,
                    p.project_description,
                    p.project_type,
                    p.payment_type,
                    p.required_experience AS experience_level,
                    p.required_skills AS skills,
                    p.work_mode,
                    p.salary,
                    p.domain,
                    p.team_size,
                    p.duration,
                    c.company_name,
                    c.country,
                    c.city
                FROM projects p
                JOIN company c ON p.company_id = c.company_id
                ORDER BY p.created_at DESC
            """)
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            projects = []
            for row in rows:
                project = dict(zip(colnames, row))
                # Format salary as string if present
                if project.get('salary'):
                    project['salaryRange'] = f"${project['salary']:,.0f}"
                # Add type field for frontend
                project['type'] = 'project'
                projects.append(project)
        return projects
    finally:
        conn.close()

@router.get("/api/candidates")
def get_all_candidates():
    """Get all candidates (job seekers and freelancers) for companies"""
    conn = get_db()
    try:
        candidates = []
        
        # Get job seekers - use job_type instead of work_mode (which doesn't exist in job_seeker table)
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        candidate_id AS id,
                        full_name AS name,
                        email,
                        skills,
                        experience_level AS experience,
                        country,
                        city,
                        domain,
                        expected_salary,
                        job_type
                    FROM job_seeker
                    ORDER BY created_at DESC
                """)
                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                for row in rows:
                    candidate = dict(zip(colnames, row))
                    # Build location string safely handling NULL values
                    country = candidate.get('country') or ''
                    city = candidate.get('city') or ''
                    if country and city:
                        candidate['location'] = f"{country}, {city}"
                    elif country:
                        candidate['location'] = country
                    elif city:
                        candidate['location'] = city
                    else:
                        candidate['location'] = 'Not specified'
                    
                    candidate['type'] = 'candidate'
                    # Map job_type to workModel for frontend compatibility
                    if candidate.get('job_type'):
                        candidate['workModel'] = candidate['job_type']
                    
                    if candidate.get('expected_salary'):
                        try:
                            candidate['salaryRange'] = f"${float(candidate['expected_salary']):,.0f}"
                        except (ValueError, TypeError):
                            candidate['salaryRange'] = None
                    candidates.append(candidate)
        except Exception as e:
            print(f"Error fetching job seekers: {str(e)}")
            import traceback
            traceback.print_exc()
            # Continue to try freelancers even if job seekers fail
        
        # Get freelancers - use work_preference instead of work_mode (which doesn't exist in freelancer table)
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        freelancer_id AS id,
                        full_name AS name,
                        email,
                        skills,
                        experience_level AS experience,
                        country,
                        city,
                        domain,
                        hourly_rate,
                        work_preference
                    FROM freelancer
                    ORDER BY created_at DESC
                """)
                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                for row in rows:
                    freelancer = dict(zip(colnames, row))
                    # Build location string safely handling NULL values
                    country = freelancer.get('country') or ''
                    city = freelancer.get('city') or ''
                    if country and city:
                        freelancer['location'] = f"{country}, {city}"
                    elif country:
                        freelancer['location'] = country
                    elif city:
                        freelancer['location'] = city
                    else:
                        freelancer['location'] = 'Not specified'
                    
                    freelancer['type'] = 'freelancer'
                    # Map work_preference to workModel for frontend compatibility
                    # Convert "on_site" to "on-site" for frontend
                    if freelancer.get('work_preference'):
                        work_pref = freelancer['work_preference']
                        if work_pref == 'on_site':
                            freelancer['workModel'] = 'on-site'
                        else:
                            freelancer['workModel'] = work_pref
                    
                    if freelancer.get('hourly_rate'):
                        try:
                            freelancer['salaryRange'] = f"${float(freelancer['hourly_rate']):,.0f}/hour"
                        except (ValueError, TypeError):
                            freelancer['salaryRange'] = None
                    candidates.append(freelancer)
        except Exception as e:
            print(f"Error fetching freelancers: {str(e)}")
            import traceback
            traceback.print_exc()
            # Return what we have so far
        
        return candidates
    except Exception as e:
        print(f"Error in get_all_candidates: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch candidates: {str(e)}")
    finally:
        conn.close()


app.include_router(router)
if __name__ == "__main__":
    import uvicorn
    # Server configuration
    host = os.getenv("BACKEND_HOST")
    port = int(os.getenv("BACKEND_PORT"))
    uvicorn.run(app, host=host, port=port) 