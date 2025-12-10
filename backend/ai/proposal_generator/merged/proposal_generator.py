"""Production-ready proposal generator.

Generates professional proposals that respect:
- Template selection and structure
- Custom options
- Project title and formalities
- Tone (Professional, Casual, Persuasive, Formal)
- Page length requirements
- Detail level (detailed or summarized)
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import re
from ai.proposal_generator.merged.domain_templates import (
    get_domain_specific_structure,
    get_strict_requirements
)


def generate_proposal(
    prompt: str,
    tone: str = "Professional",
    custom_options: Optional[Dict[str, Any]] = None,
    project_info: Optional[Dict[str, Any]] = None,
    candidate_info: Optional[Dict[str, Any]] = None,
    template_info: Optional[Dict[str, Any]] = None,
    detail_level: str = "detailed",
    page_count: Optional[str] = None,
    cover_page: Optional[str] = "without",
    sender_type: Optional[str] = None,
    sender_name: Optional[str] = None,
    format_type: str = "html"
) -> str:
    """
    Generate a professional proposal that adheres to all specified parameters.

    Args:
        prompt: The user's proposal request
        tone: Desired tone (Professional, Casual, Persuasive, Formal)
        custom_options: Custom options to highlight (e.g., {"pricing": ["Basic", "Premium"]})
        project_info: Project/deal information (title, description, budget, etc.)
        candidate_info: Candidate/talent information (name, skills, experience, etc.)
        template_info: Template information (title, domain, category, structure)
        detail_level: Level of detail ("detailed" or "summarized")
        page_count: Page count requirement (e.g., "1-page", "2-page", "3-page")
        cover_page: Whether to include cover page ("with" or "without")
        sender_type: Type of sender ("company_admin", "job_seeker", "freelancer", or None)
        sender_name: Name of the sender (optional)
        format_type: Output format ("html" or "text")

    Returns:
        Generated proposal text formatted according to all parameters (HTML or plain text)
    """
    # Extract project title from various sources
    project_title = _extract_project_title(prompt, project_info, template_info)

    # Extract key information
    project_type = _extract_project_type(prompt, project_info, template_info)
    industry = _extract_industry(prompt, project_info, template_info)

    # Determine target length based on page_count
    target_length = _calculate_target_length(page_count, detail_level)

    # Build proposal sections based on template, domain, or default
    # Use domain-specific structure from fine-tuning instructions
    sections = _build_proposal_structure(template_info, project_title, industry)

    # Executive Summary
    exec_summary_key = None
    for key in sections.keys():
        if "executive" in key.lower() and "summary" in key.lower():
            exec_summary_key = key
            break

    if exec_summary_key:
        summary = _generate_executive_summary(
            prompt, project_title, project_type, industry,
            project_info, candidate_info, template_info, tone, detail_level
        )
        sections[exec_summary_key] = summary

    # Objectives (handle "Objectives", "Objectives / Goals", etc.)
    objectives_key = None
    for key in sections.keys():
        if "objective" in key.lower() or ("goal" in key.lower() and "objective" not in key.lower()):
            objectives_key = key
            break

    if objectives_key:
        objectives = _generate_objectives(
            prompt, project_info, custom_options, template_info, detail_level
        )
        sections[objectives_key] = objectives

    # Methodology (or "Proposed Methodology / Approach", "Proposed Solution / Approach", etc.)
    methodology_key = None
    for key in sections.keys():
        if "methodology" in key.lower() or "approach" in key.lower() or "solution" in key.lower():
            methodology_key = key
            break

    if methodology_key:
        methodology = _generate_methodology(
            project_type, detail_level, template_info, target_length, industry
        )
        sections[methodology_key] = methodology

    # Timeline (handle "Timeline", "Timeline / Milestones", "Implementation Plan / Timeline", etc.)
    timeline_key = None
    for key in sections.keys():
        if "timeline" in key.lower() or ("milestone" in key.lower() and "timeline" not in key.lower()):
            timeline_key = key
            break

    if timeline_key:
        timeline = _generate_timeline(
            project_type, detail_level, project_info, target_length
        )
        sections[timeline_key] = timeline

    # Expected Outcomes (handle "Expected Outcomes", "Expected Outcomes / Impact", etc.)
    outcomes_key = None
    for key in sections.keys():
        if "outcome" in key.lower() or ("impact" in key.lower() and "outcome" not in key.lower()):
            outcomes_key = key
            break

    if outcomes_key:
        outcomes = _generate_outcomes(
            project_type, project_info, template_info, custom_options
        )
        sections[outcomes_key] = outcomes

    # Recommendations (handle "Recommendations", "Summary & Recommendations", "Conclusion & Recommendations", etc.)
    recommendations_key = None
    for key in sections.keys():
        if "recommendation" in key.lower() or ("conclusion" in key.lower() and "recommendation" not in key.lower()) or ("summary" in key.lower() and "recommendation" not in key.lower() and "call" in key.lower()):
            recommendations_key = key
            break

    if recommendations_key:
        recommendations = _generate_recommendations(
            prompt, custom_options, tone, template_info, project_info
        )
        sections[recommendations_key] = recommendations

    # Generate domain-specific sections based on fine-tuning templates
    _generate_domain_specific_sections(sections, project_info, template_info, industry, prompt, project_type, custom_options)

    # Build final proposal
    proposal = _assemble_proposal(
        sections, template_info, project_title, tone,
        cover_page, project_info, sender_type, sender_name, format_type, candidate_info
    )

    # Strictly enforce page length and detail level
    proposal = _adjust_proposal_length_strict(proposal, target_length, detail_level)

    # Apply tone adjustments
    proposal = _apply_tone(proposal, tone)

    if format_type == "text":
        # Ensure no HTML tags in text format - convert to clean markdown
        from ai.proposal_generator.merged.utils import strip_html_tags
        # First strip all HTML tags
        proposal = strip_html_tags(proposal)
        # Convert any remaining markdown-style formatting to plain text
        proposal = re.sub(r'\*\*(.*?)\*\*', r'\1', proposal)  # Remove bold markers
        proposal = re.sub(r'\*(.*?)\*', r'\1', proposal)  # Remove italic markers
        # Ensure markdown headings are preserved
        proposal = re.sub(r'^# (.+)$', r'## \1', proposal, flags=re.MULTILINE)  # Convert H1 to H2
        return proposal
    return proposal


def _extract_project_title(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]]
) -> str:
    """Extract project title from various sources."""
    if project_info and project_info.get("title"):
        return project_info["title"]
    if project_info and project_info.get("project_title"):
        return project_info["project_title"]
    if project_info and project_info.get("deal_title"):
        return project_info["deal_title"]
    if template_info and template_info.get("title"):
        return template_info["title"]

    # Extract from prompt
    prompt_lower = prompt.lower()
    if "proposal for" in prompt_lower:
        parts = prompt.split("proposal for", 1)
        if len(parts) > 1:
            title = parts[1].strip().split(".")[0].split("\n")[0]
            if len(title) < 100:
                return title

    return None


def _extract_project_type(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]]
) -> str:
    """Extract project type from prompt, project info, or template."""
    # Check template first
    if template_info:
        domain = template_info.get("domain", "").lower()
        category = template_info.get("category", "").lower()
        if "mobile" in domain or "mobile" in category:
            return "mobile_app"
        if "web" in domain or "web" in category:
            return "web_platform"
        if "ecommerce" in domain or "e-commerce" in domain:
            return "ecommerce"

    # Check project info
    if project_info:
        description = (project_info.get("description") or "").lower()
        title = (project_info.get("title") or project_info.get("project_title") or "").lower()
        combined = f"{title} {description}"

        if any(word in combined for word in ["mobile", "app", "application"]):
            return "mobile_app"
        if any(word in combined for word in ["web", "website", "platform"]):
            return "web_platform"
        if any(word in combined for word in ["e-commerce", "ecommerce", "online store", "shop"]):
            return "ecommerce"
        if any(word in combined for word in ["ai", "machine learning", "ml", "artificial intelligence"]):
            return "ai_ml"
        if any(word in combined for word in ["consulting", "advisory", "consultation"]):
            return "consulting"

    # Check prompt
    prompt_lower = prompt.lower()
    if any(word in prompt_lower for word in ["mobile", "app", "application"]):
        return "mobile_app"
    if any(word in prompt_lower for word in ["web", "website", "platform"]):
        return "web_platform"
    if any(word in prompt_lower for word in ["e-commerce", "ecommerce", "online store"]):
        return "ecommerce"
    if any(word in prompt_lower for word in ["ai", "machine learning", "ml"]):
        return "ai_ml"
    if any(word in prompt_lower for word in ["consulting", "advisory"]):
        return "consulting"
    if any(word in prompt_lower for word in ["software", "system", "solution"]):
        return "software_solution"

    return "general"


def _extract_industry(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]]
) -> str:
    """Extract industry from various sources."""
    if project_info and project_info.get("industry"):
        return project_info["industry"]

    if template_info:
        domain = template_info.get("domain", "").lower()
        if any(word in domain for word in ["health", "medical"]):
            return "healthcare"
        if any(word in domain for word in ["finance", "banking", "fintech"]):
            return "finance"
        if any(word in domain for word in ["retail", "ecommerce"]):
            return "retail"
        if any(word in domain for word in ["education", "learning"]):
            return "education"

    prompt_lower = prompt.lower()
    industries = {
        "healthcare": ["health", "medical", "hospital", "clinic", "patient"],
        "finance": ["finance", "banking", "fintech", "payment", "financial"],
        "retail": ["retail", "store", "shopping", "merchant"],
        "education": ["education", "learning", "school", "university", "student"],
        "technology": ["tech", "software", "saas", "technology"],
        "manufacturing": ["manufacturing", "production", "factory"]
    }

    for industry, keywords in industries.items():
        if any(keyword in prompt_lower for keyword in keywords):
            return industry

    return "general"


def _calculate_target_length(page_count: Optional[str], detail_level: str) -> int:
    """Calculate target character length based on page_count and detail_level."""
    # Base: ~500 words per page, ~5 characters per word = ~2500 chars per page
    base_chars_per_page = 2500

    if not page_count:
        # Default based on detail level
        if detail_level == "detailed":
            return base_chars_per_page * 3  # ~3 pages
        else:
            return base_chars_per_page * 1  # ~1 page

    # Extract number from page_count (e.g., "1-page" -> 1, "2-page" -> 2)
    page_num = 1
    if page_count:
        match = re.search(r'(\d+)', page_count)
        if match:
            page_num = int(match.group(1))

    target = base_chars_per_page * page_num

    # Adjust for detail level
    if detail_level == "summarized":
        target = int(target * 0.6)  # 40% shorter for summarized
    elif detail_level == "detailed":
        target = int(target * 1.2)  # 20% longer for detailed

    return target


def _build_proposal_structure(
    template_info: Optional[Dict[str, Any]],
    project_title: Optional[str],
    industry: Optional[str] = None
) -> Dict[str, str]:
    """Build proposal structure based on template, domain, or default."""
    sections = {}

    # First, check if template has explicit structure
    if template_info and template_info.get("structure"):
        structure = template_info["structure"]
        if isinstance(structure, list):
            for section in structure:
                sections[section] = ""
        elif isinstance(structure, dict):
            sections = structure

    # If no explicit structure, use domain-specific structure
    if not sections:
        domain = None
        if template_info:
            domain = template_info.get("domain") or template_info.get("category")
        if not domain and industry:
            # Map industry to domain
            industry_lower = industry.lower()
            if industry_lower in ["education", "learning"]:
                domain = "education"
            elif industry_lower in ["healthcare", "health", "medical"]:
                domain = "healthcare"
            elif industry_lower in ["construction", "building"]:
                domain = "construction"
            elif industry_lower in ["business", "finance", "retail"]:
                domain = "business"

        sections = get_domain_specific_structure(domain)

    # If still no sections, use default
    if not sections:
        sections = {
            "Executive Summary": "",
            "Objectives": "",
            "Methodology": "",
            "Timeline": "",
            "Expected Outcomes": "",
            "Recommendations": ""
        }

    return sections


def _generate_executive_summary(
    prompt: str,
    project_title: Optional[str],
    project_type: str,
    industry: str,
    project_info: Optional[Dict[str, Any]],
    candidate_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]],
    tone: str,
    detail_level: str = "detailed"
) -> str:
    """Generate executive summary."""
    lines = []

    # Opening line with project title
    if project_title:
        lines.append(f"This proposal outlines a comprehensive approach to **{project_title}**.")
    else:
        project_desc = _get_project_description(project_type)
        lines.append(f"This proposal outlines a comprehensive approach to {project_desc}.")

    lines.append("")

    # Add project context
    if project_info:
        if project_info.get("description"):
            lines.append(f"**Project Overview:** {project_info['description']}")
        if project_info.get("budget") or project_info.get("value"):
            budget = project_info.get("budget") or project_info.get("value")
            if isinstance(budget, (int, float)):
                lines.append(f"**Budget Consideration:** ${budget:,.2f}")
            else:
                lines.append(f"**Budget Consideration:** {budget}")
        if project_info.get("company_name"):
            lines.append(f"**Client:** {project_info['company_name']}")
        if project_info.get("expected_close_date") or project_info.get("start_date"):
            date = project_info.get("expected_close_date") or project_info.get("start_date")
            lines.append(f"**Target Start Date:** {date}")

    # Add candidate/talent info
    if candidate_info:
        if candidate_info.get("name"):
            lines.append(f"**Proposed Team Lead:** {candidate_info['name']}")
        if candidate_info.get("skills"):
            skills = candidate_info['skills']
            if isinstance(skills, list):
                skills_str = ", ".join(skills[:5])
            else:
                skills_str = str(skills)
            lines.append(f"**Key Expertise:** {skills_str}")
        if candidate_info.get("experience"):
            lines.append(f"**Experience:** {candidate_info['experience']}")
        if candidate_info.get("match_score"):
            lines.append(f"**Match Score:** {candidate_info['match_score']}%")

    # Value proposition
    lines.append("")
    if template_info and template_info.get("prompt"):
        # Use template context if available
        lines.append(template_info["prompt"])
    else:
        lines.append("Our approach combines industry best practices with innovative solutions to deliver measurable results and exceptional value.")

    return "\n".join(lines)


def _generate_objectives(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    custom_options: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]],
    detail_level: str
) -> str:
    """Generate objectives section."""
    objectives = []

    # Base objectives based on project type
    project_type = _extract_project_type(prompt, project_info, template_info)

    base_objectives = {
        "mobile_app": [
            "Develop a user-friendly mobile application with intuitive navigation",
            "Ensure cross-platform compatibility (iOS and Android)",
            "Implement robust security measures and data protection",
            "Deliver scalable architecture to support future growth"
        ],
        "web_platform": [
            "Create a responsive and accessible web platform",
            "Ensure optimal performance and fast load times",
            "Implement modern UI/UX design principles",
            "Establish secure and reliable infrastructure"
        ],
        "ecommerce": [
            "Build a seamless online shopping experience",
            "Implement secure payment processing",
            "Optimize for search engines and conversion rates",
            "Ensure mobile responsiveness and accessibility"
        ],
        "software_solution": [
            "Deliver a robust and scalable software solution",
            "Ensure seamless integration with existing systems",
            "Implement comprehensive testing and quality assurance",
            "Provide ongoing support and maintenance"
        ],
        "ai_ml": [
            "Develop intelligent solutions using cutting-edge AI/ML technologies",
            "Ensure accurate and reliable model performance",
            "Implement ethical AI practices and data privacy",
            "Deliver actionable insights and automation capabilities"
        ],
        "consulting": [
            "Provide expert analysis and strategic recommendations",
            "Deliver actionable insights tailored to your needs",
            "Ensure clear communication and regular progress updates",
            "Support implementation and change management"
        ],
        "general": [
            "Deliver high-quality solutions that meet your requirements",
            "Ensure timely delivery within budget constraints",
            "Provide exceptional value and return on investment",
            "Establish a strong foundation for future growth"
        ]
    }

    objectives.extend(base_objectives.get(project_type, base_objectives["general"]))

    # Add custom options as objectives
    if custom_options:
        if "features" in custom_options:
            features = custom_options["features"]
            if isinstance(features, list):
                for feature in features[:3]:
                    objectives.append(f"Incorporate {feature} functionality")
        if "requirements" in custom_options:
            reqs = custom_options["requirements"]
            if isinstance(reqs, list):
                for req in reqs[:3]:
                    objectives.append(f"Address {req}")
        if "goals" in custom_options:
            goals = custom_options["goals"]
            if isinstance(goals, list):
                objectives.extend(goals[:3])

    # Limit based on detail level
    max_objectives = 8 if detail_level == "detailed" else 4
    objectives = objectives[:max_objectives]

    # Format as bullet points
    return "\n".join(f"- {obj}" for obj in objectives)


def _generate_methodology(
    project_type: str,
    detail_level: str,
    template_info: Optional[Dict[str, Any]],
    target_length: int,
    industry: Optional[str] = None
) -> str:
    """Generate methodology section following fine-tuning requirements."""
    lines = []

    if detail_level == "detailed":
        # Vary the opening to avoid repetition (strict requirement)
        methodology_intros = [
            "Our methodology follows industry best practices and is structured into distinct phases:",
            "The proposed approach is organized into well-defined phases, each designed to ensure successful execution:",
            "We will implement a structured methodology comprising multiple phases, each with specific deliverables and milestones:"
        ]
        # Use hash for consistent selection based on project type
        intro_index = hash(project_type) % len(methodology_intros)
        lines.append(methodology_intros[intro_index])
        lines.append("")

        phases = {
            "mobile_app": [
                ("Phase 1: Discovery & Planning", "Requirements gathering, user research, and technical architecture design"),
                ("Phase 2: Design & Prototyping", "UI/UX design, wireframing, and interactive prototypes"),
                ("Phase 3: Development", "Agile development with regular sprints and testing"),
                ("Phase 4: Testing & Quality Assurance", "Comprehensive testing including unit, integration, and user acceptance testing"),
                ("Phase 5: Deployment & Launch", "App store submission, deployment, and launch support"),
                ("Phase 6: Maintenance & Support", "Ongoing updates, bug fixes, and feature enhancements")
            ],
            "web_platform": [
                ("Phase 1: Requirements Analysis", "Stakeholder interviews, requirement documentation, and technical specifications"),
                ("Phase 2: Design & Architecture", "System architecture, database design, and UI/UX mockups"),
                ("Phase 3: Development", "Iterative development with continuous integration and testing"),
                ("Phase 4: Testing & Optimization", "Performance testing, security audits, and optimization"),
                ("Phase 5: Deployment", "Infrastructure setup, deployment, and go-live support"),
                ("Phase 6: Monitoring & Maintenance", "Performance monitoring, updates, and continuous improvement")
            ],
            "ecommerce": [
                ("Phase 1: Market Research & Strategy", "Competitive analysis, target audience research, and business strategy"),
                ("Phase 2: Platform Design", "User experience design, product catalog structure, and checkout flow"),
                ("Phase 3: Development & Integration", "Platform development, payment gateway integration, and inventory management"),
                ("Phase 4: Testing & Security", "Security audits, payment testing, and user acceptance testing"),
                ("Phase 5: Launch & Marketing", "Soft launch, marketing campaigns, and analytics setup"),
                ("Phase 6: Optimization & Growth", "Performance optimization, A/B testing, and feature expansion")
            ]
        }

        project_phases = phases.get(project_type, [
            ("Phase 1: Discovery", "Understanding requirements and objectives"),
            ("Phase 2: Planning", "Detailed planning and resource allocation"),
            ("Phase 3: Execution", "Implementation and development"),
            ("Phase 4: Testing", "Quality assurance and validation"),
            ("Phase 5: Deployment", "Launch and go-live support"),
            ("Phase 6: Support", "Ongoing maintenance and optimization")
        ])

        # Adjust number of phases based on target length
        if target_length < 3000:
            project_phases = project_phases[:4]  # Fewer phases for shorter proposals

        for phase_name, phase_desc in project_phases:
            lines.append(f"**{phase_name}**")
            lines.append(f"{phase_desc}")
            lines.append("")
    else:
        lines.append("Our approach follows a structured methodology:")
        lines.append("- Discovery and requirements gathering")
        lines.append("- Planning and design")
        lines.append("- Development and implementation")
        lines.append("- Testing and quality assurance")
        lines.append("- Deployment and launch")
        lines.append("- Ongoing support and optimization")

    return "\n".join(lines)


def _generate_timeline(
    project_type: str,
    detail_level: str,
    project_info: Optional[Dict[str, Any]],
    target_length: int
) -> str:
    """Generate timeline section."""
    lines = []

    # Estimate timeline based on project type
    timelines = {
        "mobile_app": (8, 12),
        "web_platform": (6, 10),
        "ecommerce": (10, 16),
        "software_solution": (12, 20),
        "ai_ml": (16, 24),
        "consulting": (4, 8),
        "general": (8, 12)
    }

    min_weeks, max_weeks = timelines.get(project_type, (8, 12))

    # Adjust based on project info if available
    if project_info and project_info.get("expected_duration"):
        duration = project_info["expected_duration"]
        if isinstance(duration, str) and "week" in duration.lower():
            match = re.search(r'(\d+)', duration)
            if match:
                min_weeks = max_weeks = int(match.group(1))

    start_date = datetime.now() + timedelta(weeks=1)

    lines.append(f"**Estimated Timeline: {min_weeks}-{max_weeks} weeks**")
    lines.append("")

    if detail_level == "detailed" and target_length > 2000:
        milestones = [
            ("Week 1-2", "Discovery & Planning", start_date + timedelta(weeks=2)),
            ("Week 3-4", "Design & Architecture", start_date + timedelta(weeks=4)),
            (f"Week 5-{min_weeks-2}", "Development", start_date + timedelta(weeks=min_weeks-2)),
            (f"Week {min_weeks-1}-{min_weeks}", "Testing & QA", start_date + timedelta(weeks=min_weeks)),
            (f"Week {min_weeks+1}", "Deployment & Launch", start_date + timedelta(weeks=min_weeks+1))
        ]

        lines.append("Key milestones:")
        for period, milestone, date in milestones:
            date_str = date.strftime("%B %d, %Y")
            lines.append(f"- **{period}**: {milestone} (Target: {date_str})")
    else:
        lines.append("Key milestones:")
        lines.append(f"- Discovery & Planning: Week 1-2")
        lines.append(f"- Development: Week 3-{min_weeks-2}")
        lines.append(f"- Testing & QA: Week {min_weeks-1}-{min_weeks}")
        lines.append(f"- Launch: Week {min_weeks+1}")

    lines.append("")
    lines.append("*Note: Timeline may vary based on project complexity and client feedback cycles.*")

    return "\n".join(lines)


def _generate_outcomes(
    project_type: str,
    project_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]],
    custom_options: Optional[Dict[str, Any]]
) -> str:
    """Generate expected outcomes section."""
    lines = []

    outcomes_map = {
        "mobile_app": [
            "Increased user engagement and retention",
            "Improved user experience and satisfaction scores",
            "Enhanced brand presence in mobile marketplaces",
            "Scalable platform ready for future feature expansion"
        ],
        "web_platform": [
            "Improved user experience and conversion rates",
            "Enhanced system performance and reliability",
            "Better data insights and analytics capabilities",
            "Streamlined business processes and operations"
        ],
        "ecommerce": [
            "Increased online sales and revenue",
            "Improved customer satisfaction and retention",
            "Enhanced brand visibility and market presence",
            "Optimized operations and reduced costs"
        ],
        "software_solution": [
            "Improved operational efficiency",
            "Reduced manual processes and errors",
            "Better data management and insights",
            "Enhanced scalability and future readiness"
        ],
        "ai_ml": [
            "Automated decision-making and processes",
            "Improved accuracy and efficiency",
            "Data-driven insights and predictions",
            "Competitive advantage through innovation"
        ],
        "consulting": [
            "Clear strategic direction and roadmap",
            "Improved decision-making capabilities",
            "Enhanced organizational efficiency",
            "Measurable business improvements"
        ],
        "general": [
            "Successful project delivery within scope and budget",
            "Improved business outcomes and ROI",
            "Enhanced capabilities and competitive advantage",
            "Strong foundation for future growth"
        ]
    }

    outcomes = outcomes_map.get(project_type, outcomes_map["general"])

    lines.append("Expected outcomes include:")
    for outcome in outcomes:
        lines.append(f"- {outcome}")

    # Add custom outcomes if provided
    if custom_options and "expected_outcomes" in custom_options:
        custom_outcomes = custom_options["expected_outcomes"]
        if isinstance(custom_outcomes, list):
            lines.append("")
            lines.append("Additional expected outcomes:")
            for outcome in custom_outcomes[:3]:
                lines.append(f"- {outcome}")

    if project_info and project_info.get("expected_results"):
        lines.append("")
        lines.append(f"**Additional Expected Results:** {project_info['expected_results']}")

    return "\n".join(lines)


def _generate_recommendations(
    prompt: str,
    custom_options: Optional[Dict[str, Any]],
    tone: str,
    template_info: Optional[Dict[str, Any]],
    project_info: Optional[Dict[str, Any]]
) -> str:
    """Generate recommendations section."""
    lines = []

    lines.append("Based on our analysis and industry best practices, we recommend:")
    lines.append("")
    lines.append("1. **Immediate Next Steps**:")
    lines.append("   - Schedule a detailed requirements review session")
    lines.append("   - Finalize project scope and timeline")
    lines.append("   - Establish communication protocols and project governance")
    lines.append("")
    lines.append("2. **Key Considerations**:")
    lines.append("   - Ensure stakeholder alignment and buy-in")
    lines.append("   - Allocate appropriate resources and budget")
    lines.append("   - Plan for change management and user adoption")
    lines.append("")
    lines.append("3. **Success Factors**:")
    lines.append("   - Clear communication and regular progress updates")
    lines.append("   - Flexibility to adapt to changing requirements")
    lines.append("   - Focus on delivering value incrementally")

    # Add custom options as recommendations
    if custom_options:
        if "pricing" in custom_options:
            lines.append("")
            lines.append("4. **Pricing Options**:")
            pricing = custom_options["pricing"]
            if isinstance(pricing, list):
                for option in pricing:
                    lines.append(f"   - {option}")
            else:
                lines.append(f"   - {pricing}")

        if "packages" in custom_options:
            lines.append("")
            lines.append("5. **Available Packages**:")
            packages = custom_options["packages"]
            if isinstance(packages, list):
                for package in packages[:5]:
                    lines.append(f"   - {package}")
            else:
                lines.append(f"   - {packages}")

    lines.append("")
    if project_info and project_info.get("company_name"):
        lines.append(f"We are committed to delivering exceptional results for {project_info['company_name']} and look forward to partnering with you on this initiative.")
    else:
        lines.append("We are committed to delivering exceptional results and look forward to partnering with you on this initiative.")

    return "\n".join(lines)


def _assemble_proposal(
    sections: Dict[str, str],
    template_info: Optional[Dict[str, Any]],
    project_title: Optional[str],
    tone: str,
    cover_page: Optional[str] = "without",
    project_info: Optional[Dict[str, Any]] = None,
    sender_type: Optional[str] = None,
    sender_name: Optional[str] = None,
    format_type: str = "html",
    candidate_info: Optional[Dict[str, Any]] = None
) -> str:
    """Assemble proposal from sections with proper HTML formatting."""
    if format_type == "html":
        return _assemble_proposal_html(
            sections, template_info, project_title, tone,
            cover_page, project_info, sender_type, sender_name, candidate_info
        )
    else:
        return _assemble_proposal_text(
            sections, template_info, project_title, tone,
            cover_page, project_info, sender_type, sender_name, candidate_info
        )


def _assemble_proposal_html(
    sections: Dict[str, str],
    template_info: Optional[Dict[str, Any]],
    project_title: Optional[str],
    tone: str,
    cover_page: Optional[str],
    project_info: Optional[Dict[str, Any]],
    sender_type: Optional[str],
    sender_name: Optional[str],
    candidate_info: Optional[Dict[str, Any]] = None
) -> str:
    """Assemble proposal with HTML formatting."""
    lines = []
    submission_date = datetime.now().strftime('%B %d, %Y')

    # Determine sender information
    sender_label = "Prepared by"
    if sender_type == "company_admin":
        sender_label = "Company Administrator"
    elif sender_type == "job_seeker":
        sender_label = "Job Seeker"
    elif sender_type == "freelancer":
        sender_label = "Freelancer"

    if not sender_name:
        if sender_type == "company_admin":
            sender_name = "Company Administrator"
        elif sender_type in ["job_seeker", "freelancer"]:
            sender_name = candidate_info.get("name") if candidate_info else "Professional"
        else:
            sender_name = "Author"

    # Add cover page if requested
    if cover_page == "with":
        lines.append('<div style="page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">')
        lines.append('  <div>')
        if project_title:
            lines.append(f'    <h1 style="margin-bottom: 1em;">{project_title}</h1>')
        else:
            lines.append('    <h1 style="margin-bottom: 1em;">Project Proposal</h1>')

        # Subtitle
        if project_info and project_info.get("description"):
            subtitle = project_info["description"][:100]
            lines.append(f'    <p style="font-size: 1.2em; color: #666; margin-bottom: 2em;">{subtitle}</p>')

        lines.append('    <p><strong>Prepared for:</strong> {}</p>'.format(project_info["company_name"] if project_info and project_info.get("company_name") else "Client"))
        lines.append(f'    <p><strong>{sender_label}:</strong> {sender_name}</p>')
        lines.append(f'    <p><strong>Date of Submission:</strong> {submission_date}</p>')
        lines.append('  </div>')
        lines.append('</div>')
        lines.append('')
    else:
        # Add header without cover page
        if project_title:
            lines.append(f'<h1>{project_title}</h1>')
        lines.append(f'<p><strong>Proposal</strong> — {tone} Tone</p>')
        lines.append(f'<p><strong>{sender_label}:</strong> {sender_name}</p>')
        lines.append(f'<p><strong>Date of Submission:</strong> {submission_date}</p>')
        lines.append('')

    # Add sections in order
    section_order = [
        "Executive Summary",
        "Objectives",
        "Methodology",
        "Timeline",
        "Expected Outcomes",
        "Recommendations"
    ]

    # Add sections in order (use actual section names from domain template)
    section_order = list(sections.keys())

    for section_name in section_order:
        if sections[section_name]:
            lines.append(f'<h2>{section_name}</h2>')
            # Convert markdown-like formatting to HTML (uses p, ul, li tags)
            content = _format_content_to_html(sections[section_name])
            lines.append(content)
            lines.append('')

    return "\n".join(lines)


def _assemble_proposal_text(
    sections: Dict[str, str],
    template_info: Optional[Dict[str, Any]],
    project_title: Optional[str],
    tone: str,
    cover_page: Optional[str],
    project_info: Optional[Dict[str, Any]],
    sender_type: Optional[str],
    sender_name: Optional[str],
    candidate_info: Optional[Dict[str, Any]] = None
) -> str:
    """Assemble proposal as plain text (no HTML tags)."""
    lines = []
    submission_date = datetime.now().strftime('%B %d, %Y')

    # Determine sender information
    sender_label = "Prepared by"
    if sender_type == "company_admin":
        sender_label = "Company Administrator"
    elif sender_type == "job_seeker":
        sender_label = "Job Seeker"
    elif sender_type == "freelancer":
        sender_label = "Freelancer"

    if not sender_name:
        if sender_type == "company_admin":
            sender_name = "Company Administrator"
        elif sender_type in ["job_seeker", "freelancer"]:
            sender_name = candidate_info.get("name") if candidate_info else "Professional"
        else:
            sender_name = "Author"

    # Add cover page if requested
    if cover_page == "with":
        lines.append("=" * 60)
        lines.append("")
        if project_title:
            lines.append(project_title.upper())
        else:
            lines.append("PROJECT PROPOSAL")
        lines.append("")

        # Subtitle
        if project_info and project_info.get("description"):
            subtitle = project_info["description"][:100]
            lines.append(subtitle)
            lines.append("")

        if project_info and project_info.get("company_name"):
            lines.append(f"Prepared for: {project_info['company_name']}")
        lines.append(f"{sender_label}: {sender_name}")
        lines.append(f"Date of Submission: {submission_date}")
        lines.append(f"Tone: {tone}")
        lines.append("")
        lines.append("=" * 60)
        lines.append("")
        lines.append("")
    else:
        # Add header without cover page
        if project_title:
            lines.append(project_title.upper())
            lines.append("")
        lines.append(f"Proposal — {tone} Tone")
        lines.append(f"{sender_label}: {sender_name}")
        lines.append(f"Date of Submission: {submission_date}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("")

    # Add sections in order (use actual section names from domain template)
    section_order = list(sections.keys())

    for section_name in section_order:
        if sections[section_name]:
            lines.append(f"## {section_name}")
            lines.append("")
            # Convert to markdown-style text (preserve bullets, clean formatting)
            content = _strip_markdown(sections[section_name])
            # Ensure no HTML tags remain (content is already markdown, but double-check)
            from ai.proposal_generator.merged.utils import strip_html_tags
            content = strip_html_tags(content)
            lines.append(content)
            lines.append("")

    return "\n".join(lines)


def _format_content_to_html(content: str) -> str:
    """Convert markdown-like content to HTML using semantic tags (p, ul, li)."""
    if not content.strip():
        return ""

    lines = content.split('\n')
    result = []
    in_list = False
    current_paragraph = []

    for line in lines:
        stripped = line.strip()

        # Handle bullet points
        if stripped.startswith('- '):
            # Close any open paragraph
            if current_paragraph:
                result.append(f'<p>{" ".join(current_paragraph)}</p>')
                current_paragraph = []

            # Start list if not already in one
            if not in_list:
                result.append('<ul>')
                in_list = True

            # Extract bullet content (remove leading '- ')
            bullet_text = stripped[2:].strip()
            # Convert bold/italic in bullet
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', bullet_text)
            bullet_text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', bullet_text)
            result.append(f'<li>{bullet_text}</li>')

        # Handle empty lines
        elif not stripped:
            # Close paragraph if we have content
            if current_paragraph:
                result.append(f'<p>{" ".join(current_paragraph)}</p>')
                current_paragraph = []
            # Close list if open
            if in_list:
                result.append('</ul>')
                in_list = False

        # Handle regular text
        else:
            # Close list if open
            if in_list:
                result.append('</ul>')
                in_list = False

            # Add to current paragraph
            # Convert bold/italic
            processed_line = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', stripped)
            processed_line = re.sub(r'\*(.*?)\*', r'<em>\1</em>', processed_line)
            current_paragraph.append(processed_line)

    # Close any open paragraph
    if current_paragraph:
        result.append(f'<p>{" ".join(current_paragraph)}</p>')

    # Close any open list
    if in_list:
        result.append('</ul>')

    return '\n'.join(result)


def _strip_markdown(content: str) -> str:
    """Convert to markdown-style plain text (no HTML tags, clean formatting)."""
    if not content:
        return ""

    text = content
    # Remove bold markers but keep text
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    # Remove italic markers but keep text
    text = re.sub(r'\*(.*?)\*', r'\1', text)

    # Clean up excessive whitespace
    lines = text.split('\n')
    result = []
    prev_empty = False

    for line in lines:
        stripped = line.strip()

        # Skip multiple consecutive empty lines (keep single spacing)
        if not stripped:
            if not prev_empty:
                result.append('')
                prev_empty = True
            continue

        prev_empty = False

        # Keep bullet points with single space
        if stripped.startswith('- '):
            result.append(stripped)
        else:
            # Regular text - remove extra spaces
            cleaned = re.sub(r'\s+', ' ', stripped)
            result.append(cleaned)

    # Remove trailing empty lines
    while result and not result[-1]:
        result.pop()

    return '\n'.join(result)


def _adjust_proposal_length_strict(proposal: str, target_length: int, detail_level: str) -> str:
    """Strictly adjust proposal length to match target (within 5% tolerance)."""
    current_length = len(proposal)
    tolerance = int(target_length * 0.05)  # 5% tolerance

    # Check if within acceptable range
    if abs(current_length - target_length) <= tolerance:
        return proposal

    if current_length > target_length:
        # Need to shorten - be more aggressive
        ratio = target_length / current_length

        if detail_level == "summarized":
            # For summarized, be very aggressive (keep only essential content)
            ratio = min(ratio, 0.6)
        else:
            # For detailed, still need to cut but preserve more
            ratio = min(ratio, 0.85)

        # Split by sections to preserve structure
        sections = _split_into_sections(proposal)

        # Calculate target per section
        section_count = len(sections)
        if section_count == 0:
            # Fallback: simple truncation
            return proposal[:target_length]

        target_per_section = target_length // section_count
        adjusted_sections = []
        total_length = 0

        for i, section in enumerate(sections):
            section_length = len(section)

            if section_length > target_per_section:
                # Truncate this section
                # Try to preserve at least 70% of each section
                min_section_length = int(target_per_section * 0.7)
                truncated = section[:min_section_length]

                # Try to end at a sentence or paragraph
                last_period = truncated.rfind('.')
                last_newline = truncated.rfind('\n')
                cut_point = max(last_period, last_newline)

                if cut_point > min_section_length * 0.5:
                    truncated = truncated[:cut_point + 1]

                adjusted_sections.append(truncated)
                total_length += len(truncated)
            else:
                adjusted_sections.append(section)
                total_length += section_length

            # If we've reached target, stop
            if total_length >= target_length:
                break

        result = "\n\n".join(adjusted_sections)

        # Final check - if still too long, truncate more aggressively
        if len(result) > target_length + tolerance:
            result = result[:target_length]
            # Ensure it ends properly
            last_period = result.rfind('.')
            if last_period > target_length * 0.9:
                result = result[:last_period + 1]

        return result

    else:
        # Need to lengthen - expand content based on detail level
        if detail_level == "summarized":
            # For summarized, don't expand much - just add a brief conclusion
            expansion = target_length - current_length
            if expansion > 200:
                proposal += "\n\n*This proposal provides a concise overview of the key aspects and recommendations.*"
            return proposal[:target_length]

        # For detailed, expand sections with more content
        expansion_ratio = target_length / current_length
        if expansion_ratio > 1.5:
            # Too much expansion needed - add detailed subsections
            proposal = _expand_proposal_content(proposal, target_length)

        # Final truncation if still over
        if len(proposal) > target_length + tolerance:
            proposal = proposal[:target_length]
            last_period = proposal.rfind('.')
            if last_period > target_length * 0.9:
                proposal = proposal[:last_period + 1]

        return proposal


def _split_into_sections(proposal: str) -> list:
    """Split proposal into sections based on headings."""
    import re
    # Split by H2 headings (## in markdown or <h2> in HTML)
    sections = re.split(r'(?:## |<h2[^>]*>)[^<\n]*(?:</h2>)?', proposal, flags=re.IGNORECASE)
    # Filter out empty sections
    return [s.strip() for s in sections if s.strip()]


def _expand_proposal_content(proposal: str, target_length: int) -> str:
    """Expand proposal content to reach target length."""
    # Add more detailed explanations to existing sections
    lines = proposal.split('\n')
    expanded = []
    current_length = 0

    for line in lines:
        expanded.append(line)
        current_length += len(line)

        # If line is a bullet point or short paragraph, add detail
        if line.strip().startswith('-') or (len(line.strip()) < 100 and current_length < target_length * 0.8):
            # Add a brief expansion based on content
            if 'deliver' in line.lower():
                expanded.append("This includes comprehensive planning, execution, and quality assurance.")
                current_length += 70
            elif 'ensure' in line.lower():
                expanded.append("We will implement rigorous processes and regular monitoring.")
                current_length += 65
            elif 'implement' in line.lower():
                expanded.append("This involves detailed analysis, strategic planning, and systematic execution.")
                current_length += 80
            elif 'develop' in line.lower():
                expanded.append("The development process will follow industry best practices and quality standards.")
                current_length += 85

        if current_length >= target_length:
            break

    return '\n'.join(expanded)


def _add_detail_to_sections(proposal: str, target_length: int) -> str:
    """Add more detail to sections to reach target length."""
    # Find sections and expand them
    import re
    sections = re.split(r'(## .+)', proposal)

    if len(sections) < 3:
        # Not enough sections, add a new one
        proposal += "\n\n## Implementation Details\n\n"
        proposal += "The implementation will be carried out in a structured manner, with clear milestones and deliverables. "
        proposal += "Regular progress reviews and quality checks will ensure adherence to timelines and quality standards. "
        proposal += "Stakeholder communication will be maintained throughout the project lifecycle."
        return proposal

    # Expand existing sections
    expanded = []
    for i, section in enumerate(sections):
        expanded.append(section)
        if i % 2 == 1:  # This is a heading
            continue
        if len(section.strip()) < 200 and len(proposal) < target_length * 0.9:
            # Short section - add detail
            expanded.append(" Additional details and specifications will be provided during the project planning phase.")

    return ''.join(expanded)


def _apply_tone(proposal: str, tone: str) -> str:
    """Apply tone adjustments to proposal."""
    tone_lower = tone.lower()

    if tone_lower == "casual":
        replacements = {
            "We are committed to": "We're excited to",
            "comprehensive approach": "solid approach",
            "ensure": "make sure",
            "implement": "put in place",
            "recommend": "suggest"
        }
        for old, new in replacements.items():
            proposal = proposal.replace(old, new)

    elif tone_lower == "persuasive":
        proposal = proposal.replace("Expected outcomes include:", "You can expect to achieve:")
        proposal = proposal.replace("we recommend:", "we strongly recommend:")
        proposal = proposal.replace("recommend", "strongly recommend")

    elif tone_lower == "formal":
        replacements = {
            "we recommend": "it is recommended that",
            "we are committed": "we hereby commit",
            "ensure": "guarantee",
            "will": "shall"
        }
        for old, new in replacements.items():
            proposal = proposal.replace(old, new)

    return proposal


def _get_project_description(project_type: str) -> str:
    """Get project description based on type."""
    descriptions = {
        "mobile_app": "developing a mobile application",
        "web_platform": "building a web platform",
        "ecommerce": "creating an e-commerce solution",
        "software_solution": "implementing a software solution",
        "ai_ml": "developing an AI/ML solution",
        "consulting": "providing consulting services",
        "general": "this project"
    }
    return descriptions.get(project_type, "this project")


def _generate_domain_specific_sections(
    sections: Dict[str, str],
    project_info: Optional[Dict[str, Any]],
    template_info: Optional[Dict[str, Any]],
    industry: Optional[str],
    prompt: str,
    project_type: str,
    custom_options: Optional[Dict[str, Any]] = None
) -> None:
    """Generate content for domain-specific sections from fine-tuning templates."""
    domain = None
    if template_info:
        domain = template_info.get("domain") or template_info.get("category")
    if not domain and industry:
        industry_lower = industry.lower()
        if industry_lower in ["education", "learning"]:
            domain = "education"
        elif industry_lower in ["healthcare", "health", "medical"]:
            domain = "healthcare"
        elif industry_lower in ["construction", "building"]:
            domain = "construction"
        elif industry_lower in ["business", "finance", "retail"]:
            domain = "business"

    # Generate content for domain-specific sections
    for section_name in sections.keys():
        if not sections[section_name]:  # Only generate if section is empty
            section_lower = section_name.lower()

            # Business-specific sections
            if domain == "business":
                if "problem statement" in section_lower or "opportunity" in section_lower:
                    sections[section_name] = _generate_problem_statement(prompt, project_info, project_type)
                elif "business model" in section_lower or "revenue plan" in section_lower:
                    sections[section_name] = _generate_business_model(prompt, project_info, custom_options)
                elif "background" in section_lower or "rationale" in section_lower:
                    sections[section_name] = _generate_background_rationale(prompt, project_info, domain)

            # Education-specific sections
            elif domain == "education":
                if "background" in section_lower or "rationale" in section_lower:
                    sections[section_name] = _generate_background_rationale(prompt, project_info, domain)
                elif "target audience" in section_lower or "beneficiaries" in section_lower:
                    sections[section_name] = _generate_target_audience(prompt, project_info)
                elif "evaluation" in section_lower or "monitoring" in section_lower:
                    sections[section_name] = _generate_evaluation_monitoring(project_info)

            # Healthcare-specific sections
            elif domain == "healthcare":
                if "background" in section_lower or "rationale" in section_lower:
                    sections[section_name] = _generate_background_rationale(prompt, project_info, domain)
                elif "services offered" in section_lower or "scope" in section_lower:
                    sections[section_name] = _generate_services_scope(prompt, project_info, project_type)
                elif "evaluation" in section_lower or "monitoring" in section_lower:
                    sections[section_name] = _generate_evaluation_monitoring(project_info)

            # Construction-specific sections
            elif domain == "construction":
                if "background" in section_lower or "rationale" in section_lower:
                    sections[section_name] = _generate_background_rationale(prompt, project_info, domain)
                elif "design" in section_lower and "construction" in section_lower:
                    sections[section_name] = _generate_design_construction_approach(project_info, project_type)
                elif "evaluation" in section_lower or "monitoring" in section_lower:
                    sections[section_name] = _generate_evaluation_monitoring(project_info)

            # General sections that might appear in any domain
            if "background" in section_lower or "rationale" in section_lower:
                if not sections[section_name]:
                    sections[section_name] = _generate_background_rationale(prompt, project_info, domain)
            elif "budget" in section_lower or "resources" in section_lower:
                if not sections[section_name]:
                    sections[section_name] = _generate_budget_resources(project_info)


def _generate_problem_statement(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    project_type: str
) -> str:
    """Generate problem statement/opportunity section for business proposals."""
    lines = []
    lines.append("**Market Gap / Opportunity:**")
    lines.append("")

    if project_info and project_info.get("description"):
        lines.append(f"The current market presents a significant opportunity in {project_info['description'][:200]}.")
    else:
        project_desc = _get_project_description(project_type)
        lines.append(f"There is a clear market need and opportunity for {project_desc}.")

    lines.append("")
    lines.append("**Problem Statement:**")
    lines.append("")
    lines.append("Current solutions in the market lack the comprehensive approach needed to address the evolving needs of modern businesses and consumers.")
    lines.append("")
    lines.append("**Opportunity:**")
    lines.append("")
    lines.append("By leveraging innovative technologies and proven methodologies, we can deliver a solution that addresses these gaps and creates significant value for stakeholders.")

    return "\n".join(lines)


def _generate_business_model(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    custom_options: Optional[Dict[str, Any]]
) -> str:
    """Generate business model/revenue plan section."""
    lines = []
    lines.append("**Revenue Generation Strategy:**")
    lines.append("")

    revenue_models = [
        "Subscription-based model with tiered pricing plans",
        "Transaction-based revenue with commission structure",
        "Licensing and partnership revenue streams",
        "Freemium model with premium feature upgrades"
    ]

    lines.append("The business model is designed to generate sustainable revenue through:")
    for model in revenue_models[:3]:
        lines.append(f"- {model}")

    if custom_options and "pricing" in custom_options:
        lines.append("")
        lines.append("**Pricing Structure:**")
        pricing = custom_options["pricing"]
        if isinstance(pricing, list):
            for price_option in pricing[:3]:
                lines.append(f"- {price_option}")
        else:
            lines.append(f"- {pricing}")

    if project_info and project_info.get("budget"):
        budget = project_info["budget"]
        if isinstance(budget, (int, float)):
            lines.append("")
            lines.append(f"**Projected Budget:** ${budget:,.2f}")
        else:
            lines.append("")
            lines.append(f"**Projected Budget:** {budget}")

    return "\n".join(lines)


def _generate_background_rationale(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    domain: Optional[str]
) -> str:
    """Generate background/rationale section."""
    lines = []

    if domain == "education":
        lines.append("**Educational Context:**")
        lines.append("")
        lines.append("The educational landscape continues to evolve, requiring innovative approaches to meet the diverse needs of learners and educators.")
    elif domain == "healthcare":
        lines.append("**Healthcare Context:**")
        lines.append("")
        lines.append("The healthcare sector faces ongoing challenges in delivering accessible, efficient, and high-quality services to diverse populations.")
    elif domain == "construction":
        lines.append("**Construction Context:**")
        lines.append("")
        lines.append("Modern construction projects require careful planning, sustainable practices, and adherence to safety and regulatory standards.")
    else:
        lines.append("**Background:**")
        lines.append("")
        lines.append("The current landscape presents both challenges and opportunities that require a strategic and well-executed approach.")

    lines.append("")
    lines.append("**Rationale:**")
    lines.append("")

    if project_info and project_info.get("description"):
        lines.append(f"This project addresses critical needs identified in: {project_info['description'][:150]}.")
    else:
        lines.append("This initiative is designed to address identified gaps and deliver measurable value to all stakeholders.")

    return "\n".join(lines)


def _generate_target_audience(
    prompt: str,
    project_info: Optional[Dict[str, Any]]
) -> str:
    """Generate target audience/beneficiaries section."""
    lines = []
    lines.append("**Primary Beneficiaries:**")
    lines.append("")
    lines.append("- Students and learners seeking enhanced educational experiences")
    lines.append("- Educational institutions and administrators")
    lines.append("- Educators and teaching staff")
    lines.append("- Parents and guardians")
    lines.append("")
    lines.append("**Secondary Beneficiaries:**")
    lines.append("")
    lines.append("- Community stakeholders")
    lines.append("- Educational technology providers")
    lines.append("- Policy makers and educational authorities")

    return "\n".join(lines)


def _generate_services_scope(
    prompt: str,
    project_info: Optional[Dict[str, Any]],
    project_type: str
) -> str:
    """Generate services offered/scope section."""
    lines = []
    lines.append("**Services Included:**")
    lines.append("")

    services = [
        "Comprehensive consultation and assessment",
        "Customized solution development",
        "Implementation and deployment support",
        "Training and knowledge transfer",
        "Ongoing maintenance and support"
    ]

    for service in services:
        lines.append(f"- {service}")

    if project_info and project_info.get("description"):
        lines.append("")
        lines.append(f"**Scope:** {project_info['description'][:200]}")

    return "\n".join(lines)


def _generate_design_construction_approach(
    project_info: Optional[Dict[str, Any]],
    project_type: str
) -> str:
    """Generate design & construction approach section."""
    lines = []
    lines.append("**Design Phase:**")
    lines.append("")
    lines.append("- Architectural design and planning")
    lines.append("- Engineering and structural analysis")
    lines.append("- Material selection and specifications")
    lines.append("- Regulatory compliance and permits")
    lines.append("")
    lines.append("**Construction Phase:**")
    lines.append("")
    lines.append("- Site preparation and foundation work")
    lines.append("- Structural construction and assembly")
    lines.append("- Systems installation (electrical, plumbing, HVAC)")
    lines.append("- Quality assurance and safety compliance")
    lines.append("- Final inspection and handover")

    return "\n".join(lines)


def _generate_evaluation_monitoring(
    project_info: Optional[Dict[str, Any]]
) -> str:
    """Generate evaluation & monitoring section."""
    lines = []
    lines.append("**Evaluation Framework:**")
    lines.append("")
    lines.append("- Regular progress assessments and milestone reviews")
    lines.append("- Key performance indicators (KPIs) tracking")
    lines.append("- Stakeholder feedback collection and analysis")
    lines.append("- Continuous improvement processes")
    lines.append("")
    lines.append("**Monitoring Approach:**")
    lines.append("")
    lines.append("- Monthly progress reports")
    lines.append("- Quarterly comprehensive reviews")
    lines.append("- Real-time dashboard and analytics")
    lines.append("- Risk assessment and mitigation tracking")

    return "\n".join(lines)


def _generate_budget_resources(
    project_info: Optional[Dict[str, Any]]
) -> str:
    """Generate budget/resources section."""
    lines = []
    lines.append("**Budget Allocation:**")
    lines.append("")

    if project_info and project_info.get("budget"):
        budget = project_info["budget"]
        if isinstance(budget, (int, float)):
            lines.append(f"Total Project Budget: ${budget:,.2f}")
            lines.append("")
            lines.append("**Budget Breakdown:**")
            lines.append(f"- Development and Implementation: ${budget * 0.6:,.2f} (60%)")
            lines.append(f"- Resources and Materials: ${budget * 0.25:,.2f} (25%)")
            lines.append(f"- Contingency and Support: ${budget * 0.15:,.2f} (15%)")
        else:
            lines.append(f"Total Project Budget: {budget}")
    else:
        lines.append("Budget will be determined based on project scope and requirements.")

    lines.append("")
    lines.append("**Required Resources:**")
    lines.append("")
    lines.append("- Skilled project team and specialists")
    lines.append("- Technology infrastructure and tools")
    lines.append("- Materials and supplies")
    lines.append("- External consultants and vendors (as needed)")

    return "\n".join(lines)

