"""Domain-specific proposal templates based on fine-tuning instructions.

These templates follow the structure and requirements from the training notebook
to ensure proposals match the fine-tuned model's expected format.
"""
from typing import Optional, Dict, Any


def get_domain_template(domain: Optional[str], instruction: str) -> str:
    """
    Get domain-specific template based on fine-tuning instructions.

    Args:
        domain: Domain name (business, education, healthcare, construction, or None)
        instruction: User instruction/prompt

    Returns:
        Formatted template string with strict requirements
    """
    domain_lower = (domain or "").lower()

    if domain_lower == "business":
        return _get_business_template(instruction)
    elif domain_lower == "education":
        return _get_education_template(instruction)
    elif domain_lower == "healthcare":
        return _get_healthcare_template(instruction)
    elif domain_lower == "construction":
        return _get_construction_template(instruction)
    else:
        return _get_general_template(instruction)


def _get_business_template(instruction: str) -> str:
    """Business proposal template."""
    return f"""
You are an expert professional business proposal writer.

### STRICT REQUIREMENTS:
1. Generate a **full, detailed, professional business proposal**.
2. Use **numbered sections and clear headings**.
3. Avoid repetitive words or phrases.
4. Include realistic details (metrics, timelines, resources) wherever relevant.
5. Maintain a polished, formal, professional tone.

### BUSINESS PROPOSAL TEMPLATE:
1. Project / Startup Name:
2. Executive Summary:
   - Overview of the project and key objectives (3–5 sentences)
3. Problem Statement / Opportunity:
   - Describe the market gap or opportunity
4. Objectives / Goals:
   - Objective 1:
   - Objective 2:
   - Objective 3:
5. Proposed Solution / Approach:
   - Detailed plan of action
6. Business Model / Revenue Plan:
   - How the project will generate revenue
7. Implementation Plan / Timeline:
   - Step-by-step activities and milestones
8. Expected Outcomes / Impact:
   - Tangible results and metrics
9. Summary & Recommendations / Call to Action:
   - Concluding remarks and next steps

### USER INSTRUCTION:
{instruction}
"""


def _get_education_template(instruction: str) -> str:
    """Education proposal template."""
    return f"""
You are an expert educational proposal writer.

### STRICT REQUIREMENTS:
1. Generate a **full, detailed educational proposal**.
2. Use **bold headings** for all main sections.
3. Use numbered or bulleted lists for objectives, methodology, outcomes, and timelines.
4. Avoid repetition; write naturally and professionally.
5. Include realistic, actionable details for all sections.

### EDUCATIONAL PROPOSAL TEMPLATE:
**Title of Proposal:**
**Submitted By:**
**Date:**

**1. Executive Summary:**
(Overview of the project, purpose, goals, and expected outcomes in 4–6 sentences)

**2. Background / Rationale:**
(Problem statement, context, and justification for the project)

**3. Objectives:**
- Objective 1:
- Objective 2:
- Objective 3:

**4. Target Audience / Beneficiaries:**
-

**5. Proposed Methodology / Approach:**
-

**6. Timeline / Milestones:**
-

**7. Budget / Resources:**
-

**8. Expected Outcomes / Impact:**
-

**9. Evaluation & Monitoring:**
-

**10. Conclusion:**
-

**11. Appendices (Optional):**
-

### USER INSTRUCTION:
{instruction}
"""


def _get_healthcare_template(instruction: str) -> str:
    """Healthcare proposal template."""
    return f"""
You are an expert healthcare project proposal writer.

### STRICT REQUIREMENTS:
1. Generate a **detailed, professional healthcare proposal**.
2. Use **bold or numbered headings** for all main sections.
3. Include bullets/lists for objectives, methodology, services, outcomes.
4. Avoid repetition; write clearly and professionally.
5. Include realistic, actionable details, timelines, and metrics.

### HEALTHCARE PROPOSAL TEMPLATE:
**Project Name / Initiative:**
**Submitted By:**
**Date:**

**1. Executive Summary:**
(Brief overview of project purpose, goals, expected outcomes)

**2. Background / Rationale:**
(Explain the healthcare gap, context, and justification)

**3. Objectives:**
- Objective 1:
- Objective 2:
- Objective 3:

**4. Services Offered / Scope:**
-

**5. Proposed Methodology / Approach:**
-

**6. Timeline / Milestones:**
-

**7. Budget / Resources:**
-

**8. Expected Outcomes / Impact:**
-

**9. Evaluation & Monitoring:**
-

**10. Conclusion & Recommendations:**
-

**11. Appendices (Optional):**
-

### USER INSTRUCTION:
{instruction}
"""


def _get_construction_template(instruction: str) -> str:
    """Construction proposal template."""
    return f"""
You are an expert construction project proposal writer.

### STRICT REQUIREMENTS:
1. Generate a **full, detailed construction proposal**.
2. Use **bold or numbered headings** for all main sections.
3. Include bullets/lists for methodology, design, timeline, and budget.
4. Avoid repetition; maintain a formal professional tone.
5. Include realistic project details, resources, and measurable outcomes.

### CONSTRUCTION PROPOSAL TEMPLATE:
**Project Name / Initiative:**
**Submitted By:**
**Date:**

**1. Executive Summary:**
(Overview of project, purpose, goals, and expected outcomes)

**2. Background / Rationale:**
(Problem or need, context, justification)

**3. Objectives:**
- Objective 1:
- Objective 2:
- Objective 3:

**4. Design & Construction Approach:**
-

**5. Timeline / Milestones:**
-

**6. Budget / Resources:**
-

**7. Expected Outcomes / Impact:**
-

**8. Evaluation & Monitoring:**
-

**9. Conclusion & Recommendations:**
-

**10. Appendices (Optional):**
-

### USER INSTRUCTION:
{instruction}
"""


def _get_general_template(instruction: str) -> str:
    """General proposal template."""
    return f"""
You are an expert professional proposal writer.

### STRICT REQUIREMENTS:
1. Generate a detailed, professional proposal.
2. Use numbered sections or bold headings.
3. Avoid repetitive words and phrases.
4. Include realistic, actionable details wherever applicable.

### GENERAL PROPOSAL TEMPLATE:
1. Project Title / Name:
2. Executive Summary:
3. Background / Problem Statement:
4. Objectives / Goals:
5. Methodology / Approach:
6. Expected Outcomes / Impact:
7. Timeline / Milestones:
8. Budget / Resources:
9. Summary & Recommendations / Call to Action:

### USER INSTRUCTION:
{instruction}
"""


def get_strict_requirements() -> str:
    """
    Get the strict requirements from fine-tuning instructions.

    Returns:
        String with strict requirements for proposal generation
    """
    return """
### STRICT REQUIREMENTS:
- Every proposal must be clear, well-structured, and professional.
- Use domain-specific vocabulary appropriately.
- Avoid repeating phrases; each proposal should look unique.
- Proposals must include objectives, methodology/approach, expected outcomes, and summary/recommendations.
- Maintain a polished, formal business tone.
"""


def get_domain_specific_structure(domain: Optional[str]) -> Dict[str, str]:
    """
    Get domain-specific section structure based on templates.

    Args:
        domain: Domain name (business, education, healthcare, construction, or None)

    Returns:
        Dictionary of section names and their order
    """
    domain_lower = (domain or "").lower()

    if domain_lower == "business":
        return {
            "Executive Summary": "",
            "Problem Statement / Opportunity": "",
            "Objectives / Goals": "",
            "Proposed Solution / Approach": "",
            "Business Model / Revenue Plan": "",
            "Implementation Plan / Timeline": "",
            "Expected Outcomes / Impact": "",
            "Summary & Recommendations / Call to Action": ""
        }
    elif domain_lower == "education":
        return {
            "Executive Summary": "",
            "Background / Rationale": "",
            "Objectives": "",
            "Target Audience / Beneficiaries": "",
            "Proposed Methodology / Approach": "",
            "Timeline / Milestones": "",
            "Budget / Resources": "",
            "Expected Outcomes / Impact": "",
            "Evaluation & Monitoring": "",
            "Conclusion": ""
        }
    elif domain_lower == "healthcare":
        return {
            "Executive Summary": "",
            "Background / Rationale": "",
            "Objectives": "",
            "Services Offered / Scope": "",
            "Proposed Methodology / Approach": "",
            "Timeline / Milestones": "",
            "Budget / Resources": "",
            "Expected Outcomes / Impact": "",
            "Evaluation & Monitoring": "",
            "Conclusion & Recommendations": ""
        }
    elif domain_lower == "construction":
        return {
            "Executive Summary": "",
            "Background / Rationale": "",
            "Objectives": "",
            "Design & Construction Approach": "",
            "Timeline / Milestones": "",
            "Budget / Resources": "",
            "Expected Outcomes / Impact": "",
            "Evaluation & Monitoring": "",
            "Conclusion & Recommendations": ""
        }
    else:
        # General/default structure
        return {
            "Executive Summary": "",
            "Background / Problem Statement": "",
            "Objectives / Goals": "",
            "Methodology / Approach": "",
            "Expected Outcomes / Impact": "",
            "Timeline / Milestones": "",
            "Budget / Resources": "",
            "Summary & Recommendations / Call to Action": ""
        }

