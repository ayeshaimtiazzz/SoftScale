import torch


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
):
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
            max_new_tokens=600,
            temperature=0.2,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode text
    report_text = tokenizer.decode(output[0], skip_special_tokens=True)

    return report_text

