"""CLI smoke test: python -m ai.price_predictor.main (from backend directory)."""

from .pipeline import run_price_prediction
from .service import get_price_model


def main():
    sample = {
        "description": "Build AI chatbot with login and dashboard",
        "region": "pakistan",
        "experience_level": "intermediate",
        "freelancer_level": "senior",
        "effort": 1.2,
        "urgency": 1.1,
    }
    model = get_price_model()
    out = run_price_prediction(sample, model)
    print(out)


if __name__ == "__main__":
    main()
