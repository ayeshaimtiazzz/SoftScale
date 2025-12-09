# Leads Match Model Files

This directory contains model files for the leads matching embedding service.

## Model Details

- **Model Type**: SentenceTransformer
- **Model Name**: `all-MiniLM-L6-v2` (default)
- **Source**: HuggingFace (downloaded automatically)
- **Purpose**: Generate embeddings for semantic similarity search

## Usage

The model is loaded automatically by `TalentEmbeddingService` when first accessed.

## Custom Models

If you want to use a custom fine-tuned model:
1. Place model files in this directory
2. Update `config/settings.py` - `EMBED_MODEL_NAME` to point to local path
3. Restart the application

## Related Files

- Service: `../service.py` - TalentEmbeddingService
- Datasets: `../datasets/` - Training and evaluation data
- Embeddings: `backend/embeddings/` - Generated FAISS indices
