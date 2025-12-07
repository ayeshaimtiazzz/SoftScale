"""Utility functions."""
from .embeddings import (
    get_weighted_embedding,
    store_embedding_faiss,
    generate_and_store_embedding_from_profile,
    generate_and_store_skill_embedding,
    ensure_faiss_index,
    save_faiss_index,
    get_faiss_index_path
)
from .text_processing import chunk_text, extract_text_from_pdf, extract_text_from_txt
from .jwt import create_access_token
from .talent_matching import perform_talent_match, scale_scores, parse_salary_range

__all__ = [
    "get_weighted_embedding",
    "store_embedding_faiss",
    "generate_and_store_embedding_from_profile",
    "generate_and_store_skill_embedding",
    "ensure_faiss_index",
    "save_faiss_index",
    "get_faiss_index_path",
    "chunk_text",
    "extract_text_from_pdf",
    "extract_text_from_txt",
    "create_access_token",
    "perform_talent_match",
    "scale_scores",
    "parse_salary_range",
]
