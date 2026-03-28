import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens


def build_template_report(
    msg: str,
    sentiment,
    intent,
    strategy,
    key_signals,
    confidence_scores,
    urgency,
    actions,
    summary,
    reply,
) -> str:
    """Human-readable report without an extra LLM pass (used in fast mode)."""
    sent = sentiment if isinstance(sentiment, dict) else {"label": str(sentiment)}
    ks = key_signals or {}
    interest = ks.get("interest_indicators") or []
    actions_req = ks.get("action_requests") or []
    rec = (actions or {}).get("Recommended_actions") or []
    conf = confidence_scores or {}
    urg = urgency or {}

    def _bullets(items):
        if not items:
            return "— None identified."
        return "\n".join(f"• {x}" for x in items)

    return f"""Communication Analysis Report

1. Overall Sentiment
The message reads as {sent.get("label", "unknown")} (model confidence {sent.get("confidence", "n/a")}).

2. Detected Intent
Intent label: {intent}. Strategy selected: {strategy}.

3. Communication Context
Interest indicators:
{_bullets(interest)}

Action / request phrases:
{_bullets(actions_req)}

4. Urgency
Level: {urg.get("level", "n/a")}. Recommended response window: {urg.get("recommended_response_time", "n/a")}.

5. Confidence Assessment
Sentiment confidence: {conf.get("sentiment_confidence", "n/a")}; intent confidence: {conf.get("intent_confidence", "n/a")}; overall: {conf.get("overall_confidence", "n/a")}.

6. Recommended Next Steps
{_bullets(rec)}

7. Suggested Reply
{reply or "—"}

8. Summary
{summary or "—"}

---
Original message (excerpt):
{msg[:2000]}{"…" if len(msg) > 2000 else ""}
"""


def generate_report(
    model,
    tokenizer,
    msg,
    sentiment,
    intent,
    strategy,
    key_signals,
    confidence_scores,
    urgency,
    actions,
    summary,
    reply,
    max_new_tokens: int | None = None,
):
    cap = max_new_tokens if max_new_tokens is not None else settings.SENTIMENT_REPORT_LLM_MAX_TOKENS
    if cap <= 0:
        return build_template_report(
            msg,
            sentiment,
            intent,
            strategy,
            key_signals,
            confidence_scores,
            urgency,
            actions,
            summary,
            reply,
        )

    # Fill the prompt with actual values
    prompt = f"""
You are an AI communication assistant that converts structured email/message analysis into a clear human-readable report.

You will receive:
1. The original message
2. Sentiment analysis
3. Intent detection
4. Strategy recommendation
5. Key signals
6. Confidence scores
7. Urgency level
8. Recommended actions
9. Summary
10. Suggested reply

Your task is to generate a professional report titled:

"Communication Analysis Report"

The report must contain the following sections in this order:

1. Overall Sentiment
Explain the detected sentiment and what it means about the sender's attitude.

2. Detected Intent
Explain the detected intent and what the sender is trying to achieve.

3. Communication Context
Explain what the sender is asking or discussing based on the key signals.

4. Urgency
Explain the urgency level and recommended response time.

5. Confidence Assessment
Explain how confident the system is in the sentiment and intent predictions.

6. Recommended Next Steps
Convert the recommended_actions list into clear steps for the user.

7. Suggested Reply
Generate a professional reply based on the suggested_reply field. If the provided reply is weak or repeats the question, improve it.

8. Summary
Provide a short explanation of the situation and the best action for the user.

Rules:
- Use clear professional language.
- Do NOT output JSON.
- Write in paragraph format with headings.
- Improve the suggested reply if needed.
- Make the explanation helpful for a job candidate communicating with a recruiter.

Input Data:
Message:
{msg}

Analysis Results:
Sentiment: {sentiment}
Intent: {intent}
Strategy: {strategy}
Key Signals: {key_signals}
Confidence Scores: {confidence_scores}
Urgency: {urgency}
Recommended Actions: {actions}
Summary: {summary}
Suggested Reply: {reply}

Now generate the Communication Analysis Report.
"""

    # Tokenize input
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    # Generate output
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=cap,
            temperature=0.2,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    report_text = decode_new_tokens(tokenizer, output, inputs["input_ids"])

    return report_text

