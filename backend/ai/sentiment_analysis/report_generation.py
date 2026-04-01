import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens, compact_for_llm


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
    short_msg = compact_for_llm(msg, settings.SENTIMENT_LLM_INPUT_MAX_CHARS)
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

    # Compact prompt to reduce token usage while preserving required sections.
    prompt = f"""
Write a concise "Communication Analysis Report" using these exact headings:
1. Overall Sentiment
2. Detected Intent
3. Communication Context
4. Urgency
5. Confidence Assessment
6. Recommended Next Steps
7. Suggested Reply
8. Summary

Use short professional paragraphs. No JSON.

Message: {short_msg}
Sentiment: {sentiment}
Intent: {intent}
Strategy: {strategy}
Key Signals: {key_signals}
Confidence: {confidence_scores}
Urgency: {urgency}
Recommended Actions: {actions}
Summary: {summary}
Suggested Reply: {reply}
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

