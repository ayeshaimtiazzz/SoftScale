"""Service for proposal generation and template management."""
from typing import List, Dict, Optional
from data.proposal_repository import ProposalRepository
from services.proposal_model_service import ProposalModelService


class ProposalService:
    """Service for proposal-related business logic."""

    @staticmethod
    def get_all_templates(
        category: Optional[str] = None,
        domain: Optional[str] = None
    ) -> List[Dict]:
        """Get all proposal templates."""
        templates = ProposalRepository.get_all_templates(category=category, domain=domain)

        # Format templates for frontend
        formatted_templates = []
        for template in templates:
            formatted_templates.append({
                "id": f"tpl-{template['template_id']}",
                "template_id": template["template_id"],
                "title": template["title"],
                "category": template["category"] or "General",
                "description": template["description"] or "",
                "prompt": template["prompt"],
                "tags": template.get("tags", []),
                "domain": template.get("domain"),
                "tone": template.get("tone", "Professional"),
                "complexity": template.get("complexity", "Medium"),
                "metadata": template.get("metadata")
            })

        return formatted_templates

    @staticmethod
    def get_template_by_id(template_id: int) -> Optional[Dict]:
        """Get a specific template by ID."""
        template = ProposalRepository.get_template_by_id(template_id)
        if not template:
            return None

        return {
            "id": f"tpl-{template['template_id']}",
            "template_id": template["template_id"],
            "title": template["title"],
            "category": template["category"] or "General",
            "description": template["description"] or "",
            "prompt": template["prompt"],
            "content": template.get("content", ""),
            "tags": template.get("tags", []),
            "domain": template.get("domain"),
            "tone": template.get("tone", "Professional"),
            "complexity": template.get("complexity", "Medium"),
            "metadata": template.get("metadata")
        }

    @staticmethod
    def get_categories() -> List[str]:
        """Get all available categories."""
        return ProposalRepository.get_categories()

    @staticmethod
    def get_domains() -> List[str]:
        """Get all available domains."""
        return ProposalRepository.get_domains()

    @staticmethod
    def search_templates(query: str) -> List[Dict]:
        """Search templates by query."""
        templates = ProposalRepository.search_templates(query)

        formatted_templates = []
        for template in templates:
            formatted_templates.append({
                "id": f"tpl-{template['template_id']}",
                "template_id": template["template_id"],
                "title": template["title"],
                "category": template["category"] or "General",
                "description": template["description"] or "",
                "prompt": template["prompt"],
                "tags": template.get("tags", []),
                "domain": template.get("domain"),
                "tone": template.get("tone", "Professional"),
                "complexity": template.get("complexity", "Medium")
            })

        return formatted_templates

    @staticmethod
    def generate_proposal(
        prompt: str,
        tone: str = "Professional",
        template_id: Optional[int] = None,
        max_length: int = 1000
    ) -> str:
        """
        Generate a proposal based on prompt and tone using the fine-tuned model.

        Args:
            prompt: User's proposal request
            tone: Desired tone (Professional, Casual, Persuasive, Formal)
            template_id: Optional template ID to enhance the prompt
            max_length: Maximum length of generated proposal

        Returns:
            Generated proposal text
        """
        # If template_id is provided, enhance prompt with template context
        if template_id:
            template = ProposalRepository.get_template_by_id(template_id)
            if template:
                # Combine template prompt with user prompt
                enhanced_prompt = f"{template['prompt']}\n\nUser Request: {prompt}"
            else:
                enhanced_prompt = prompt
        else:
            enhanced_prompt = prompt

        # Use the fine-tuned model for generation
        try:
            model_service = ProposalModelService()

            if model_service.is_available():
                # Generate using the model
                proposal = model_service.generate(
                    prompt=enhanced_prompt,
                    tone=tone,
                    max_length=max_length,
                    temperature=0.7,
                    top_p=0.9
                )
                return proposal
            else:
                # Fallback to placeholder if model not available
                return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

        except Exception as e:
            print(f"Error generating proposal with model: {e}")
            # Fallback to placeholder on error
            return ProposalService._generate_fallback_proposal(enhanced_prompt, tone)

    @staticmethod
    def _generate_fallback_proposal(prompt: str, tone: str) -> str:
        """Generate a fallback proposal when model is unavailable."""
        from datetime import datetime

        return f"""Proposal — {tone} Tone
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Prompt: {prompt}

---

[Note: The AI model is currently being loaded or is unavailable.
This is a fallback response. Please try again in a moment for AI-generated content.]

The proposal generation system is configured to use a fine-tuned Llama-3.2-3B-Instruct model
for generating professional proposals. If this message persists, please check:
1. Model files are in the correct location
2. Required dependencies are installed
3. Sufficient system resources are available
"""
