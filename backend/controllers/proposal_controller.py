"""Controller for proposal-related endpoints."""
from typing import Optional, List, Dict
from services.proposal_service import ProposalService


class ProposalController:
    """Controller for proposal operations."""

    @staticmethod
    def get_templates(
        category: Optional[str] = None,
        domain: Optional[str] = None
    ) -> Dict:
        """Get all proposal templates."""
        try:
            templates = ProposalService.get_all_templates(category=category, domain=domain)
            categories = ProposalService.get_categories()
            domains = ProposalService.get_domains()

            return {
                "success": True,
                "templates": templates,
                "categories": categories,
                "domains": domains
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "templates": [],
                "categories": [],
                "domains": []
            }

    @staticmethod
    def get_template(template_id: int) -> Dict:
        """Get a specific template by ID."""
        try:
            template = ProposalService.get_template_by_id(template_id)
            if template:
                return {
                    "success": True,
                    "template": template
                }
            else:
                return {
                    "success": False,
                    "error": "Template not found"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def search_templates(query: str) -> Dict:
        """Search templates."""
        try:
            if not query or len(query.strip()) < 2:
                return {
                    "success": False,
                    "error": "Search query must be at least 2 characters"
                }

            templates = ProposalService.search_templates(query.strip())
            return {
                "success": True,
                "templates": templates
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "templates": []
            }

    @staticmethod
    def generate_proposal(
        prompt: str,
        tone: str = "Professional",
        template_id: Optional[int] = None,
        page_count: Optional[str] = None,
        cover_page: Optional[str] = "without",
        detail_level: Optional[str] = "detailed"
    ) -> Dict:
        """Generate a proposal."""
        try:
            if not prompt or not prompt.strip():
                return {
                    "success": False,
                    "error": "Prompt is required"
                }

            proposal = ProposalService.generate_proposal(
                prompt=prompt.strip(),
                tone=tone,
                template_id=template_id,
                page_count=page_count,
                cover_page=cover_page,
                detail_level=detail_level
            )

            return {
                "success": True,
                "proposal": proposal,
                "tone": tone,
                "template_id": template_id,
                "page_count": page_count,
                "cover_page": cover_page,
                "detail_level": detail_level
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
