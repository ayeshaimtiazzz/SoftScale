def choose_strategy(intent: str, interest: int, fake_positivity: bool) -> str:
    """
    Decide the candidate's response strategy based on recruiter intent.

    Args:
        intent (str): Detected recruiter intent
        interest (float): Interest score (0–100)
        fake_positivity (bool): Whether polite but misleading positivity is detected

    Returns:
        str: Candidate action strategy
    """

    STRATEGY_MAP = {
        "strong_interest": "advance_to_next_step",
        "soft_interest": (
            "ask_for_clarification"
            if fake_positivity
            else "express_interest_and_follow_up"
        ),
        "stalling": "wait_then_follow_up" if interest >= 35 else "wait_for_update",
        "polite_rejection": "close_conversation_politely",
        "clarification_request": "provide_requested_information",
        "portfolio_request": "send_portfolio_or_work_samples",
        "interview_invitation": "schedule_interview",
        "internal_review": "wait_for_internal_update",
        "negotiation_discussion": "prepare_for_negotiation",
        "availability_check": "confirm_availability",
    }

    return STRATEGY_MAP.get(intent, "wait_for_update")

