"""Decode only newly generated tokens from model.generate() output (exclude the prompt)."""


def decode_new_tokens(tokenizer, sequences, input_ids) -> str:
    """
    sequences: LongTensor [batch, total_len] from model.generate
    input_ids: LongTensor [batch, prompt_len] fed into generate
    """
    if sequences is None or input_ids is None:
        return ""
    prompt_len = int(input_ids.shape[1])
    gen_ids = sequences[0, prompt_len:]
    return tokenizer.decode(gen_ids, skip_special_tokens=True).strip()


def compact_for_llm(text: str, max_chars: int) -> str:
    """
    Reduce token usage by normalizing whitespace and clipping long inputs.
    """
    cleaned = " ".join((text or "").split())
    if max_chars <= 0:
        return cleaned
    if len(cleaned) <= max_chars:
        return cleaned
    # Keep the start of the message where intent and asks are usually introduced.
    return cleaned[:max_chars].rstrip() + "..."
