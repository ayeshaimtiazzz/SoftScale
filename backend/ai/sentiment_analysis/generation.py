import torch

from config import settings
from ai.sentiment_analysis.llm_decode import decode_new_tokens


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

    # Greedy decoding in fast mode is quicker than sampling for similar quality at short lengths.
    use_sample = not settings.SENTIMENT_FAST_MODE
    gen_kwargs = {
        **inputs,
        "max_new_tokens": settings.SENTIMENT_REPLY_MAX_TOKENS,
        "repetition_penalty": 1.1,
        "pad_token_id": tokenizer.eos_token_id,
    }
    if use_sample:
        gen_kwargs.update({"temperature": 0.5, "top_p": 0.9, "do_sample": True})
    else:
        gen_kwargs.update({"temperature": 0.2, "do_sample": False})

    with torch.no_grad():
        output = model.generate(**gen_kwargs)

    reply = decode_new_tokens(tokenizer, output, inputs["input_ids"])
    # Strip common instruction-template leakage if the model echoes it
    for prefix in ("[/INST]", "[INST]", "Assistant:", "assistant:"):
        if reply.lower().startswith(prefix.lower()):
            reply = reply[len(prefix) :].strip()
    return reply

