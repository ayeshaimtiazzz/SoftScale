from transformers import pipeline

_sentiment_model = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    framework="pt",  # Force PyTorch
)


def get_sentiment(text: str) -> dict:
    result = _sentiment_model(text[:512])[0]
    return {
        "label": result["label"].lower(),
        "confidence": round(result["score"], 3),
    }

