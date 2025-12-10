# Proposal Generator - Production Ready

## Overview

This is the production-ready proposal generator located in `backend/ai/proposal_generator/merged/`. It generates professional proposals that respect all specified parameters.

## Location

```
backend/ai/proposal_generator/merged/proposal_generator.py
```

## Features

- **Template Support** - Respects template structure and format
- **Custom Options** - Highlights pricing, features, packages, etc.
- **Project Information** - Uses project title, description, budget, company name
- **Candidate Information** - Includes talent name, skills, experience, match score
- **Tone Control** - Professional, Casual, Persuasive, Formal
- **Page Length** - Adjusts content to match page_count (1-page, 2-page, etc.)
- **Detail Level** - Detailed or summarized output

## Usage

### Direct Import

```python
from ai.proposal_generator.merged.proposal_generator import generate_proposal

proposal = generate_proposal(
    prompt="Create a proposal for developing a mobile application",
    tone="Professional",
    page_count="2-page",
    detail_level="detailed",
    custom_options={"pricing": ["Basic", "Premium", "Enterprise"]},
    project_info={
        "title": "E-Commerce Mobile App",
        "description": "A comprehensive mobile shopping platform",
        "company_name": "Acme Corp",
        "budget": 50000
    },
    candidate_info={
        "name": "John Doe",
        "skills": ["React Native", "Node.js", "MongoDB"],
        "experience": "5+ years"
    },
    template_info={
        "title": "Mobile App Development Template",
        "domain": "Mobile Development",
        "category": "Technology"
    }
)
```

### Via ProposalService

The `ProposalService.generate_proposal()` method automatically uses this generator. All web endpoints are integrated:

- `/api/proposals/generate` - General proposal
- `/api/proposals/generate-from-deal` - From deal/project
- `/api/proposals/generate-from-match` - From candidate match

## Parameters

### Required
- `prompt` (str): The user's proposal request

### Optional
- `tone` (str): "Professional" (default), "Casual", "Persuasive", "Formal"
- `page_count` (str): "1-page", "2-page", "3-page", etc.
- `detail_level` (str): "detailed" (default) or "summarized"
- `custom_options` (dict): Custom options to highlight
  ```python
  {
      "pricing": ["Basic", "Premium", "Enterprise"],
      "features": ["Feature 1", "Feature 2"],
      "packages": ["Starter", "Professional", "Enterprise"]
  }
  ```
- `project_info` (dict): Project/deal information
  ```python
  {
      "title": "Project Title",
      "description": "Project description",
      "company_name": "Client Company",
      "budget": 50000,
      "industry": "Technology"
  }
  ```
- `candidate_info` (dict): Candidate/talent information
  ```python
  {
      "name": "John Doe",
      "skills": ["Skill1", "Skill2"],
      "experience": "5+ years",
      "match_score": 95
  }
  ```
- `template_info` (dict): Template information
  ```python
  {
      "title": "Template Name",
      "domain": "Domain",
      "category": "Category",
      "structure": ["Section1", "Section2"]
  }
  ```

## Output Format

The generated proposal includes:

1. **Title** - Project title (if available)
2. **Header** - Proposal metadata (tone, generation date)
3. **Executive Summary** - Overview and value proposition
4. **Objectives** - Clear bullet points of goals
5. **Methodology** - Phased approach (detailed) or summary (summarized)
6. **Timeline** - Estimated timeline with milestones
7. **Expected Outcomes** - Expected results and impact
8. **Recommendations** - Action items and next steps

## Length Control

- **Page Count**: Adjusts total length based on page_count
  - 1-page ≈ 2,500 characters
  - 2-page ≈ 5,000 characters
  - 3-page ≈ 7,500 characters
- **Detail Level**:
  - "detailed": Full sections with phases and milestones
  - "summarized": Concise bullet points and summaries

## Integration

This generator is automatically used by:
- `ProposalService.generate_proposal()`
- All web API endpoints in `routes/proposal_routes.py`
- All controller methods in `controllers/proposal_controller.py`

No configuration needed - it's the default proposal generation method.

