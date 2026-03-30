"""Leads Match Model Service.

Sentence transformer model for generating embeddings for leads/talent matching.
"""
import os
from pathlib import Path
import numpy as np
from scipy.special import softmax
from sentence_transformers import SentenceTransformer
from config import settings
from ai.base import BaseModelService
from utils.text_processing import chunk_text


class TalentEmbeddingService(BaseModelService):
    """Service for loading and using the embedding model for leads/talent matching.

    Uses SentenceTransformer model to generate embeddings for semantic search
    and similarity matching between jobs, projects, freelancers, and job seekers.
    """

    _model = None

    def _resolve_embed_model_source(self) -> str:
        """Resolve local sentence-transformers path from cache root/snapshot layout."""
        configured = Path(settings.EMBED_MODEL_PATH)

        # Direct model folder with sentence-transformers metadata.
        if (configured / "modules.json").exists() and (configured / "config.json").exists():
            return str(configured)

        # HuggingFace cache layout: models--.../snapshots/<hash>/...
        snapshots_dir = configured / "snapshots"
        if snapshots_dir.exists():
            candidates = sorted(
                [p for p in snapshots_dir.iterdir() if p.is_dir()],
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            for candidate in candidates:
                if (candidate / "modules.json").exists() and (candidate / "config.json").exists():
                    return str(candidate)

        # Keep old behavior for explicit paths (will error clearly if invalid/missing).
        return str(configured)

    def _load_model(self):
        """Load the sentence transformer model."""
        try:
            model_source = self._resolve_embed_model_source() or settings.EMBED_MODEL_NAME
            print(f"Loading leads match embedding model from local source: {model_source}")

            if not os.path.exists(model_source):
                raise FileNotFoundError(
                    f"Local embedding model not found at: {model_source}. "
                    "Offline mode is enabled and remote downloads are disabled."
                )

            self._model = SentenceTransformer(
                model_source,
                local_files_only=True,
                cache_folder=settings.SENTENCE_TRANSFORMERS_CACHE_DIR,
            )
            self._is_loaded = True
            print("[OK] Leads match embedding model loaded successfully!")

        except Exception as e:
            print(f"[ERROR] Error loading leads match embedding model: {e}")
            import traceback
            traceback.print_exc()
            self._is_loaded = False

    def is_available(self) -> bool:
        """Check if model is loaded and available."""
        return self._is_loaded and self._model is not None

    def encode(
        self,
        texts: list[str] | str,
        normalize: bool = True,
        **kwargs
    ) -> np.ndarray:

        """
        Encode text(s) into embeddings.

        Args:
            texts: Single text string or list of texts to encode
            normalize: Whether to normalize embeddings
            **kwargs: Additional arguments passed to model.encode()

        Returns:
            Numpy array of embeddings
        """
        if not self.is_available():
            raise RuntimeError("Embedding model is not available")

        if isinstance(texts, str):
            texts = [texts]

        embeddings = self._model.encode(
            texts,
            normalize_embeddings=normalize,
            **kwargs
        )

        return np.array(embeddings, dtype="float32")

    def get_weighted_embedding(
        self,
        text: str,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Generate weighted embedding from text by chunking and averaging.

        Uses weighted averaging where later chunks have slightly higher weight,
        useful for resume/proposal text where recent information may be more relevant.

        Args:
            text: Text to generate embedding for
            normalize: Whether to normalize the final embedding

        Returns:
            Numpy array representing the weighted embedding
        """
        if not self.is_available():
            raise RuntimeError("Embedding model is not available")

        chunks = chunk_text(text)
        if not chunks:
            return np.zeros(
                self._model.get_sentence_embedding_dimension(),
                dtype="float32"
            )

        # Encode all chunks
        chunk_embeddings = self._model.encode(
            chunks,
            normalize_embeddings=normalize
        )
        chunk_embeddings = np.array(chunk_embeddings)

        # Weight: newer/more recent chunks slightly higher
        weights = np.linspace(0.8, 1.2, len(chunks))
        weights = softmax(weights)  # Normalize weights

        # Weighted average
        weighted_avg = np.average(
            chunk_embeddings,
            axis=0,
            weights=weights
        )

        # Normalize if requested
        if normalize:
            weighted_avg = weighted_avg / np.linalg.norm(weighted_avg)

        return weighted_avg.astype("float32")

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model."""
        if not self.is_available():
            raise RuntimeError("Embedding model is not available")
        return self._model.get_sentence_embedding_dimension()

