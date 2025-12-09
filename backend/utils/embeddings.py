"""Embedding utilities.

This module provides utilities for working with embeddings and FAISS indices.
It uses the centralized TalentEmbeddingService for model access.
"""
import os
import json
import numpy as np
import faiss
from psycopg2 import sql
from config import settings
from data.database import get_primary_keys
from talent import clean_text
from ai.leads_match import TalentEmbeddingService

# Initialize embedding service (singleton)
_embedding_service = None

def _get_embedding_service():
    """Get the talent embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = TalentEmbeddingService()
    return _embedding_service

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
    """Generate weighted embedding from text.

    Args:
        text: Text to generate embedding for
        model: Optional model instance (deprecated, uses TalentEmbeddingService)
        normalize: Whether to normalize the embedding

    Returns:
        Numpy array representing the weighted embedding
    """
    embedding_service = _get_embedding_service()
    if not embedding_service.is_available():
        # Fallback: return zero vector with correct dimension
        try:
            dim = embedding_service.get_embedding_dimension()
        except:
            dim = 384  # Default for all-MiniLM-L6-v2
        return np.zeros(dim, dtype="float32")

    return embedding_service.get_weighted_embedding(text, normalize=normalize)

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
    emb = get_weighted_embedding(cleaned, normalize=True)
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
    emb = get_weighted_embedding(cleaned_skills, normalize=True)
    emb_list = emb.tolist()
    with conn.cursor() as cur:
        cur.execute(sql.SQL("UPDATE {} SET skill_embedding = %s WHERE {} = %s").format(
            sql.Identifier(table_name),
            sql.Identifier(pk_col)
        ), (json.dumps(emb_list), record_id))
        conn.commit()
