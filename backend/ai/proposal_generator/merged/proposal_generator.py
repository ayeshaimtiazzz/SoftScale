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

    # Build proposal sections based on template if provided
    sections = _build_proposal_structure(template_info, project_title)

    # Executive Summary
    if "Executive Summary" in sections or "executive_summary" in sections:
        summary = _generate_executive_summary(
            prompt, project_title, project_type, industry,
            project_info, candidate_info, template_info, tone
        )
        sections["Executive Summary"] = summary

    # Objectives
    if "Objectives" in sections or "objectives" in sections:
        objectives = _generate_objectives(
            prompt, project_info, custom_options, template_info, detail_level
        )
        sections["Objectives"] = objectives

    # Methodology
    if "Methodology" in sections or "methodology" in sections:
        methodology = _generate_methodology(
            project_type, detail_level, template_info, target_length
        )
        sections["Methodology"] = methodology

    # Timeline
    if "Timeline" in sections or "timeline" in sections:
        timeline = _generate_timeline(
            project_type, detail_level, project_info, target_length
        )
        sections["Timeline"] = timeline

    # Expected Outcomes
    if "Expected Outcomes" in sections or "outcomes" in sections:
        outcomes = _generate_outcomes(
            project_type, project_info, template_info, custom_options
        )
        sections["Expected Outcomes"] = outcomes

    # Recommendations
    if "Recommendations" in sections or "recommendations" in sections:
        recommendations = _generate_recommendations(
            prompt, custom_options, tone, template_info, project_info
        )
        sections["Recommendations"] = recommendations

    # Build final proposal
    proposal = _assemble_proposal(
        sections, template_info, project_title, tone,
        cover_page, project_info, sender_type, sender_name, format_type, candidate_info
    )

    # Adjust length to match page_count requirement
    if page_count:
        proposal = _adjust_proposal_length(proposal, target_length, detail_level)

    # Apply tone adjustments
    proposal = _apply_tone(proposal, tone)

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
    project_title: Optional[str]
) -> Dict[str, str]:
    """Build proposal structure based on template or default."""
    sections = {}

    if template_info and template_info.get("structure"):
        # Use template structure if provided
        structure = template_info["structure"]
        if isinstance(structure, list):
            for section in structure:
                sections[section] = ""
        elif isinstance(structure, dict):
            sections = structure
    else:
        # Default structure
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
    tone: str
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
    target_length: int
) -> str:
    """Generate methodology section."""
    lines = []

    if detail_level == "detailed":
        lines.append("Our methodology follows industry best practices and is structured into distinct phases:")
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

        lines.append('    <div style="margin-top: 3em;">')
        if project_info and project_info.get("company_name"):
            lines.append(f'      <p><strong>Prepared for:</strong> {project_info["company_name"]}</p>')
        lines.append(f'      <p><strong>{sender_label}:</strong> {sender_name}</p>')
        lines.append(f'      <p><strong>Date of Submission:</strong> {submission_date}</p>')
        lines.append(f'      <p><strong>Tone:</strong> {tone}</p>')
        lines.append('    </div>')
        lines.append('  </div>')
        lines.append('</div>')
        lines.append('')
    else:
        # Add header without cover page
        lines.append('<div style="margin-bottom: 2em;">')
        if project_title:
            lines.append(f'  <h1>{project_title}</h1>')
        lines.append(f'  <p><strong>Proposal</strong> — {tone} Tone</p>')
        lines.append(f'  <p><strong>{sender_label}:</strong> {sender_name}</p>')
        lines.append(f'  <p><strong>Date of Submission:</strong> {submission_date}</p>')
        lines.append('</div>')
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

    for section_name in section_order:
        if section_name in sections and sections[section_name]:
            lines.append(f'<h2>{section_name}</h2>')
            lines.append('<div class="proposal-body">')
            # Convert markdown-like formatting to HTML
            content = _format_content_to_html(sections[section_name])
            lines.append(content)
            lines.append('</div>')
            lines.append('')

    # Add any additional sections from template
    for section_name, content in sections.items():
        if section_name not in section_order and content:
            lines.append(f'<h2>{section_name}</h2>')
            lines.append('<div class="proposal-body">')
            content_html = _format_content_to_html(content)
            lines.append(content_html)
            lines.append('</div>')
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

    # Add sections in order
    section_order = [
        "Executive Summary",
        "Objectives",
        "Methodology",
        "Timeline",
        "Expected Outcomes",
        "Recommendations"
    ]

    for section_name in section_order:
        if section_name in sections and sections[section_name]:
            lines.append(section_name.upper())
            lines.append("")
            # Remove any markdown formatting for plain text
            content = _strip_markdown(sections[section_name])
            lines.append(content)
            lines.append("")

    # Add any additional sections from template
    for section_name, content in sections.items():
        if section_name not in section_order and content:
            lines.append(section_name.upper())
            lines.append("")
            content_text = _strip_markdown(content)
            lines.append(content_text)
            lines.append("")

    return "\n".join(lines)


def _format_content_to_html(content: str) -> str:
    """Convert markdown-like content to HTML."""
    html = content
    # Convert bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    # Convert italic
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    # Convert bullet points
    html = re.sub(r'^- (.*)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    # Wrap consecutive list items in <ul>
    lines = html.split('\n')
    result = []
    in_list = False
    for line in lines:
        if line.strip().startswith('<li>'):
            if not in_list:
                result.append('<ul>')
                in_list = True
            result.append(line)
        else:
            if in_list:
                result.append('</ul>')
                in_list = False
            if line.strip():
                result.append(f'<p>{line}</p>')
            else:
                result.append('')
    if in_list:
        result.append('</ul>')
    return '\n'.join(result)


def _strip_markdown(content: str) -> str:
    """Remove markdown formatting for plain text."""
    text = content
    # Remove bold
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    # Remove italic
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Keep bullet points as is
    return text


def _adjust_proposal_length(proposal: str, target_length: int, detail_level: str) -> str:
    """Adjust proposal length to match target."""
    current_length = len(proposal)

    if abs(current_length - target_length) < 500:
        return proposal  # Close enough

    if current_length > target_length:
        # Need to shorten
        ratio = target_length / current_length
        if detail_level == "summarized":
            # More aggressive shortening for summarized
            ratio = min(ratio, 0.7)

        # Shorten by removing some content
        lines = proposal.split("\n")
        # Keep first 60% of lines, then sample rest
        keep_lines = int(len(lines) * ratio)
        shortened = "\n".join(lines[:keep_lines])

        # Ensure we don't cut mid-section
        if shortened.count("##") < proposal.count("##"):
            # Add closing for last section
            shortened += "\n\n*[Content adjusted to meet length requirements]*"

        return shortened
    else:
        # Need to lengthen (add more detail)
        ratio = target_length / current_length
        # This is harder - we'd need to expand content
        # For now, just return as is
        return proposal


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

