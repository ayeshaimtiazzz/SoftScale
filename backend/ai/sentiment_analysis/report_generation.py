import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens, compact_for_llm


def _fmt_pct(x) -> str:
    if x is None:
        return "n/a"
    try:
        v = float(x)
        return f"{v * 100:.0f}%" if v <= 1.0 else f"{v:.0f}%"
    except (TypeError, ValueError):
        return str(x)


def _interest_band(score) -> str:
    try:
        s = int(score)
    except (TypeError, ValueError):
        return "unknown"
    if s >= 80:
        return "high — strong forward-motion signals for this pipeline"
    if s >= 50:
        return "moderate — mixed or developing interest; confirm next steps explicitly"
    if s > 0:
        return "low — limited pull-through; clarify value and timing before investing more time"
    return "minimal — treat as exploratory unless new positive signals appear"


def _bullets(items):
    if not items:
        return "— None identified by the fast keyword pass (enable full mode for deeper phrase extraction)."
    return "\n".join(f"• {x}" for x in items)


def _risk_bullets(risks) -> str:
    if not risks:
        return "— No extra structural risks flagged beyond staying responsive and clear."
    lines = []
    for r in risks:
        t = (r or {}).get("type") or "note"
        d = (r or {}).get("description") or ""
        lines.append(f"• ({t}) {d}")
    return "\n".join(lines)


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
    *,
    risks=None,
    interest_score=None,
    fake_positive: bool = False,
) -> str:
    """Human-readable report without an extra LLM pass (used in fast mode)."""
    sent = sentiment if isinstance(sentiment, dict) else {"label": str(sentiment)}
    ks = key_signals or {}
    interest = ks.get("interest_indicators") or []
    actions_req = ks.get("action_requests") or []
    rec = (actions or {}).get("Recommended_actions") or []
    conf = confidence_scores or {}
    urg = urgency or {}
    risks = risks or []

    label = sent.get("label", "unknown")
    sconf = sent.get("confidence")
    intent_pretty = str(intent).replace("_", " ")

    fp_block = ""
    if fake_positive:
        fp_block = (
            "\nCredibility note: Surface tone looks positive, but intent cues suggest possible stalling, "
            "polite deferral, or internal review—treat warmth as provisional until timelines, decisions, "
            "or commitments are explicit.\n"
        )

    excerpt_cap = 4500
    excerpt = (msg or "").strip()
    if len(excerpt) > excerpt_cap:
        excerpt = excerpt[: excerpt_cap - 1].rstrip() + "…"

    return f"""Communication Analysis Report

1. Overall sentiment
The classifier labels this message as {label} (confidence {_fmt_pct(sconf)}).{fp_block}
That score reflects how strongly the wording matches positive, neutral, or negative training patterns—not whether the deal will close.

2. Detected intent & response strategy
Intent (model): {intent_pretty}.
Playbook strategy: {str(strategy).replace("_", " ")} — use this to prioritize tone, depth, and whether to push for a decision or give space.

3. Interest score (0–100)
Score: {interest_score if interest_score is not None else "n/a"} — {_interest_band(interest_score)}.
This blends sentiment, intent family, and a sarcasm / “fake positivity” check when applicable.

4. Key signals from the text
Interest / warmth cues (keyword pass):
{_bullets(interest)}

Concrete asks or next-step language (keyword pass):
{_bullets(actions_req)}

5. Urgency
Level: {urg.get("level", "n/a")}.
Recommended response window: {urg.get("recommended_response_time", "n/a")}.
If urgency is high, prioritize a short acknowledgment plus a concrete follow-up time even before full answers.

6. Confidence breakdown
Sentiment model confidence: {_fmt_pct(conf.get("sentiment_confidence"))}.
Intent model confidence: {_fmt_pct(conf.get("intent_confidence"))}.
Blended overall confidence: {_fmt_pct(conf.get("overall_confidence"))}.
Lower intent confidence often means ambiguous wording—ask a clarifying question rather than assuming.

7. Risks & watchouts
{_risk_bullets(risks)}

8. Recommended next steps
{_bullets(rec)}

9. Suggested reply (template)
{reply or "—"}

10. Narrative summary
{summary or "—"}

---
Full original message (for reference):
{excerpt}
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
    risks=None,
    interest_score=None,
    fake_positive: bool = False,
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
            risks=risks,
            interest_score=interest_score,
            fake_positive=fake_positive,
        )

    prompt = f"""
Write a detailed "Communication Analysis Report" for a recruiter/client email thread. Use these exact headings:
1. Overall sentiment
2. Detected intent & response strategy
3. Interest score (0–100)
4. Key signals from the text
5. Urgency
6. Confidence breakdown
7. Risks & watchouts
8. Recommended next steps
9. Suggested reply
10. Narrative summary

Requirements:
- Use full sentences and 2–4 sentences per major section where it adds value (not one-line bullets only).
- Be specific to the message; reference concrete phrases or implications when possible.
- No JSON.

Message (may be truncated for the model):
{short_msg}

Structured inputs:
Sentiment: {sentiment}
Intent: {intent}
Strategy: {strategy}
Key Signals: {key_signals}
Confidence: {confidence_scores}
Urgency: {urgency}
Interest score (0–100): {interest_score}
Fake positivity flag: {fake_positive}
Risks: {risks}
Recommended Actions: {actions}
Summary: {summary}
Suggested Reply: {reply}
"""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

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
