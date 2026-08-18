# Highest interest: interview_invitation, negotiation_discussion
# High interest: strong_interest, availability_check
# Medium interest: portfolio_request, clarification_request
# Neutral / uncertain: internal_review, soft_interest
# Low interest: stalling
# Very low interest: polite_rejection

INTENT_SCORES = {
    "interview_invitation": 90,
    "negotiation_discussion": 85,
    "strong_interest": 80,
    "availability_check": 75,
    "portfolio_request": 65,
    "clarification_request": 60,
    "soft_interest": 50,
    "internal_review": 45,
    "stalling": 30,
    "polite_rejection": 10,
}


def calculate_interest(sentiment, intent, fake_positive: bool = False) -> int:
    """
    Calculates recruiter interest score (0–100)

    Primary signal: intent
    Secondary signal: sentiment
    Adjustment: fake positivity penalty
    """

    # 1️⃣ Base score from intent
    score = INTENT_SCORES.get(intent, 40)

    # 2️⃣ Sentiment adjustment
    if sentiment == "positive":
        score += 8
    elif sentiment == "negative":
        score -= 12
    else:  # neutral
        score += 0

    # 3️⃣ Fake positivity penalty
    if fake_positive:
        if intent in ["stalling", "internal_review"]:
            score -= 18
        elif intent == "polite_rejection":
            score -= 8
        else:
            score -= 12

    # 4️⃣ Clamp score
    score = max(0, min(100, score))

    return score

