import random


def recommend_actions(message, intent, interest_score, urgency):
    # Base actions per intent
    base_actions = {
        "availability_check": [
            "Reply confirming your availability",
            "Provide alternative dates if necessary",
            "Update your calendar accordingly",
            "Offer a quick call to clarify availability",
            "Mention any scheduling conflicts upfront",
        ],
        "clarification_request": [
            "Provide clear examples or details requested",
            "Reference previous projects or experience",
            "Ask clarifying questions if needed",
            "Ensure all requested documents are included",
            "Summarize your explanation for clarity",
        ],
        "internal_review": [
            "Follow up internally for required approvals",
            "Check previous communications for consistency",
            "Prepare any supporting documents",
            "Ensure all stakeholders are informed",
            "Document any feedback received",
        ],
        "interview_invitation": [
            "Confirm interview schedule",
            "Review job description and company details",
            "Prepare for likely interview questions",
            "Research the interviewer if possible",
            "Practice key talking points",
        ],
        "negotiation_discussion": [
            "Review your requirements and expectations",
            "Draft a negotiation proposal",
            "Consult with mentors or peers if needed",
            "Identify trade-offs you can accept",
            "Prepare supporting justifications for your requests",
        ],
        "polite_rejection": [
            "Acknowledge politely",
            "Thank them for their time",
            "Keep the door open for future opportunities",
            "Respond professionally to maintain relationships",
            "Document the rejection for reference",
        ],
        "portfolio_request": [
            "Share relevant portfolio or work samples",
            "Highlight your key achievements",
            "Ensure links or attachments are accessible",
            "Customize portfolio to the recruiter’s needs",
            "Provide a short explanation for each example",
        ],
        "soft_interest": [
            "Acknowledge interest and ask for next steps",
            "Provide additional information if requested",
            "Stay engaged and responsive",
            "Express curiosity about the role",
            "Offer to provide more details or examples",
        ],
        "stalling": [
            "Send a gentle follow-up",
            "Check if additional information is needed",
            "Keep communication professional and polite",
            "Reiterate your availability for next steps",
            "Offer alternative times or formats for discussion",
        ],
        "strong_interest": [
            "Express enthusiasm and commitment",
            "Ask about next steps or timelines",
            "Highlight relevant skills or experience",
            "Offer to provide additional work samples or references",
            "Reiterate readiness to engage promptly",
        ],
    }

    # Urgency modifiers
    urgency_modifiers = {
        "high": [
            "Respond as soon as possible",
            "Prioritize this message",
            "Set reminders for immediate action",
            "Flag this for urgent attention",
        ],
        "medium": [
            "Respond in a timely manner",
            "Schedule a response within 24-48 hours",
            "Plan your response today",
            "Ensure your response is complete and professional",
        ],
        "low": [
            "Respond when convenient",
            "Note for follow-up later",
            "Can wait a few days",
            "Document for future reference",
        ],
    }

    # Interest score modifiers
    score_modifiers = []
    if interest_score >= 75:  # high interest
        score_modifiers = [
            "Highlight your strengths and achievements",
            "Offer additional insights proactively",
            "Show enthusiasm and motivation",
        ]
    elif interest_score >= 40:  # medium interest
        score_modifiers = [
            "Provide requested information clearly",
            "Keep tone professional and precise",
        ]
    else:  # low interest
        score_modifiers = [
            "Acknowledge and respond politely",
            "Keep response short and professional",
        ]

    # Select actions
    actions = []
    base_list = base_actions.get(intent, ["Respond professionally"])
    actions += random.sample(base_list, min(3, len(base_list)))

    urgency_list = urgency_modifiers.get(urgency, ["Respond timely"])
    actions += random.sample(urgency_list, min(2, len(urgency_list)))

    actions += random.sample(score_modifiers, min(1, len(score_modifiers)))

    # Shuffle final actions so it's different each time
    random.shuffle(actions)

    return {"Recommended_actions": actions}

