"""Deal service."""
from typing import Dict, Any, List
from data import get_db, DealRepository, ProfileRepository

class DealService:
    """Service for deal operations."""

    @staticmethod
    def create_deal(user_id: int, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new deal."""
        conn = get_db()
        try:
            # Ensure deals table exists
            DealRepository.ensure_deals_table(conn)

            # Create deal
            deal_id = DealRepository.create_deal(conn, user_id, deal_data)

            # Get created deal
            deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)

            conn.commit()
            return deal
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_deal(deal_id: int, user_id: int) -> Dict[str, Any]:
        """Get a deal by ID."""
        conn = get_db()
        try:
            deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)
            if not deal:
                raise ValueError("Deal not found")
            return deal
        finally:
            conn.close()

    @staticmethod
    def get_all_deals(user_id: int) -> List[Dict[str, Any]]:
        """Get all deals for a user."""
        conn = get_db()
        try:
            # Ensure deals table exists
            DealRepository.ensure_deals_table(conn)

            return DealRepository.get_deals_by_user(conn, user_id)
        finally:
            conn.close()

    @staticmethod
    def update_deal(deal_id: int, user_id: int, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a deal."""
        conn = get_db()
        try:
            # Check if deal exists and belongs to user
            existing_deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)
            if not existing_deal:
                raise ValueError("Deal not found")

            # Update deal
            updated = DealRepository.update_deal(conn, deal_id, user_id, deal_data)
            if not updated:
                raise ValueError("Failed to update deal")

            # Get updated deal
            deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)

            conn.commit()
            return deal
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def update_deal_stage(deal_id: int, user_id: int, stage: str) -> Dict[str, Any]:
        """Update deal stage (for drag-and-drop)."""
        conn = get_db()
        try:
            # Check if deal exists and belongs to user
            existing_deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)
            if not existing_deal:
                raise ValueError("Deal not found")

            # Validate stage
            valid_stages = ["Prospecting", "Contacted", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"]
            if stage not in valid_stages:
                raise ValueError(f"Invalid stage. Must be one of: {', '.join(valid_stages)}")

            # If closing deal, set closed_date and status
            if stage in ["Closed Won", "Closed Lost"]:
                from datetime import date
                # Update stage, closed_date, and status in one call
                updated = DealRepository.update_deal(conn, deal_id, user_id, {
                    'stage': stage,
                    'closed_date': date.today(),
                    'status': 'closed'
                })
            else:
                # Just update stage
                updated = DealRepository.update_deal_stage(conn, deal_id, user_id, stage)

            if not updated:
                raise ValueError("Failed to update deal stage")

            # Get updated deal
            deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)

            conn.commit()
            return deal
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def delete_deal(deal_id: int, user_id: int) -> Dict[str, Any]:
        """Delete a deal."""
        conn = get_db()
        try:
            # Check if deal exists and belongs to user
            existing_deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)
            if not existing_deal:
                raise ValueError("Deal not found")

            # Delete deal
            deleted = DealRepository.delete_deal(conn, deal_id, user_id)
            if not deleted:
                raise ValueError("Failed to delete deal")

            conn.commit()
            return {"message": "Deal deleted successfully"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_deal_metrics(user_id: int) -> Dict[str, Any]:
        """Get deal metrics for a user."""
        conn = get_db()
        try:
            # Ensure deals table exists
            DealRepository.ensure_deals_table(conn)

            return DealRepository.get_deal_metrics(conn, user_id)
        finally:
            conn.close()

    @staticmethod
    def create_deal_from_project(user_id: int, project_id: int) -> Dict[str, Any]:
        """Create a deal from a project."""
        from data import JobRepository

        conn = get_db()
        try:
            # Get project details
            project = JobRepository.get_project_by_id(conn, project_id)
            if not project:
                raise ValueError("Project not found")

            # Get company info
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                raise ValueError("Company profile not found")

            # Get project owner company info
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT company_name FROM company WHERE company_id = %s
                """, (project['company_id'],))
                owner_company = cur.fetchone()
                owner_company_name = owner_company[0] if owner_company else "Unknown Company"

            # Ensure deals table exists
            DealRepository.ensure_deals_table(conn)

            # Create descriptive deal title from project
            project_title = project.get('project_title', 'Project')
            project_type = project.get('project_type', '')
            project_domain = project.get('domain', '')

            # Build descriptive title
            if project_type and project_domain:
                deal_title = f"Project Opportunity: {project_title} ({project_type} - {project_domain})"
            elif project_type:
                deal_title = f"Project Opportunity: {project_title} ({project_type})"
            elif project_domain:
                deal_title = f"Project Opportunity: {project_title} ({project_domain})"
            else:
                deal_title = f"Project Opportunity: {project_title}"

            # Create deal data from project
            deal_data = {
                "deal_title": deal_title,
                "talent_name": None,  # Will be filled when talent is matched
                "talent_id": None,
                "company_name": owner_company_name,
                "stage": "Prospecting",
                "status": "active",
                "value": float(project.get('salary', 0)) if project.get('salary') else None,
                "description": project.get('project_description', ''),
                "tags": [project_domain or "General", "Project Discovery", project_type or "Not Specified"],
                "lead_source": "project_discovery",
                "related_project_id": project_id,
                "skills": project.get('required_skills', ''),
                "experience": project.get('required_experience', ''),
                "work_model": project.get('work_mode', ''),
                "location": f"{project.get('city', '')}, {project.get('country', '')}".strip(', ') or None,
            }

            # Create deal
            deal_id = DealRepository.create_deal(conn, user_id, deal_data)

            # Get created deal
            deal = DealRepository.get_deal_by_id(conn, deal_id, user_id)

            conn.commit()
            return deal
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()
