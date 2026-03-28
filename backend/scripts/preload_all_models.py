"""Preload all runtime models into local folders/cache.

Usage:
    python scripts/preload_all_models.py
    python scripts/preload_all_models.py --check-only
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config import settings  # noqa: E402


def _ensure_dir(path: str | Path) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def _has_file(path: str | Path) -> bool:
    return Path(path).exists()


def ensure_intent_model() -> bool:
    model_dir = BASE_DIR / "ai" / "sentiment_analysis" / "model" / "intent_model" / "distilbert"
    config_ok = _has_file(model_dir / "config.json")
    tok_ok = _has_file(model_dir / "tokenizer.json")
    ok = config_ok and tok_ok
    print(f"[intent] {'OK' if ok else 'MISSING'}: {model_dir}")
    return ok


def ensure_sentiment_model(check_only: bool) -> bool:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification

    model_id = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    model_dir = BASE_DIR / "ai" / "sentiment_analysis" / "model" / "sentiment_model" / "twitter-roberta"
    config_ok = _has_file(model_dir / "config.json")
    tok_ok = _has_file(model_dir / "tokenizer.json")
    if config_ok and tok_ok:
        print(f"[sentiment] OK: {model_dir}")
        return True

    if check_only:
        print(f"[sentiment] MISSING: {model_dir}")
        return False

    print(f"[sentiment] Downloading {model_id} -> {model_dir}")
    _ensure_dir(model_dir)
    tok = AutoTokenizer.from_pretrained(model_id, cache_dir=settings.HF_CACHE_DIR)
    mdl = AutoModelForSequenceClassification.from_pretrained(model_id, cache_dir=settings.HF_CACHE_DIR)
    tok.save_pretrained(str(model_dir))
    mdl.save_pretrained(str(model_dir), safe_serialization=True)
    print("[sentiment] Download complete")
    return True


def ensure_embedding_model(check_only: bool) -> bool:
    from sentence_transformers import SentenceTransformer

    model_id = settings.EMBED_MODEL_NAME
    embed_path = Path(settings.EMBED_MODEL_PATH)
    model_dir = None
    if (embed_path / "modules.json").exists() and (embed_path / "config.json").exists():
        model_dir = embed_path
    else:
        snapshots_dir = embed_path / "snapshots"
        if snapshots_dir.exists():
            candidates = sorted(
                [p for p in snapshots_dir.iterdir() if p.is_dir()],
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            for candidate in candidates:
                if (candidate / "modules.json").exists() and (candidate / "config.json").exists():
                    model_dir = candidate
                    break

    if model_dir is not None:
        print(f"[embed] OK: {model_dir}")
        return True

    if check_only:
        print(f"[embed] MISSING/INCOMPLETE: {embed_path}")
        return False

    print(f"[embed] Downloading {model_id} -> {settings.SENTENCE_TRANSFORMERS_CACHE_DIR}")
    _ensure_dir(settings.SENTENCE_TRANSFORMERS_CACHE_DIR)
    SentenceTransformer(
        model_id,
        cache_folder=settings.SENTENCE_TRANSFORMERS_CACHE_DIR,
    )
    print("[embed] Download complete")
    return True


def ensure_proposal_merged_model() -> bool:
    merged = Path(settings.PROPOSAL_MERGED_MODEL_PATH)
    config_ok = _has_file(merged / "config.json")
    tokenizer_ok = _has_file(merged / "tokenizer.json")
    weights_ok = len(list(merged.glob("model*.safetensors"))) > 0 or len(list(merged.glob("pytorch_model*.bin"))) > 0
    ok = config_ok and tokenizer_ok and weights_ok
    print(f"[proposal-merged] {'OK' if ok else 'MISSING/INCOMPLETE'}: {merged}")
    return ok


def ensure_proposal_base_model(check_only: bool) -> bool:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch

    base_dir = Path(settings.PROPOSAL_BASE_MODEL_PATH)
    config_ok = _has_file(base_dir / "config.json")
    tokenizer_ok = _has_file(base_dir / "tokenizer.json")
    if config_ok and tokenizer_ok:
        print(f"[proposal-base] OK: {base_dir}")
        return True

    if check_only:
        print(f"[proposal-base] MISSING: {base_dir}")
        return False

    model_id = settings.PROPOSAL_BASE_MODEL_NAME
    print(f"[proposal-base] Downloading {model_id} -> {base_dir}")
    _ensure_dir(base_dir)
    tok = AutoTokenizer.from_pretrained(
        model_id,
        trust_remote_code=True,
        cache_dir=settings.HF_CACHE_DIR,
    )
    tok.save_pretrained(str(base_dir))
    _ = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        cache_dir=settings.HF_CACHE_DIR,
    )
    # Model files are already in cache. Keep local base dir tokenizers/config to support local-path loading.
    print("[proposal-base] Download complete (cached + local tokenizer/config)")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Preload all SoftScale runtime models.")
    parser.add_argument("--check-only", action="store_true", help="Do not download; only report missing assets.")
    args = parser.parse_args()

    _ensure_dir(settings.MODEL_CACHE_ROOT)
    _ensure_dir(settings.HF_CACHE_DIR)
    _ensure_dir(settings.TORCH_CACHE_DIR)
    _ensure_dir(settings.SENTENCE_TRANSFORMERS_CACHE_DIR)

    print("== SoftScale model preloader ==")
    print(f"cache root: {settings.MODEL_CACHE_ROOT}")
    print(f"hf cache:   {settings.HF_CACHE_DIR}")
    print(f"st cache:   {settings.SENTENCE_TRANSFORMERS_CACHE_DIR}")
    print("")

    checks = []

    # Use deterministic sequential preload. In this environment, parallel imports of
    # transformers/sentence-transformers can trigger huggingface_hub circular-init errors.
    checks.append(("intent", ensure_intent_model()))
    checks.append(("sentiment", ensure_sentiment_model(args.check_only)))
    checks.append(("embed", ensure_embedding_model(args.check_only)))
    proposal_merged_ok = ensure_proposal_merged_model()
    checks.append(("proposal_merged", proposal_merged_ok))

    # Only attempt base-model preload if merged model is missing/incomplete.
    if not proposal_merged_ok:
        checks.append(("proposal_base", ensure_proposal_base_model(args.check_only)))

    failed = [name for name, ok in checks if not ok]
    print("")
    if failed:
        print(f"Missing/incomplete: {', '.join(failed)}")
        return 1

    print("All required runtime models are ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

