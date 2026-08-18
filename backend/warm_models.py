import os

from sentence_transformers import SentenceTransformer
from config import settings


def main() -> None:
    model_name = os.getenv("EMBED_MODEL_NAME", "all-MiniLM-L6-v2")
    print(f"Downloading / loading SentenceTransformer model: {model_name}")
    SentenceTransformer(
        model_name,
        cache_folder=settings.SENTENCE_TRANSFORMERS_CACHE_DIR,
    )
    print("Model warm-up complete.")


if __name__ == "__main__":
    main()

