import torch


# -------------------------
# Email reply generator
# -------------------------
def generate_reply(model, tokenizer, strategy: str, original_msg: str, intent_label: str) -> str:
    prompt = f"""[INST]
    You are an AI messaging assistant acting strictly as the message RECIPIENT.

    Intent of sender: {intent_label}
    Response strategy: {strategy}

    Original email:
    \"\"\"{original_msg}\"\"\" 

    Write a professional reply (3–5 sentences):
    - Do NOT repeat or paraphrase the sender
    - Maintain a calm, respectful tone
    - Do not pressure or sound impatient
    - End with a professional closing
    - it is not an email just write the message
    [/INST]
    """
    # Tokenize and move inputs to model device
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    # Generate reply
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=150,
            temperature=0.5,
            top_p=0.9,
            do_sample=True,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode output
    reply = tokenizer.decode(output[0], skip_special_tokens=True)

    # Remove prompt from output
    reply = reply.replace(prompt, "").strip()
    return reply

