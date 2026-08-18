"""
One-off demo seed for three fixed accounts (profiles, jobs/projects, deals, conversations).

Run from repo root or backend:
  python scripts/seed_demo_three_accounts.py

Requires DB env (.env) and optional embedding models for profile/job refresh.

Env:
  SEED_SKIP_EMBEDDINGS=1  — skip freelancer/job_seeker embedding refresh (faster).
  SEED_FORCE=1           — if demo posts/deals already exist for this company, seed again anyway.
  SEED_APPEND_ANCILLARY=1 — if demo posts already exist, only add prospects + deal tabs data
                            (notes, activity, proposals, pricing) for the latest demo deals.

Re-running without SEED_FORCE / SEED_APPEND_ANCILLARY exits early if marker job+project exist.
"""
from __future__ import annotations

import json
import os
import sys

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from config import settings  # noqa: E402
from data import get_db, ProfileRepository, UserRepository  # noqa: E402
from data.deal_repository import DealRepository  # noqa: E402
from data.deal_conversation_repository import DealConversationRepository  # noqa: E402
from data.deal_sentiment_repository import DealSentimentRepository  # noqa: E402
from data.prospect_repository import ProspectRepository  # noqa: E402
from data.note_repository import NoteRepository  # noqa: E402
from data.proposal_repository import ProposalRepository  # noqa: E402
from data.deal_activity_repository import DealActivityRepository  # noqa: E402
from data.price_prediction_repository import PricePredictionRepository  # noqa: E402
from services.job_service import JobService  # noqa: E402

# --- Accounts (as requested) ---
EMAIL_FREELANCER = "mnk+2@abc.com"
EMAIL_JOB_SEEKER = "mnk+1@abc.com"
EMAIL_COMPANY = "mnk+5@abc.com"

SHARED_SKILLS = (
    "React, TypeScript, Node.js, Python, PostgreSQL, AWS, Docker, "
    "REST APIs, GraphQL, CI/CD, System Design"
)


def _norm_role(r: str | None) -> str:
    if not r:
        return ""
    x = str(r).strip().lower()
    if x in ("job_seeker", "jobseeker"):
        return "jobseeker"
    if x in ("company_admin", "company", "company admin"):
        return "company_admin"
    return x


def _mock_analysis(
    label: str,
    intent: str,
    interest: int,
    summary: str,
) -> dict:
    return {
        "sentiment": {"label": label, "confidence": 0.84},
        "urgency": {"level": "medium", "recommended_response_time": "48 hours"},
        "confidence_scores": {"intent_confidence": 0.81},
        "intent": intent,
        "interest_score": interest,
        "strategy": "Mirror constraints, narrow scope, propose a concrete next step.",
        "summary": summary,
        "suggested_reply": (
            "Thanks for the detail — can we lock scope for phase 1 and revisit pricing "
            "once integrations are confirmed?"
        ),
        "key_signals": ["Budget discussion", "Timeline pressure", "Stakeholder alignment"],
        "next_steps": ["Share revised SOW", "30-minute alignment call", "Confirm start date"],
        "risks": ["Scope creep on integrations", "Third-party API availability"],
    }


def _pick_enum_label(conn, enum_name: str, preferred: list[str]) -> str:
    """Return first preferred value that exists on the given PostgreSQL enum."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT enumlabel FROM pg_enum
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = %s)
                ORDER BY enumsortorder
                """,
                (enum_name,),
            )
            labels = [row[0] for row in cur.fetchall()]
    except Exception:  # noqa: BLE001
        labels = []
    if not labels:
        return preferred[0]
    lower_map = {x.lower(): x for x in labels}
    for p in preferred:
        if p in labels:
            return p
        if p.lower() in lower_map:
            return lower_map[p.lower()]
    return labels[0]


def _refresh_talent_embeddings(conn, table: str, user_id: int) -> None:
    try:
        from utils.embeddings import (  # noqa: WPS433
            generate_and_store_embedding_from_profile,
            generate_and_store_skill_embedding,
        )

        if table == "freelancer":
            eid = ProfileRepository.get_freelancer_by_user_id(conn, user_id)
            kind = "freelancer"
        else:
            eid = ProfileRepository.get_job_seeker_by_user_id(conn, user_id)
            kind = "job_seeker"
        if eid is None:
            return
        generate_and_store_embedding_from_profile(eid, kind, conn, settings.EMBEDDINGS_DIR)
        generate_and_store_skill_embedding(eid, kind, conn)
        conn.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[seed] Embedding refresh skipped ({table}): {exc}")


def _fetch_job_id(conn, company_id: int, title: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT job_id FROM job WHERE company_id = %s AND job_title = %s LIMIT 1",
            (company_id, title),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def _fetch_project_id(conn, company_id: int, title: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT project_id FROM projects WHERE company_id = %s AND project_title = %s LIMIT 1",
            (company_id, title),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def _resolve_demo_deal_ids(conn, company_id: int) -> list[int] | None:
    """Return [portal deal, offer deal, integration deal] if tagged demo deals exist."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT deal_id, deal_title FROM deals
            WHERE company_id = %s AND tags IS NOT NULL AND 'demo' = ANY(tags)
            ORDER BY deal_id ASC
            """,
            (company_id,),
        )
        rows = cur.fetchall()
    portal = offer = spike = None
    for did, title in rows:
        t = (title or "").lower()
        if portal is None and "portal" in t:
            portal = int(did)
        elif offer is None and ("full-time" in t or "offer" in t):
            offer = int(did)
        elif spike is None and "integration" in t:
            spike = int(did)
    if portal and offer and spike:
        return [portal, offer, spike]
    return None


def _seed_prospects(
    conn,
    *,
    job_fullstack: int,
    job_backend: int,
    job_platform: int,
    proj_react: int,
    proj_api: int,
    proj_seo: int,
    uid_fl: int,
    uid_js: int,
    fid: int,
    cid: int,
) -> None:
    ProspectRepository.ensure_prospects_tables(conn)
    job_specs = [
        (job_fullstack, uid_fl, str(fid), "freelancer"),
        (job_backend, uid_fl, str(fid), "freelancer"),
        (job_platform, uid_js, str(cid), "job_seeker"),
        (job_fullstack, uid_js, str(cid), "job_seeker"),
    ]
    for jid, uid, tid, ttype in job_specs:
        ProspectRepository.create_job_prospect(conn, jid, uid, tid, ttype)
    proj_specs = [
        (proj_react, uid_fl, str(fid), "freelancer"),
        (proj_api, uid_fl, str(fid), "freelancer"),
        (proj_seo, uid_js, str(cid), "job_seeker"),
    ]
    for pid, uid, tid, ttype in proj_specs:
        ProspectRepository.create_project_prospect(conn, pid, uid, tid, ttype)
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE job_prospects SET status = %s
            WHERE job_id = %s AND user_id = %s
            """,
            ("shortlisted", job_fullstack, uid_js),
        )
        cur.execute(
            """
            UPDATE project_prospects SET status = %s
            WHERE project_id = %s AND user_id = %s
            """,
            ("in_review", proj_react, uid_fl),
        )
    conn.commit()


def _deal_tabs_already_seeded(conn, company_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM deal_notes n
            JOIN deals d ON n.deal_id = d.deal_id
            WHERE d.company_id = %s AND n.note_text LIKE %s
            LIMIT 1
            """,
            (company_id, "%Internal: strong React%"),
        )
        return cur.fetchone() is not None


def _seed_deal_tabs(
    conn,
    *,
    uid_co: int,
    company_id: int,
    deal_ids: list[int],
    job_fullstack: int,
    proj_react: int,
    job_backend: int,
    proj_api: int,
    fid: int,
    cid: int,
    fl_name: str,
    js_name: str,
    company_name: str,
) -> None:
    if _deal_tabs_already_seeded(conn, company_id):
        print("[seed] Deal notes/activity/proposals/pricing already present — skipping tab seed.")
        return

    NoteRepository.ensure_notes_table(conn)
    ProposalRepository.ensure_proposals_table(conn)
    DealActivityRepository.ensure_table(conn)
    PricePredictionRepository.ensure_tables(conn)

    demo_html = (
        "<h3>Demo proposal</h3><p><strong>Executive summary</strong></p>"
        "<p>Phased delivery aligned to your milestones, with clear acceptance criteria per phase.</p>"
        "<ul><li>Phase 1: foundations and access</li>"
        "<li>Phase 2: core workflows</li><li>Phase 3: hardening and handover</li></ul>"
        "<p>Pricing and assumptions are indicative for the demo environment.</p>"
    )

    notes_plan = [
        (
            "Internal: strong React/TS match. Confirm GraphQL ownership before signing SOW. "
            "Risk: SSO vendor slip — cap change orders in writing.",
        ),
        (
            "Comp band discussed aligns with budget. HR to send written remote policy + review cycle. "
            "Next: formal offer PDF once candidate confirms title.",
        ),
        (
            "Keep API sprint as follow-on to portal milestone. Dependencies: partner webhooks + API keys. "
            "Schedule scoping call if portal M1 green.",
        ),
    ]

    for i, deal_id in enumerate(deal_ids):
        for line in (notes_plan[i],):
            NoteRepository.create_note(conn, deal_id, uid_co, line)

        DealActivityRepository.add_event(
            conn,
            deal_id=deal_id,
            user_id=uid_co,
            event_type="demo_seed",
            title="Demo activity — discovery call",
            description="Captured requirements and success metrics for the next checkpoint.",
            metadata={"source": "seed_demo_three_accounts"},
        )
        DealActivityRepository.add_event(
            conn,
            deal_id=deal_id,
            user_id=uid_co,
            event_type="stage_review",
            title="Stage checkpoint logged",
            description="Reviewed blockers and aligned on next stakeholder touchpoint.",
            metadata={},
        )

        status = "sent" if i == 1 else "draft"
        if i == 1:
            prop_title = f"{company_name} — {js_name} (full-time offer)"
        elif i == 2:
            prop_title = f"{company_name} — {fl_name} (integration spike)"
        else:
            prop_title = f"{company_name} — {fl_name} (portal SOW)"
        pid = ProposalRepository.create_proposal(
            conn,
            uid_co,
            {
                "deal_id": deal_id,
                "title": prop_title,
                "content": demo_html,
                "status": status,
                "talent_id": str(fid) if i != 1 else str(cid),
                "talent_name": fl_name if i != 1 else js_name,
                "related_job_id": job_fullstack if i == 1 else (job_backend if i == 2 else None),
                "related_project_id": proj_react if i == 0 else (proj_api if i == 2 else None),
                "match_score": 88.0 if i == 0 else (86.0 if i == 1 else 79.0),
                "tone": "Professional",
                "metadata": {"demo": True, "seed": "seed_demo_three_accounts"},
            },
        )
        if i == 0:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO proposal_versions (proposal_id, content, version_number, created_by, change_notes)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (pid, demo_html + "<p><em>Revision A: tightened milestones.</em></p>", 2, uid_co, "Demo revision"),
                )
            conn.commit()

        pred_in = {
            "domain": "SaaS",
            "complexity": "medium",
            "hours_estimate": 420 if i == 0 else (320 if i == 2 else 200),
        }
        base = 38000 + i * 4000
        result_json = {
            "final_price": base + 2500,
            "rule_based_price": base,
            "ml_price": base + 1800,
            "confidence_score": 0.78 + i * 0.03,
        }
        PricePredictionRepository.insert_prediction(
            conn,
            user_id=uid_co,
            deal_id=deal_id,
            source="seed_demo_three_accounts",
            project_description=f"Demo pricing run for deal {deal_id} ({company_name})",
            input_json=pred_in,
            result_json=result_json,
        )


def main() -> None:
    conn = get_db()
    try:
        fl = UserRepository.get_user_by_email(conn, EMAIL_FREELANCER)
        js = UserRepository.get_user_by_email(conn, EMAIL_JOB_SEEKER)
        co = UserRepository.get_user_by_email(conn, EMAIL_COMPANY)
        if not fl or not js or not co:
            missing = [
                e
                for e, row in [
                    (EMAIL_FREELANCER, fl),
                    (EMAIL_JOB_SEEKER, js),
                    (EMAIL_COMPANY, co),
                ]
                if not row
            ]
            raise SystemExit(f"Missing user row(s) for: {', '.join(missing)}")

        uid_fl, _, role_fl = fl[0], fl[1], fl[2]
        uid_js, _, role_js = js[0], js[1], js[2]
        uid_co, _, role_co = co[0], co[1], co[2]

        if _norm_role(role_fl) != "freelancer":
            print(f"[warn] Expected freelancer role for {EMAIL_FREELANCER}, got {role_fl!r}")
        if _norm_role(role_js) != "jobseeker":
            print(f"[warn] Expected jobseeker role for {EMAIL_JOB_SEEKER}, got {role_js!r}")
        if _norm_role(role_co) != "company_admin":
            print(f"[warn] Expected company_admin for {EMAIL_COMPANY}, got {role_co!r}")

        fid = ProfileRepository.get_freelancer_by_user_id(conn, uid_fl)
        cid = ProfileRepository.get_job_seeker_by_user_id(conn, uid_js)
        comp_id = ProfileRepository.get_company_by_user_id(conn, uid_co)
        if fid is None or cid is None or comp_id is None:
            raise SystemExit(
                "Profiles incomplete: need freelancer, job_seeker, and company rows for those users."
            )

        company_name = "DemoCorp"
        with conn.cursor() as cur:
            cur.execute(
                "SELECT company_name FROM company WHERE company_id = %s",
                (comp_id,),
            )
            row = cur.fetchone()
            if row and row[0]:
                company_name = row[0]

        demo_domain = "SaaS"

        exp_freelancer = _pick_enum_label(
            conn, "experience_level_enum", ["expert", "senior", "Senior", "intermediate"]
        )
        exp_jobseeker = _pick_enum_label(
            conn, "experience_level_enum", ["intermediate", "expert", "mid", "Mid-Senior"]
        )
        avail_freelancer = _pick_enum_label(
            conn, "availability_enum", ["full-time", "full_time", "Full-time", "freelance"]
        )
        wp_remote = _pick_enum_label(
            conn, "work_preference_enum", ["remote", "Remote", "hybrid", "Hybrid", "on_site"]
        )

        fl_projects = json.dumps(
            [
                {
                    "title": "Realtime analytics dashboard",
                    "stack": "React, TypeScript, Node.js",
                    "outcome": "40% faster reporting for ops",
                },
                {
                    "title": "Billing integrations",
                    "stack": "Python, PostgreSQL, Stripe",
                    "outcome": "Automated reconciliation",
                },
            ]
        )

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE freelancer SET
                    skills = %s,
                    professional_summary = %s,
                    domain = %s,
                    experience_level = %s,
                    hourly_rate = %s,
                    work_preference = %s,
                    availability = %s,
                    projects = %s,
                    portfolio = COALESCE(NULLIF(portfolio, ''), %s)
                WHERE user_id = %s
                """,
                (
                    SHARED_SKILLS,
                    "Full-stack engineer focused on SaaS dashboards, APIs, and cloud-native delivery.",
                    demo_domain,
                    exp_freelancer,
                    85.0,
                    wp_remote,
                    avail_freelancer,
                    fl_projects,
                    "https://demo-portfolio.example.com",
                    uid_fl,
                ),
            )
            cur.execute(
                """
                UPDATE job_seeker SET
                    skills = %s,
                    career_objective = %s,
                    domain = %s,
                    experience_level = %s,
                    expected_salary = %s
                WHERE user_id = %s
                """,
                (
                    SHARED_SKILLS,
                    "Senior product-minded engineer seeking backend/full-stack roles with modern stacks.",
                    demo_domain,
                    exp_jobseeker,
                    105000.0,
                    uid_js,
                ),
            )
        conn.commit()
        if os.getenv("SEED_SKIP_EMBEDDINGS", "").strip().lower() not in ("1", "true", "yes"):
            _refresh_talent_embeddings(conn, "freelancer", uid_fl)
            _refresh_talent_embeddings(conn, "job_seeker", uid_js)
        else:
            print("[seed] SEED_SKIP_EMBEDDINGS set — skipping profile embedding refresh.")

        force = os.getenv("SEED_FORCE", "").strip().lower() in ("1", "true", "yes")
        append_only = os.getenv("SEED_APPEND_ANCILLARY", "").strip().lower() in ("1", "true", "yes")
        marker_job = "Senior Full-Stack Engineer"
        marker_proj = "Customer Portal Revamp"
        if not force:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT j.job_id, p.project_id
                    FROM job j
                    JOIN projects p ON p.company_id = j.company_id
                    WHERE j.company_id = %s
                      AND j.job_title = %s
                      AND p.project_title = %s
                    LIMIT 1
                    """,
                    (comp_id, marker_job, marker_proj),
                )
                existing = cur.fetchone()
            if existing:
                if append_only:
                    jf = _fetch_job_id(conn, comp_id, marker_job)
                    jb = _fetch_job_id(conn, comp_id, "Backend Engineer (APIs & Data)")
                    jp = _fetch_job_id(conn, comp_id, "Software Engineer — Platform")
                    pr = _fetch_project_id(conn, comp_id, marker_proj)
                    pa = _fetch_project_id(conn, comp_id, "Partner Integration Sprint")
                    ps = _fetch_project_id(conn, comp_id, "Performance & SEO uplift")
                    dds = _resolve_demo_deal_ids(conn, comp_id)
                    if not all([jf, jb, jp, pr, pa, ps, dds]):
                        print(
                            "[seed] SEED_APPEND_ANCILLARY: resolve demo IDs failed. "
                            "Run full seed once, or set SEED_FORCE=1."
                        )
                        return
                    fl_n, js_n = "Freelancer", "Job seeker"
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT full_name FROM freelancer WHERE freelancer_id = %s",
                            (fid,),
                        )
                        r = cur.fetchone()
                        if r and r[0]:
                            fl_n = r[0]
                        cur.execute(
                            "SELECT full_name FROM job_seeker WHERE candidate_id = %s",
                            (cid,),
                        )
                        r2 = cur.fetchone()
                        if r2 and r2[0]:
                            js_n = r2[0]
                    _seed_prospects(
                        conn,
                        job_fullstack=jf,
                        job_backend=jb,
                        job_platform=jp,
                        proj_react=pr,
                        proj_api=pa,
                        proj_seo=ps,
                        uid_fl=uid_fl,
                        uid_js=uid_js,
                        fid=fid,
                        cid=cid,
                    )
                    _seed_deal_tabs(
                        conn,
                        uid_co=uid_co,
                        company_id=comp_id,
                        deal_ids=dds,
                        job_fullstack=jf,
                        proj_react=pr,
                        job_backend=jb,
                        proj_api=pa,
                        fid=fid,
                        cid=cid,
                        fl_name=fl_n,
                        js_name=js_n,
                        company_name=company_name,
                    )
                    print("[seed] SEED_APPEND_ANCILLARY done (prospects + deal tabs).")
                    return

                print(
                    "[seed] Demo listings already present (same company). "
                    "Set SEED_FORCE=1 to add another batch, or SEED_APPEND_ANCILLARY=1 "
                    "to add prospects/notes/activity/proposals/pricing only."
                )
                return

        jobs_projects_log: list[tuple[str, int]] = []

        def post_job(title: str, desc: str, domain: str, skills: str, salary: float) -> int:
            r = JobService.post_job(
                user_id=uid_co,
                job_title=title,
                job_description=desc,
                job_type="full-time",
                required_experience="3-6 years",
                required_skills=skills,
                work_mode="remote",
                salary=salary,
                preferred_domain=domain,
            )
            jid = int(r["job_id"])
            jobs_projects_log.append(("job", jid))
            return jid

        def post_project(
            title: str,
            desc: str,
            domain: str,
            skills: str,
            salary: int,
            duration: str,
        ) -> int:
            r = JobService.post_project(
                user_id=uid_co,
                project_title=title,
                project_description=desc,
                project_type="milestone",
                payment_type="fixed",
                work_mode="hybrid",
                required_experience="3-5 years",
                required_skills=skills,
                team_size=3,
                duration=duration,
                domain=domain,
                salary=salary,
            )
            pid = int(r["project_id"])
            jobs_projects_log.append(("project", pid))
            return pid

        job_fullstack = post_job(
            "Senior Full-Stack Engineer",
            "Own features across React/TypeScript and Node services; partner with product on delivery.",
            demo_domain,
            SHARED_SKILLS,
            115000.0,
        )
        job_backend = post_job(
            "Backend Engineer (APIs & Data)",
            "Design REST/GraphQL APIs, PostgreSQL schema work, and AWS deployments.",
            demo_domain,
            "Python, PostgreSQL, AWS, Docker, REST APIs, System Design",
            98000.0,
        )
        job_platform = post_job(
            "Software Engineer — Platform",
            "Build internal tooling and integrations; collaborate with DevOps on CI/CD.",
            demo_domain,
            "Python, Docker, CI/CD, PostgreSQL, React",
            92000.0,
        )

        proj_react = post_project(
            "Customer Portal Revamp",
            "Greenfield React portal with auth, billing views, and admin workflows.",
            demo_domain,
            "React, TypeScript, Node.js, GraphQL, PostgreSQL",
            42000,
            "3 months",
        )
        proj_api = post_project(
            "Partner Integration Sprint",
            "Short milestone project: third-party APIs, webhooks, observability.",
            demo_domain,
            "Python, REST APIs, AWS, Docker",
            28000,
            "8 weeks",
        )
        proj_seo = post_project(
            "Performance & SEO uplift",
            "Improve Core Web Vitals and API latency for marketing site and app shell.",
            demo_domain,
            "React, TypeScript, Node.js, System Design",
            35000,
            "10 weeks",
        )

        DealRepository.ensure_deals_table(conn)
        DealConversationRepository.ensure_tables(conn)
        DealSentimentRepository.ensure_tables(conn)

        fl_name = "Freelancer Talent"
        js_name = "Job Seeker Talent"
        with conn.cursor() as cur:
            cur.execute(
                "SELECT full_name FROM freelancer WHERE freelancer_id = %s",
                (fid,),
            )
            r = cur.fetchone()
            if r and r[0]:
                fl_name = r[0]
            cur.execute(
                "SELECT full_name FROM job_seeker WHERE candidate_id = %s",
                (cid,),
            )
            r2 = cur.fetchone()
            if r2 and r2[0]:
                js_name = r2[0]

        deals_spec = [
            {
                "deal_title": f"{company_name} × {fl_name} — Portal build",
                "talent_name": fl_name,
                "talent_id": str(fid),
                "company_name": company_name,
                "stage": "Negotiation",
                "status": "active",
                "value": 47500.0,
                "probability": 55,
                "match_score": 91.0,
                "related_job_id": None,
                "related_project_id": proj_react,
                "description": "Milestone project; negotiating scope split and payment schedule.",
                "tags": ["demo", "portal", "freelancer"],
                "lead_source": "talent_match",
                "skills": SHARED_SKILLS,
                "experience": exp_freelancer,
                "location": "Remote",
                "work_model": "remote",
                "deal_health_score": 72,
                "recommended_actions": [
                    "Confirm milestone dates",
                    "Align on change-request policy",
                ],
                "ai_insights": {
                    "summary": "Strong skill fit on React/Node; risk is integration scope.",
                    "fit": "high",
                },
            },
            {
                "deal_title": f"{company_name} × {js_name} — Full-time offer",
                "talent_name": js_name,
                "talent_id": str(cid),
                "company_name": company_name,
                "stage": "Proposal Sent",
                "status": "active",
                "value": float(105000),
                "probability": 60,
                "match_score": 86.0,
                "related_job_id": job_fullstack,
                "related_project_id": None,
                "description": "Full-time pipeline; comp and title under discussion.",
                "tags": ["demo", "full-time", "job_seeker"],
                "lead_source": "apply_flow",
                "skills": SHARED_SKILLS,
                "experience": exp_jobseeker,
                "location": "Hybrid possible",
                "work_model": "hybrid",
                "deal_health_score": 68,
                "recommended_actions": [
                    "Send formal offer draft",
                    "Clarify equity if applicable",
                ],
                "ai_insights": {
                    "summary": "Good domain alignment; clarify leveling vs compensation band.",
                    "fit": "medium-high",
                },
            },
            {
                "deal_title": f"{company_name} × {fl_name} — Integration spike",
                "talent_name": fl_name,
                "talent_id": str(fid),
                "company_name": company_name,
                "stage": "Contacted",
                "status": "active",
                "value": 29000.0,
                "probability": 35,
                "match_score": 79.0,
                "related_job_id": job_backend,
                "related_project_id": proj_api,
                "description": "Linked discovery: same talent may staff API sprint after milestone A.",
                "tags": ["demo", "integration", "linked"],
                "lead_source": "catalog",
                "skills": "Python, REST APIs, AWS",
                "experience": exp_freelancer,
                "location": "Remote",
                "work_model": "remote",
                "deal_health_score": 58,
                "recommended_actions": ["Book technical scoping call", "Share API specs"],
                "ai_insights": {
                    "summary": "Secondary thread tied to backend job + integration project.",
                    "fit": "medium",
                },
            },
        ]

        deal_ids: list[int] = []
        for spec in deals_spec:
            did = DealRepository.create_deal(conn, uid_co, spec)
            deal_ids.append(did)

        # --- Conversations + mock sentiment (completed) ---
        conv_plans: list[tuple[int, list[tuple[int, str]], list[tuple[str, list[tuple[int, str]]]]]] = []

        # Deal 0: two threads
        conv_plans.append(
            (
                deal_ids[0],
                [
                    (
                        uid_co,
                        f"Hi {fl_name.split()[0] if fl_name else 'there'} — excited about the portal. "
                        "Can we align on milestone 1 deliverables by next Friday?",
                    ),
                    (
                        uid_fl,
                        "Thanks — milestone 1 can cover auth shell + billing list views. "
                        "I need clarity on the GraphQL schema ownership on your side.",
                    ),
                    (
                        uid_co,
                        "Fair point. We can own the schema draft if you take migrations and codegen. "
                        "Budget-wise we're targeting the fixed fee but need a small buffer if SSO slips.",
                    ),
                    (
                        uid_fl,
                        "Understood. If SSO slips, I'd cap extra work at 12 hours with written approval. "
                        "Can we document that in the SOW?",
                    ),
                ],
                [
                    (
                        "Commercial terms",
                        [
                            (
                                uid_co,
                                "We typically pay 40/30/30 across milestones; open to 50/25/25 if we lock dates.",
                            ),
                            (
                                uid_fl,
                                "50/25/25 works if kickoff is confirmed. Please add a late-payment clause (net-15).",
                            ),
                        ],
                    )
                ],
            )
        )

        # Deal 1: job seeker
        conv_plans.append(
            (
                deal_ids[1],
                [
                    (
                        uid_co,
                        "We'd like to move forward with a full-stack offer near the discussed band. "
                        "Does the senior full-stack scope still match what you want day-to-day?",
                    ),
                    (
                        uid_js,
                        "Yes — I'd focus on product-facing features and API work. "
                        "Can we confirm annual review and remote policy in writing?",
                    ),
                    (
                        uid_co,
                        "Absolutely. I'll attach HR snippets. One constraint: on-site quarterly sync (travel covered).",
                    ),
                    (
                        uid_js,
                        "Quarterly is fine. Please confirm the exact compensation breakdown (base vs bonus).",
                    ),
                ],
                [],
            )
        )

        # Deal 2: integration
        conv_plans.append(
            (
                deal_ids[2],
                [
                    (
                        uid_co,
                        "We're weighing the API sprint after the portal milestone. Are you open to a 6-week window?",
                    ),
                    (
                        uid_fl,
                        "Possible if dependencies from the vendor API team are cleared. "
                        "What's the hard deadline on webhooks?",
                    ),
                    (
                        uid_co,
                        "Marketing wants partners live before Q3 launch — that's the pressure point.",
                    ),
                ],
                [],
            )
        )

        for deal_id, main_msgs, extra_threads in conv_plans:
            cid_main = DealConversationRepository.get_or_create_primary_conversation(
                conn, deal_id, uid_co
            )
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE deal_conversations SET title = %s WHERE conversation_id = %s",
                    ("Main negotiation", cid_main),
                )
            conn.commit()

            thread_messages: list[tuple[int, int, str, int]] = []
            for author_uid, body in main_msgs:
                mid = DealConversationRepository.insert_message(
                    conn, deal_id, cid_main, author_uid, body
                )
                thread_messages.append((cid_main, mid, body, author_uid))

            for title, pairs in extra_threads:
                tid = DealConversationRepository.insert_conversation(conn, deal_id, uid_co, title)
                for author_uid, body in pairs:
                    mid = DealConversationRepository.insert_message(
                        conn, deal_id, tid, author_uid, body
                    )
                    thread_messages.append((tid, mid, body, author_uid))

            labels = ["positive", "neutral", "neutral", "positive", "neutral", "positive"]
            intents = [
                "schedule_next_step",
                "clarify_requirements",
                "negotiate_terms",
                "negotiate_terms",
                "confirm_policy",
                "negotiate_terms",
            ]
            for idx, (_, mid, body, author_uid) in enumerate(thread_messages):
                label = labels[idx % len(labels)]
                intent = intents[idx % len(intents)]
                interest = 62 + (idx * 5) % 28
                summary = (
                    f"Demo analysis #{idx + 1}: tone is {label}; intent suggests {intent.replace('_', ' ')}."
                )
                analysis = _mock_analysis(label, intent, interest, summary)
                report = (
                    "1. Overall sentiment: professional and collaborative.\n"
                    "2. Intent: move toward a concrete decision with bounded scope.\n"
                    f"3. Interest score: {interest}/100.\n"
                    "4. Signals: scope control, timeline, commercial terms.\n"
                    "5. Next step: confirm written agreement on boundaries and payment terms."
                )
                DealSentimentRepository.insert_analysis(
                    conn,
                    deal_id=deal_id,
                    conversation_message_id=mid,
                    user_id=author_uid,
                    message_excerpt=body,
                    analysis=analysis,
                    report_text=report,
                    status="completed",
                    error_detail=None,
                )
                DealConversationRepository.update_sentiment_status(conn, mid, "completed")

        _seed_prospects(
            conn,
            job_fullstack=job_fullstack,
            job_backend=job_backend,
            job_platform=job_platform,
            proj_react=proj_react,
            proj_api=proj_api,
            proj_seo=proj_seo,
            uid_fl=uid_fl,
            uid_js=uid_js,
            fid=fid,
            cid=cid,
        )
        _seed_deal_tabs(
            conn,
            uid_co=uid_co,
            company_id=comp_id,
            deal_ids=deal_ids,
            job_fullstack=job_fullstack,
            proj_react=proj_react,
            job_backend=job_backend,
            proj_api=proj_api,
            fid=fid,
            cid=cid,
            fl_name=fl_name,
            js_name=js_name,
            company_name=company_name,
        )

        print("[seed] Done.")
        print(f"  Company: {company_name} (user_id={uid_co}, company_id={comp_id})")
        print(f"  Freelancer id={fid} user_id={uid_fl}")
        print(f"  Job seeker candidate_id={cid} user_id={uid_js}")
        print(f"  Jobs/projects: {jobs_projects_log}")
        print(f"  Deals: {deal_ids}")
        print("  Also seeded: job/project prospects, deal notes, activity, proposals, price predictions.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
