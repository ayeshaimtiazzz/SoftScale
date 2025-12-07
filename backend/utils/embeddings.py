"""Embedding utilities."""
import os
import json
import numpy as np
import faiss
from scipy.special import softmax
from psycopg2 import sql
from sentence_transformers import SentenceTransformer
from config import settings
from data.database import get_primary_keys
from talent import clean_text

# Initialize model
MODEL = SentenceTransformer(settings.EMBED_MODEL_NAME)

# Ensure embeddings directory exists
os.makedirs(settings.EMBEDDINGS_DIR, exist_ok=True)

def get_faiss_index_path(entity, embeddings_dir=None):
    """Get FAISS index path for an entity."""
    if embeddings_dir is None:
        embeddings_dir = settings.EMBEDDINGS_DIR
    os.makedirs(embeddings_dir, exist_ok=True)
    return os.path.join(embeddings_dir, f"{entity}_index.faiss")

def ensure_faiss_index(dim, entity, embeddings_dir=None):
    """Ensure FAISS index exists or create it."""
    if embeddings_dir is None:
        embeddings_dir = settings.EMBEDDINGS_DIR
    path = get_faiss_index_path(entity, embeddings_dir)
    if os.path.exists(path):
        index = faiss.read_index(path)
        if index.d != dim:
            raise ValueError(f"Dimension mismatch for FAISS index {entity}: expected {dim}, got {index.d}")
        return index
    else:
        return faiss.IndexFlatIP(dim)

def save_faiss_index(index, entity, embeddings_dir=None):
    """Save FAISS index to disk."""
    if embeddings_dir is None:
        embeddings_dir = settings.EMBEDDINGS_DIR
    path = get_faiss_index_path(entity, embeddings_dir)
    faiss.write_index(index, path)

def store_embedding_faiss(embedding, table_name, embeddings_dir=None):
    """Store embedding in FAISS index."""
    if embeddings_dir is None:
        embeddings_dir = settings.EMBEDDINGS_DIR
    embedding = np.array(embedding, dtype='float32').reshape(1, -1)
    dim = embedding.shape[1]
    index = ensure_faiss_index(dim, table_name, embeddings_dir)
    vector_id = int(index.ntotal)
    index.add(embedding)
    save_faiss_index(index, table_name, embeddings_dir)
    return vector_id

def get_weighted_embedding(text, model=None, normalize=True):
    """Generate weighted embedding from text."""
    if model is None:
        model = MODEL
    from utils.text_processing import chunk_text
    
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

def generate_and_store_embedding_from_profile(record_id, role, conn, embeddings_dir=None):
    """Generate and store embedding for a profile."""
    if embeddings_dir is None:
        embeddings_dir = settings.EMBEDDINGS_DIR
    
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
    """Generate and store skill embedding."""
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
