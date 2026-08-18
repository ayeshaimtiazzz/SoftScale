def generate_advanced_explanation(features, importance, ml_price, rule_price, complexity):

    explanation = []

    # Top features (clean)
    sorted_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    top_features = [f for f, _ in sorted_features if f in features][:3]

    explanation.append("Top cost drivers: " + ", ".join(top_features))

    # Complexity
    explanation.append(f"Project complexity is '{complexity}', increasing overall effort.")

    # ML vs Rule
    diff = ml_price - rule_price
    if abs(diff) > 150:
        explanation.append("ML model adjusted the estimate based on learned patterns.")
    else:
        explanation.append("Both ML and rule-based estimates are consistent.")

    # Feature reasoning
    if "ai chatbot" in features:
        explanation.append("AI modules add cost due to integration and API usage.")

    if "payment integration" in features:
        explanation.append("Payment systems require secure third-party integration.")

    return " ".join(explanation)


