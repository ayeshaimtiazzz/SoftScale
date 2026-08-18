"""Helper functions for enhanced proposal prompt formatting.

This module provides utilities for creating descriptive proposals that:
- Highlight incoming options
- Follow proposal writing best practices
- Adhere to template, candidate, and project information
"""
from typing import Optional, Dict, Any, List


def format_enhanced_prompt(
    base_instruction: str,
    options: Optional[Dict[str, Any]] = None,
    template_info: Optional[Dict[str, Any]] = None,
    candidate_info: Optional[Dict[str, Any]] = None,
    project_info: Optional[Dict[str, Any]] = None,
    specifications: Optional[List[str]] = None,
    recipient_type: Optional[str] = None
) -> str:
    """
    Format an enhanced prompt that emphasizes highlighting options and best practices.

    Args:
        base_instruction: The base instruction/request
        options: Dictionary of options/choices to highlight (e.g., {"pricing": ["Basic", "Premium"]})
        template_info: Template information to adhere to
        candidate_info: Candidate/talent information to include
        project_info: Project/deal information to include
        specifications: Additional specifications (page_count, cover_page, etc.)

    Returns:
        Formatted prompt string
    """
    prompt_parts = []

    # Add template information if provided
    if template_info:
        prompt_parts.append("### TEMPLATE INFORMATION:")
        if template_info.get('title'):
            prompt_parts.append(f"Template: {template_info['title']}")
        if template_info.get('prompt'):
            prompt_parts.append(f"Template Context: {template_info['prompt']}")
        if template_info.get('domain'):
            prompt_parts.append(f"Domain: {template_info['domain']}")
        if template_info.get('category'):
            prompt_parts.append(f"Category: {template_info['category']}")
        prompt_parts.append("")  # Empty line

    # Add project/deal information if provided
    if project_info:
        prompt_parts.append("### PROJECT/DEAL INFORMATION:")
        for key, value in project_info.items():
            if value:  # Only add non-empty values
                formatted_key = key.replace('_', ' ').title()
                prompt_parts.append(f"{formatted_key}: {value}")
        prompt_parts.append("")  # Empty line

    # Add candidate/talent information if provided
    if candidate_info:
        prompt_parts.append("### CANDIDATE/TALENT INFORMATION:")
        for key, value in candidate_info.items():
            if value:  # Only add non-empty values
                formatted_key = key.replace('_', ' ').title()
                prompt_parts.append(f"{formatted_key}: {value}")
        prompt_parts.append("")  # Empty line

    # Add base instruction
    prompt_parts.append("### PROJECT REQUEST:")
    prompt_parts.append(base_instruction)
    prompt_parts.append("")

    # Add options to highlight if provided
    if options:
        prompt_parts.append("### AVAILABLE OPTIONS TO HIGHLIGHT:")
        for key, values in options.items():
            if isinstance(values, list):
                if values:  # Only add if list is not empty
                    values_str = ", ".join([f'"{v}"' for v in values])
                    prompt_parts.append(f"- {key.replace('_', ' ').title()}: {values_str}")
            elif values:  # Single value (string, number, etc.)
                prompt_parts.append(f"- {key.replace('_', ' ').title()}: {values}")
        prompt_parts.append("")

    # Add specifications if provided
    if specifications:
        prompt_parts.append("### SPECIFICATIONS:")
        for spec in specifications:
            prompt_parts.append(f"- {spec}")
        prompt_parts.append("")

    # Determine if this is an offer (to freelancer/job seeker) or a proposal
    is_offer = recipient_type in ["freelancer", "job_seeker", "jobseeker"]

    if is_offer:
        # Format as an offer letter/proposal
        prompt_parts.append("### OFFER LETTER BEST PRACTICES TO FOLLOW:")
        prompt_parts.append("1. **Personalized Opening**: Start with a warm, personalized greeting addressing the candidate by name")
        prompt_parts.append("2. **Why They're a Match**: Highlight specific skills, experience, or qualifications that make them an ideal fit")
        prompt_parts.append("3. **Opportunity Overview**: Clearly describe the job/project opportunity, including role, responsibilities, and impact")
        prompt_parts.append("4. **Company/Project Value**: Explain what makes this opportunity valuable and unique")
        prompt_parts.append("5. **Compensation & Benefits**: Include salary/rate, benefits, work model, and other perks if available")
        prompt_parts.append("6. **Next Steps**: Provide clear instructions on how to respond and what happens next")
        prompt_parts.append("7. **Professional Tone**: Maintain enthusiastic but professional language")
        prompt_parts.append("8. **Engaging Content**: Make it compelling and show genuine interest in the candidate")
        prompt_parts.append("9. **Call to Action**: End with a clear invitation to discuss or accept the offer")
        prompt_parts.append("10. **Match Score**: If available, mention the match score and why it indicates a strong fit")
        prompt_parts.append("")
        prompt_parts.append("### REQUIREMENTS:")
        prompt_parts.append("- Generate a personalized, professional offer letter/proposal")
        prompt_parts.append("- Format as an offer to a freelancer or job seeker, not a traditional business proposal")
        if candidate_info:
            prompt_parts.append("- Address the candidate by name and highlight their specific qualifications")
            if candidate_info.get("match_score"):
                prompt_parts.append("- Mention the match score and explain why they're a great fit")
        if project_info:
            prompt_parts.append("- Clearly describe the opportunity (job or project) and its benefits")
        prompt_parts.append("- Be enthusiastic and welcoming while remaining professional")
        prompt_parts.append("- Include clear next steps for the candidate to respond")
    else:
        # Format as a traditional proposal
        prompt_parts.append("### PROPOSAL BEST PRACTICES TO FOLLOW:")
        prompt_parts.append("1. **Clear Structure**: Use numbered sections and descriptive headings")
        prompt_parts.append("2. **Highlight Options**: Clearly present and compare available options/choices")
        prompt_parts.append("3. **Executive Summary**: Start with a compelling executive summary")
        prompt_parts.append("4. **Detailed Sections**: Include objectives, methodology, timeline, expected outcomes")
        prompt_parts.append("5. **Recommendations**: Provide clear recommendations with rationale")
        prompt_parts.append("6. **Professional Tone**: Maintain formal, polished business language")
        prompt_parts.append("7. **Actionable Details**: Include specific metrics, timelines, and deliverables")
        prompt_parts.append("8. **Visual Hierarchy**: Use formatting (bold, bullets, numbered lists) for clarity")
        prompt_parts.append("9. **Call to Action**: End with clear next steps and decision points")
        prompt_parts.append("10. **Comprehensive Coverage**: Address all aspects mentioned in the request")
        prompt_parts.append("")
        prompt_parts.append("### REQUIREMENTS:")
        prompt_parts.append("- Generate a detailed, professional proposal")
        if options:
            prompt_parts.append("- Highlight and compare all available options mentioned")
        if template_info:
            prompt_parts.append("- Adhere to the template structure and domain requirements")
        if candidate_info:
            prompt_parts.append("- Incorporate candidate/talent information appropriately")
        if project_info:
            prompt_parts.append("- Incorporate project/deal information appropriately")
        prompt_parts.append("- Follow industry best practices for proposal writing")
        prompt_parts.append("- Include realistic details, metrics, and timelines")
        prompt_parts.append("- Make it compelling and persuasive while remaining professional")

    return "\n".join(prompt_parts)


def extract_options_from_request(request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract options from request data.

    Args:
        request_data: Request dictionary that may contain 'options' or 'custom_options'

    Returns:
        Dictionary of options or None
    """
    # Check for 'options' or 'custom_options' key
    options = request_data.get('options') or request_data.get('custom_options')

    if options:
        if isinstance(options, dict):
            return options
        elif isinstance(options, str):
            # Try to parse as JSON
            try:
                import json
                return json.loads(options)
            except:
                return None

    return None


def build_template_info(template_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Build template information dictionary from template_id.

    Args:
        template_id: Optional template ID

    Returns:
        Template info dictionary or None
    """
    if not template_id:
        return None

    try:
        from data.proposal_repository import ProposalRepository
        template = ProposalRepository.get_template_by_id(template_id)
        if template:
            return {
                'title': template.get('title'),
                'prompt': template.get('prompt'),
                'domain': template.get('domain'),
                'category': template.get('category'),
                'description': template.get('description'),
                'tone': template.get('tone'),
                'complexity': template.get('complexity')
            }
    except Exception as e:
        print(f"[PROMPT_HELPER] Error fetching template: {e}")

    return None


def build_project_info_from_deal(deal: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build project information dictionary from deal data.

    Args:
        deal: Deal dictionary

    Returns:
        Project info dictionary
    """
    project_info = {}

    if deal.get('deal_title'):
        project_info['project_title'] = deal['deal_title']
    if deal.get('description'):
        project_info['project_description'] = deal['description']
    if deal.get('company_name'):
        project_info['company_name'] = deal['company_name']
    if deal.get('value'):
        project_info['budget'] = f"${deal['value']:,.2f}"
    if deal.get('expected_close_date'):
        project_info['expected_start_date'] = deal['expected_close_date']
    if deal.get('stage'):
        project_info['project_stage'] = deal['stage']
    if deal.get('lead_source'):
        project_info['lead_source'] = deal['lead_source']
    # Add related IDs to determine recipient type
    if deal.get('related_job_id'):
        project_info['related_job_id'] = deal['related_job_id']
    if deal.get('related_project_id'):
        project_info['related_project_id'] = deal['related_project_id']
    if deal.get('work_model'):
        project_info['work_model'] = deal['work_model']
    elif deal.get('work_mode'):
        project_info['work_model'] = deal['work_mode']

    return project_info


def build_candidate_info_from_match(
    talent_name: str,
    talent_id: Optional[str] = None,
    skills: Optional[str] = None,
    experience: Optional[str] = None,
    match_score: Optional[float] = None
) -> Dict[str, Any]:
    """
    Build candidate information dictionary from match data.

    Args:
        talent_name: Name of the talent
        talent_id: ID of the talent
        skills: Skills of the talent
        experience: Experience of the talent
        match_score: Match score percentage

    Returns:
        Candidate info dictionary
    """
    candidate_info = {
        'talent_name': talent_name
    }

    if talent_id:
        candidate_info['talent_id'] = talent_id
    if skills:
        candidate_info['skills'] = skills
    if experience:
        candidate_info['experience'] = experience
    if match_score is not None:
        candidate_info['match_score'] = f"{match_score}%"

    return candidate_info


def build_candidate_info_from_deal(deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Build candidate information dictionary from deal data.

    Args:
        deal: Deal dictionary

    Returns:
        Candidate info dictionary or None
    """
    if not deal.get('talent_name'):
        return None

    candidate_info = {
        'talent_name': deal['talent_name']
    }

    if deal.get('talent_id'):
        candidate_info['talent_id'] = deal['talent_id']
    if deal.get('skills'):
        candidate_info['skills'] = deal['skills']
    if deal.get('experience'):
        candidate_info['experience'] = deal['experience']
    if deal.get('match_score'):
        candidate_info['match_score'] = f"{deal['match_score']}%"

    return candidate_info

