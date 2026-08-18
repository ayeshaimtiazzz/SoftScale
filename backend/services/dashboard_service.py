"""Dashboard service for metrics and statistics."""
from typing import Dict, Any, List, Optional
from collections import Counter
from data import get_db, ProfileRepository, JobRepository, UserRepository

class DashboardService:
    """Service for dashboard operations."""

    @staticmethod
    def get_dashboard_metrics(user_id: int, role: str) -> Dict[str, Any]:
        """Get dashboard metrics based on user role."""
        conn = get_db()
        try:
            if role in ("company_admin", "company"):
                return DashboardService._get_company_metrics(conn, user_id)
            elif role == "freelancer":
                return DashboardService._get_freelancer_metrics(conn, user_id)
            elif role in ("job_seeker", "jobseeker"):
                return DashboardService._get_job_seeker_metrics(conn, user_id)
            else:
                return {"error": "Invalid role"}
        finally:
            conn.close()

    @staticmethod
    def _get_company_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for company admin."""
        with conn.cursor() as cur:
            # Get company_id
            company_id = ProfileRepository.get_company_by_user_id(conn, user_id)
            if not company_id:
                return {
                    "activeCandidates": 0,
                    "activeJobs": 0,
                    "activeProjects": 0,
                    "totalPosts": 0
                }

            # Count active candidates (job seekers + freelancers)
            cur.execute("""
                SELECT COUNT(*) FROM (
                    SELECT candidate_id FROM job_seeker
                    UNION ALL
                    SELECT freelancer_id FROM freelancer
                ) AS candidates
            """)
            active_candidates = cur.fetchone()[0] or 0

            # Count company's jobs
            cur.execute("SELECT COUNT(*) FROM job WHERE company_id = %s", (company_id,))
            active_jobs = cur.fetchone()[0] or 0

            # Count company's projects
            cur.execute("SELECT COUNT(*) FROM projects WHERE company_id = %s", (company_id,))
            active_projects = cur.fetchone()[0] or 0

            total_posts = active_jobs + active_projects

            return {
                "activeCandidates": active_candidates,
                "activeJobs": active_jobs,
                "activeProjects": active_projects,
                "totalPosts": total_posts
            }

    @staticmethod
    def _get_freelancer_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for freelancer."""
        with conn.cursor() as cur:
            # Get freelancer_id
            freelancer_id = ProfileRepository.get_freelancer_by_user_id(conn, user_id)
            if not freelancer_id:
                return {
                    "availableJobs": 0,
                    "availableProjects": 0,
                    "totalOpportunities": 0,
                    "profileViews": 0
                }

            # Count available jobs
            cur.execute("SELECT COUNT(*) FROM job")
            available_jobs = cur.fetchone()[0] or 0

            # Count available projects
            cur.execute("SELECT COUNT(*) FROM projects")
            available_projects = cur.fetchone()[0] or 0

            total_opportunities = available_jobs + available_projects

            return {
                "availableJobs": available_jobs,
                "availableProjects": available_projects,
                "totalOpportunities": total_opportunities,
                "profileViews": 0  # Placeholder for future implementation
            }

    @staticmethod
    def _get_job_seeker_metrics(conn, user_id: int) -> Dict[str, Any]:
        """Get metrics for job seeker."""
        with conn.cursor() as cur:
            # Get candidate_id
            candidate_id = ProfileRepository.get_job_seeker_by_user_id(conn, user_id)
            if not candidate_id:
                return {
                    "availableJobs": 0,
                    "appliedJobs": 0,
                    "savedJobs": 0,
                    "profileViews": 0
                }

            # Count available jobs
            cur.execute("SELECT COUNT(*) FROM job")
            available_jobs = cur.fetchone()[0] or 0

            return {
                "availableJobs": available_jobs,
                "appliedJobs": 0,  # Placeholder for future implementation
                "savedJobs": 0,  # Placeholder for future implementation
                "profileViews": 0  # Placeholder for future implementation
            }

    @staticmethod
    def _normalize_skills(skills_value) -> List[str]:
        if not skills_value:
            return []
        if isinstance(skills_value, list):
            return [str(s).strip().lower() for s in skills_value if str(s).strip()]
        return [s.strip().lower() for s in str(skills_value).split(",") if s.strip()]

    @staticmethod
    def _get_user_role(conn, user_id: int) -> str:
        user = UserRepository.get_user_by_id(conn, user_id)
        if not user:
            return ""
        role = (user[3] or "").strip().lower() if len(user) > 3 else ""
        if role == "jobseeker":
            role = "job_seeker"
        return role

    @staticmethod
    def _get_user_skills(conn, user_id: int, role: str) -> List[str]:
        with conn.cursor() as cur:
            if role == "freelancer":
                cur.execute("SELECT skills FROM freelancer WHERE user_id = %s LIMIT 1", (user_id,))
            elif role in ("job_seeker", "jobseeker"):
                cur.execute("SELECT skills FROM job_seeker WHERE user_id = %s LIMIT 1", (user_id,))
            else:
                return []
            row = cur.fetchone()
            return DashboardService._normalize_skills(row[0] if row else "")

    @staticmethod
    def _get_feedback_penalties(conn, user_id: int) -> Dict[str, int]:
        """Penalty scores derived from bad pricing feedback (global + user-specific)."""
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*)::int AS total_count,
                    COUNT(*) FILTER (WHERE was_correct = FALSE)::int AS bad_count
                FROM price_prediction_feedback
                """
            )
            total_count, bad_count = cur.fetchone() or (0, 0)

            cur.execute(
                """
                SELECT
                    COUNT(*)::int AS total_count,
                    COUNT(*) FILTER (WHERE was_correct = FALSE)::int AS bad_count
                FROM price_prediction_feedback
                WHERE user_id = %s
                """,
                (user_id,),
            )
            user_total_count, user_bad_count = cur.fetchone() or (0, 0)

        global_bad_ratio = (bad_count / total_count) if total_count else 0.0
        user_bad_ratio = (user_bad_count / user_total_count) if user_total_count else global_bad_ratio
        return {
            "global_penalty": round(min(25, global_bad_ratio * 30)),
            "user_penalty": round(min(20, user_bad_ratio * 25)),
            "global_bad_ratio_pct": round(global_bad_ratio * 100, 1),
            "user_bad_ratio_pct": round(user_bad_ratio * 100, 1),
        }

    @staticmethod
    def get_skill_ranking(user_id: int, role: str = None) -> Dict[str, Any]:
        conn = get_db()
        try:
            resolved_role = role or DashboardService._get_user_role(conn, user_id)
            user_skills = DashboardService._get_user_skills(conn, user_id, resolved_role)

            leads = []
            if resolved_role in ("job_seeker", "jobseeker"):
                leads = JobRepository.get_all_jobs(conn)
            elif resolved_role == "freelancer":
                leads = JobRepository.get_all_projects(conn) + JobRepository.get_all_jobs(conn)
            else:
                leads = JobRepository.get_all_projects(conn) + JobRepository.get_all_jobs(conn)

            demand_counter = Counter()
            for lead in leads:
                for skill in DashboardService._normalize_skills(lead.get("skills") or lead.get("required_skills")):
                    demand_counter[skill] += 1

            market_skills = [{"skill": skill, "demand": demand} for skill, demand in demand_counter.most_common(12)]
            matched = [item for item in market_skills if item["skill"] in user_skills][:8]
            missing = [item for item in market_skills if item["skill"] not in user_skills][:8]

            total_demand = sum(item["demand"] for item in market_skills) or 1
            matched_demand = sum(item["demand"] for item in matched)
            penalties = DashboardService._get_feedback_penalties(conn, user_id)
            base_score = round((matched_demand / total_demand) * 100)
            score = max(0, base_score - penalties["global_penalty"] - penalties["user_penalty"])

            return {
                "success": True,
                "role": resolved_role,
                "skill_rank_score": score,
                "base_skill_rank_score": base_score,
                "user_skills": user_skills,
                "market_skills": market_skills,
                "matched_skills": matched,
                "missing_skills": missing,
                "feedback_impact": {
                    "global_bad_feedback_pct": penalties["global_bad_ratio_pct"],
                    "user_bad_feedback_pct": penalties["user_bad_ratio_pct"],
                    "rank_penalty": penalties["global_penalty"] + penalties["user_penalty"],
                    "note": "Ranking is updated based on feedback. Bad feedback lowers ranking.",
                },
            }
        finally:
            conn.close()

    @staticmethod
    def get_bidding_ranking(
        user_id: int,
        role: str = None,
        project_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        conn = get_db()
        try:
            resolved_role = role or DashboardService._get_user_role(conn, user_id)
            user_skills = DashboardService._get_user_skills(conn, user_id, resolved_role)

            penalties = DashboardService._get_feedback_penalties(conn, user_id)
            total_penalty = penalties["global_penalty"] + penalties["user_penalty"]

            # Single job scope (company catalogue)
            if job_id is not None:
                job = JobRepository.get_job_by_id(conn, job_id)
                if not job:
                    return {
                        "success": True,
                        "role": resolved_role,
                        "scope": "job",
                        "job_id": job_id,
                        "ranking": [],
                        "feedback_impact": penalties,
                    }
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT COUNT(*)::int FROM job_prospects WHERE job_id = %s",
                        (job_id,),
                    )
                    prospect_count = cur.fetchone()[0] or 0
                    cur.execute(
                        """
                        SELECT COUNT(*)::int FROM deals
                        WHERE related_job_id = %s
                        """,
                        (job_id,),
                    )
                    deal_count = cur.fetchone()[0] or 0

                required_skills = DashboardService._normalize_skills(
                    job.get("skills") or job.get("required_skills")
                )
                overlap = len([s for s in required_skills if s in user_skills]) if user_skills else 0
                fit = round((overlap / max(1, len(required_skills))) * 100) if required_skills else 0
                payout = float(job.get("salary") or 0)
                base_bid_score = round(
                    min(45, payout / 700) + min(25, prospect_count * 5) + min(20, deal_count * 7) + (fit * 0.1)
                )
                bid_score = max(0, base_bid_score - total_penalty)
                row = {
                    "job_id": job_id,
                    "title": job.get("job_title") or job.get("title") or "Job",
                    "skill_fit": fit,
                    "prospects_count": prospect_count,
                    "related_deals_count": deal_count,
                    "base_bid_score": base_bid_score,
                    "bid_score": bid_score,
                }
                return {
                    "success": True,
                    "role": resolved_role,
                    "scope": "job",
                    "job_id": job_id,
                    "ranking": [row],
                    "feedback_impact": {
                        "global_bad_feedback_pct": penalties["global_bad_ratio_pct"],
                        "user_bad_feedback_pct": penalties["user_bad_ratio_pct"],
                        "bid_penalty": total_penalty,
                        "note": "Bad pricing feedback lowers bidder rankings.",
                    },
                }

            projects = JobRepository.get_all_projects(conn)
            if project_id is not None:
                projects = [p for p in projects if p.get("project_id") == project_id]

            with conn.cursor() as cur:
                cur.execute("""
                    SELECT project_id, COUNT(*)::int AS prospect_count
                    FROM project_prospects
                    GROUP BY project_id
                """)
                prospect_map = {row[0]: row[1] for row in cur.fetchall()}

                cur.execute("""
                    SELECT related_project_id, COUNT(*)::int AS deal_count
                    FROM deals
                    WHERE related_project_id IS NOT NULL
                    GROUP BY related_project_id
                """)
                deal_map = {row[0]: row[1] for row in cur.fetchall()}

            ranking_rows = []
            for p in projects:
                pid = p.get("project_id")
                required_skills = DashboardService._normalize_skills(p.get("skills") or p.get("required_skills"))
                overlap = len([s for s in required_skills if s in user_skills]) if user_skills else 0
                fit = round((overlap / max(1, len(required_skills))) * 100) if required_skills else 0
                payout = float(p.get("salary") or 0)
                prospects = prospect_map.get(pid, 0)
                related_deals = deal_map.get(pid, 0)
                base_bid_score = round(min(45, payout / 700) + min(25, prospects * 5) + min(20, related_deals * 7) + (fit * 0.1))
                bid_score = max(0, base_bid_score - total_penalty)
                ranking_rows.append({
                    "project_id": pid,
                    "title": p.get("title") or p.get("project_title") or "Project",
                    "skill_fit": fit,
                    "prospects_count": prospects,
                    "related_deals_count": related_deals,
                    "base_bid_score": base_bid_score,
                    "bid_score": bid_score,
                })

            if resolved_role in ("company", "company_admin") and project_id is None:
                ranking_rows = [row for row in ranking_rows if row.get("prospects_count", 0) > 0]
            ranking_rows.sort(key=lambda x: x["bid_score"], reverse=True)
            return {
                "success": True,
                "role": resolved_role,
                "scope": "project",
                "project_id": project_id,
                "ranking": ranking_rows[:10] if project_id is None else ranking_rows[:1],
                "feedback_impact": {
                    "global_bad_feedback_pct": penalties["global_bad_ratio_pct"],
                    "user_bad_feedback_pct": penalties["user_bad_ratio_pct"],
                    "bid_penalty": total_penalty,
                    "note": "Bad pricing feedback lowers bidder rankings.",
                },
            }
        finally:
            conn.close()

    @staticmethod
    def get_sentiment_ranking(
        user_id: int,
        role: str = None,
        project_id: Optional[int] = None,
        job_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        conn = get_db()
        try:
            resolved_role = role or DashboardService._get_user_role(conn, user_id)
            extra_where = []
            params: List[Any] = [user_id, user_id, user_id]
            if project_id is not None:
                extra_where.append("d.related_project_id = %s")
                params.append(project_id)
            if job_id is not None:
                extra_where.append("d.related_job_id = %s")
                params.append(job_id)
            scope_sql = ""
            if extra_where:
                scope_sql = " AND " + " AND ".join(extra_where)

            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT
                        dsa.analysis_id,
                        dsa.deal_id,
                        d.deal_title,
                        dsa.analysis_json,
                        dsa.created_at
                    FROM deal_sentiment_analyses dsa
                    JOIN deals d ON dsa.deal_id = d.deal_id
                    WHERE (d.user_id = %s OR d.talent_id IN (
                        SELECT freelancer_id::text FROM freelancer WHERE user_id = %s
                        UNION ALL
                        SELECT candidate_id::text FROM job_seeker WHERE user_id = %s
                    )){scope_sql}
                    ORDER BY dsa.created_at DESC
                    LIMIT 150
                    """,
                    tuple(params),
                )
                rows = cur.fetchall()

            ranking = []
            for analysis_id, deal_id, deal_title, analysis_json, created_at in rows:
                payload = analysis_json or {}
                sentiment = (payload.get("sentiment") or {}).get("label", "neutral")
                sentiment_conf = float((payload.get("sentiment") or {}).get("confidence", 0) or 0)
                urgency_level = str((payload.get("urgency") or {}).get("level", "low")).lower()
                interest_score = int(payload.get("interest_score") or 0)

                sentiment_weight = {"positive": 100, "neutral": 55, "negative": 20}.get(str(sentiment).lower(), 50)
                urgency_weight = {"high": 25, "medium": 15, "low": 5}.get(urgency_level, 5)
                rank_score = round((sentiment_weight * 0.5) + (interest_score * 0.25) + (urgency_weight * 0.15) + (sentiment_conf * 10))

                ranking.append(
                    {
                        "analysis_id": analysis_id,
                        "deal_id": deal_id,
                        "deal_title": deal_title or f"Deal {deal_id}",
                        "sentiment": sentiment,
                        "sentiment_confidence": round(sentiment_conf, 3),
                        "interest_score": interest_score,
                        "urgency_level": urgency_level,
                        "rank_score": rank_score,
                        "created_at": created_at.isoformat() if created_at else None,
                    }
                )

            ranking.sort(key=lambda x: x["rank_score"], reverse=True)
            return {
                "success": True,
                "role": resolved_role,
                "project_id": project_id,
                "job_id": job_id,
                "ranking": ranking[:15],
            }
        finally:
            conn.close()


