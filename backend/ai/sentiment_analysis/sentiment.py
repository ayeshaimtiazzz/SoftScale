from pathlib import Path
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from config import settings

_BASE_DIR = Path(__file__).resolve().parent
_LOCAL_SENTIMENT_MODEL_PATH = _BASE_DIR / "model" / "sentiment_model" / "twitter-roberta"

_sentiment_model = None
if _LOCAL_SENTIMENT_MODEL_PATH.exists():
    _tokenizer = AutoTokenizer.from_pretrained(
        str(_LOCAL_SENTIMENT_MODEL_PATH),
        local_files_only=True,
        cache_dir=settings.HF_CACHE_DIR,
    )
    _model = AutoModelForSequenceClassification.from_pretrained(
        str(_LOCAL_SENTIMENT_MODEL_PATH),
        local_files_only=True,
        cache_dir=settings.HF_CACHE_DIR,
    )
    _sentiment_model = pipeline(
        "sentiment-analysis",
        model=_model,
        tokenizer=_tokenizer,
        framework="pt",
    )


def _heuristic_sentiment(text: str) -> dict:
    """No-download fallback sentiment when local model files are missing."""
    t = (text or "").lower()
    positive_words = {
        "good", "great", "excellent", "awesome", "love", "thanks", "thank you",
        "perfect", "happy", "interested", "yes", "approved", "confirm",
    }
    negative_words = {
        "bad", "poor", "terrible", "awful", "hate", "angry", "delay", "issue",
        "problem", "reject", "no", "decline", "urgent", "frustrated",
    }

    pos = sum(1 for w in positive_words if w in t)
    neg = sum(1 for w in negative_words if w in t)
    total = pos + neg

    if total == 0:
        return {"label": "neutral", "confidence": 0.5}
    if pos > neg:
        return {"label": "positive", "confidence": round(pos / total, 3)}
    if neg > pos:
        return {"label": "negative", "confidence": round(neg / total, 3)}
    return {"label": "neutral", "confidence": 0.5}


def get_sentiment(text: str) -> dict:
    if _sentiment_model is not None:
        result = _sentiment_model(text[:512])[0]
        return {
            "label": result["label"].lower(),
            "confidence": round(result["score"], 3),
        }
    return _heuristic_sentiment(text)

