"""Controller for proposal-related endpoints."""
from typing import Optional, List, Dict, Any
from services.proposal_service import ProposalService
from services.deal_service import DealService
from data import get_db, ProposalRepository, DealRepository


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

            # Quick check: if model is loading, use fallback immediately
            try:
                from services.proposal_generator_service import ProposalGeneratorService
                model_service = ProposalGeneratorService()
                if hasattr(model_service, 'is_loading') and model_service.is_loading():
                    print("[CONTROLLER] Model loading in background, using fallback")
                    from services.proposal_service import ProposalService
                    proposal = ProposalService._generate_fallback_proposal(prompt.strip(), tone)
                    return {
                        "success": True,
                        "proposal": proposal,
                        "tone": tone,
                        "template_id": template_id,
                        "page_count": page_count,
                        "cover_page": cover_page,
                        "detail_level": detail_level,
                        "note": "Model is loading - using fallback response"
                    }
            except Exception as check_error:
                print(f"[CONTROLLER] Error checking model status: {check_error}")
                # Continue with normal flow

            # Generate proposal - the route layer handles timeout
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
            print(f"[CONTROLLER] Error in generate_proposal: {e}")
            import traceback
            traceback.print_exc()
            # Return fallback instead of error
            try:
                from services.proposal_service import ProposalService
                proposal = ProposalService._generate_fallback_proposal(prompt.strip() if prompt else "Proposal request", tone)
                return {
                    "success": True,
                    "proposal": proposal,
                    "tone": tone,
                    "template_id": template_id,
                    "page_count": page_count,
                    "cover_page": cover_page,
                    "detail_level": detail_level,
                    "error": str(e),
                    "note": "Error occurred - using fallback response"
                }
            except:
                return {
                    "success": False,
                    "error": str(e)
                }

    @staticmethod
    def generate_proposal_from_deal(
        user_id: int,
        deal_id: int,
        tone: str = "Professional",
        template_id: Optional[int] = None,
        page_count: Optional[str] = None,
        cover_page: Optional[str] = "without",
        detail_level: Optional[str] = "detailed",
        save_to_deal: bool = True
    ) -> Dict:
        """Generate a proposal from a deal with pre-filled context."""
        try:
            # Get deal information
            deal = DealService.get_deal(deal_id, user_id)
            if not deal:
                return {
                    "success": False,
                    "error": "Deal not found"
                }

            # Build prompt from deal data
            prompt_parts = []

            # Title and description
            if deal.get('deal_title'):
                prompt_parts.append(f"Deal Title: {deal['deal_title']}")
            if deal.get('description'):
                prompt_parts.append(f"Project Description: {deal['description']}")

            # Talent information
            if deal.get('talent_name'):
                prompt_parts.append(f"Talent Name: {deal['talent_name']}")
            if deal.get('skills'):
                prompt_parts.append(f"Required Skills: {deal['skills']}")
            if deal.get('experience'):
                prompt_parts.append(f"Experience Required: {deal['experience']}")

            # Company and value
            if deal.get('company_name'):
                prompt_parts.append(f"Company: {deal['company_name']}")
            if deal.get('value'):
                prompt_parts.append(f"Budget: ${deal['value']:,.2f}")

            # Match score if available
            if deal.get('match_score'):
                prompt_parts.append(f"Match Score: {deal['match_score']}%")

            # Expected close date
            if deal.get('expected_close_date'):
                prompt_parts.append(f"Expected Project Start: {deal['expected_close_date']}")

            prompt = "\n\n".join(prompt_parts)

            # Generate proposal
            proposal_result = ProposalService.generate_proposal(
                prompt=prompt,
                tone=tone,
                template_id=template_id,
                page_count=page_count,
                cover_page=cover_page,
                detail_level=detail_level
            )

            if not proposal_result:
                return {
                    "success": False,
                    "error": "Failed to generate proposal"
                }

            result = {
                "success": True,
                "proposal": proposal_result,
                "deal_id": deal_id,
                "deal": deal
            }

            # Save proposal to database if requested
            if save_to_deal:
                conn = get_db()
                try:
                    ProposalRepository.ensure_proposals_table(conn)

                    proposal_data = {
                        "deal_id": deal_id,
                        "title": f"Proposal for {deal.get('deal_title', 'Deal')}",
                        "content": proposal_result,
                        "status": "draft",
                        "talent_id": deal.get('talent_id'),
                        "talent_name": deal.get('talent_name'),
                        "related_job_id": deal.get('related_job_id'),
                        "related_project_id": deal.get('related_project_id'),
                        "match_score": deal.get('match_score'),
                        "template_id": template_id,
                        "tone": tone,
                        "metadata": {
                            "page_count": page_count,
                            "cover_page": cover_page,
                            "detail_level": detail_level
                        }
                    }

                    proposal_id = ProposalRepository.create_proposal(conn, user_id, proposal_data)
                    result["proposal_id"] = proposal_id
                    result["saved"] = True
                except Exception as e:
                    print(f"Error saving proposal: {e}")
                    result["saved"] = False
                    result["save_error"] = str(e)
                finally:
                    conn.close()

            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def generate_proposal_from_match(
        user_id: int,
        talent_id: str,
        talent_name: str,
        match_score: Optional[float] = None,
        skills: Optional[str] = None,
        experience: Optional[str] = None,
        job_id: Optional[int] = None,
        project_id: Optional[int] = None,
        job_title: Optional[str] = None,
        project_title: Optional[str] = None,
        job_description: Optional[str] = None,
        project_description: Optional[str] = None,
        company_name: Optional[str] = None,
        tone: str = "Professional",
        template_id: Optional[int] = None,
        page_count: Optional[str] = None,
        cover_page: Optional[str] = "without",
        detail_level: Optional[str] = "detailed",
        create_deal: bool = False
    ) -> Dict:
        """Generate a proposal from a talent match with pre-filled context."""
        try:
            # Build prompt from match data
            prompt_parts = []

            # Project/Job information
            if project_title or job_title:
                prompt_parts.append(f"Project Title: {project_title or job_title}")
            if project_description or job_description:
                prompt_parts.append(f"Project Description: {project_description or job_description}")

            # Talent information
            prompt_parts.append(f"Talent Name: {talent_name}")
            if skills:
                prompt_parts.append(f"Talent Skills: {skills}")
            if experience:
                prompt_parts.append(f"Talent Experience: {experience}")

            # Company
            if company_name:
                prompt_parts.append(f"Company: {company_name}")

            # Match score
            if match_score:
                prompt_parts.append(f"Match Score: {match_score}%")

            prompt = "\n\n".join(prompt_parts)

            # Generate proposal
            proposal_result = ProposalService.generate_proposal(
                prompt=prompt,
                tone=tone,
                template_id=template_id,
                page_count=page_count,
                cover_page=cover_page,
                detail_level=detail_level
            )

            if not proposal_result:
                return {
                    "success": False,
                    "error": "Failed to generate proposal"
                }

            result = {
                "success": True,
                "proposal": proposal_result,
                "talent_id": talent_id,
                "talent_name": talent_name
            }

            # Create deal and link proposal if requested
            if create_deal:
                conn = get_db()
                try:
                    ProposalRepository.ensure_proposals_table(conn)

                    # Create deal first
                    deal_data = {
                        "deal_title": f"Hire {talent_name} for {project_title or job_title or 'Project'}",
                        "talent_name": talent_name,
                        "talent_id": talent_id,
                        "company_name": company_name or "",
                        "stage": "Prospecting",
                        "status": "active",
                        "description": project_description or job_description or "",
                        "lead_source": "talent_match",
                        "match_score": match_score,
                        "skills": skills,
                        "experience": experience,
                        "related_job_id": job_id,
                        "related_project_id": project_id
                    }

                    deal_id = DealRepository.create_deal(conn, user_id, deal_data)
                    result["deal_id"] = deal_id

                    # Save proposal linked to deal
                    proposal_data = {
                        "deal_id": deal_id,
                        "title": f"Proposal for {talent_name}",
                        "content": proposal_result,
                        "status": "draft",
                        "talent_id": talent_id,
                        "talent_name": talent_name,
                        "related_job_id": job_id,
                        "related_project_id": project_id,
                        "match_score": match_score,
                        "template_id": template_id,
                        "tone": tone,
                        "metadata": {
                            "page_count": page_count,
                            "cover_page": cover_page,
                            "detail_level": detail_level
                        }
                    }

                    proposal_id = ProposalRepository.create_proposal(conn, user_id, proposal_data)
                    result["proposal_id"] = proposal_id
                    result["deal_created"] = True
                except Exception as e:
                    print(f"Error creating deal and saving proposal: {e}")
                    result["deal_created"] = False
                    result["create_error"] = str(e)
                finally:
                    conn.close()

            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_deal_proposals(deal_id: int, user_id: int) -> Dict:
        """Get all proposals for a deal."""
        try:
            # Extract numeric ID if needed
            if isinstance(deal_id, str) and deal_id.startswith("deal-"):
                deal_id = int(deal_id.replace("deal-", ""))

            conn = get_db()
            try:
                ProposalRepository.ensure_proposals_table(conn)
                proposals = ProposalRepository.get_proposals_by_deal(conn, deal_id, user_id)
                return {
                    "success": True,
                    "proposals": proposals,
                    "deal_id": deal_id
                }
            finally:
                conn.close()
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "proposals": []
            }

    @staticmethod
    def send_proposal(proposal_id: int, user_id: int) -> Dict:
        """Mark a proposal as sent and update deal stage."""
        try:
            conn = get_db()
            try:
                ProposalRepository.ensure_proposals_table(conn)

                # Update proposal status to 'sent'
                updated = ProposalRepository.update_proposal_status(conn, proposal_id, user_id, "sent")

                if not updated:
                    return {
                        "success": False,
                        "error": "Failed to update proposal status"
                    }

                # Get updated proposal
                proposal = ProposalRepository.get_proposal_by_id(conn, proposal_id, user_id)

                return {
                    "success": True,
                    "proposal": proposal,
                    "message": "Proposal marked as sent and deal stage updated"
                }
            finally:
                conn.close()
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
