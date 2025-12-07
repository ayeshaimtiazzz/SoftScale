"""Talent matching utilities."""
import numpy as np
import faiss
from talent import (
    load_faiss_index, FAISS_PATHS, clean_text, infer_domain,
    fetch_target_embeddings, compute_skill_similarity,
    normalize_domain
)

def scale_scores(raw_scores):
    """
    Scales a list of raw scores so the highest becomes ~98%, others proportional.
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
    """Parse salary range string."""
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

def compute_similarity_faiss(source_index, target_index, source_embedding_id, target_embedding_ids, target_texts, top_k=3):
    """Compute similarity using FAISS indices."""
    # Filter out None embeddings to avoid TypeError
    valid_indices = [i for i, eid in enumerate(target_embedding_ids) if eid is not None]
    if not valid_indices:
        return np.array([]), np.array([])  # Return empty arrays if no valid embeddings
    
    # Extract valid eids and corresponding texts
    valid_target_eids = [target_embedding_ids[i] for i in valid_indices]
    
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

def perform_talent_match(conn, source_table, target_table, source_row, source_cols, source_text_cols, target_text_cols, domain_col=None, filters=None, filter_keys=None, top_k=10):
    """Perform talent matching between source and target."""
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
