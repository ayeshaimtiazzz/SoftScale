# SoftScale modules overview

## Repository layout

- **`backend/`** — FastAPI app (`app.py`), configuration (`config/settings.py`), routes, controllers, services, and PostgreSQL repositories under `data/`.
- **`frontend/`** — React SPA (MUI), contexts, pages, and shared constants.
- **`backend/database/`** — SQL migrations and backups (run migrations against the same DB as `.env`).

## Backend HTTP surface

Routers are registered in `app.py`. Paths vary:

- Many legacy routes have **no `/api` prefix** (e.g. `/deals`, `/notifications`).
- Newer grouped routers use **`/api`** or **`/api/proposals`** etc.

The React app normalizes `API_BASE` to end with `/api` (`frontend/src/config/index.js`). Endpoints that live at the root (e.g. `/deals`) are called with `API_BASE.replace('/api', '')` in some pages (CRM).

### Main feature areas

| Area | Router / prefix | Role |
|------|-----------------|------|
| Auth & users | `auth_router`, `user_router` | Login, JWT, profiles linkage |
| Jobs & talent | `job_router`, `talent_router`, `api_router` (`/api`) | Listings, talent match, embeddings |
| Billing | `billing_router` | Subscriptions / payment UI support |
| Proposals | `proposal_router` (`/api/proposals`) | Proposal generation, deal-linked proposals |
| Deals (CRM) | `deal_router` (`/deals`) | CRUD deals, metrics, stage updates |
| Notes | `note_router` | `deal_notes` — internal notes on a deal |
| **Deal conversation** | `deal_conversation_router` (`/api/deals/...`) | In-app deal thread + sentiment persistence |
| Sentiment (standalone) | `sentiment_router` (`/api`) | `/api/sentiment-analysis` for ad-hoc paste |
| Notifications | `notification_router` | List/mark read; rows stored in `notifications` |

## Services layer

Services encapsulate business rules and call `data.*Repository` with `get_db()` connections.

- **`SentimentAnalysisService`** — Full pipeline (classifiers + shared Llama for JSON/summary/reply/report). Uses **parallel DistilBERT jobs** when `SENTIMENT_PARALLEL_CLASSIFIERS=true` and an **in-process result cache** when `SENTIMENT_RESULT_CACHE_ENABLED=true`.
- **`DealConversationService`** — Validates deal access (owner or linked talent), writes conversation rows, lists messages and saved analyses.
- **`NotificationService`** — Inserts rows; callers should set `related_entity_type` / `related_entity_id` consistently (see `notifications.md`).

## Frontend

- **`pages/crm/`** — Deal board, `DealDetailsModal` (overview, notes, **conversation + sentiment**, proposals).
- **`pages/sentiment-analysis/`** — Stand-alone analyzer (calls `/api/sentiment-analysis`).
- **Layout / notifications UI** — Consumes `/notifications` endpoints; deep links can use `related_entity_type` later.

## AI / model assets

- **Talent match** — Sentence-transformers embeddings under configurable cache dirs.
- **Proposal + sentiment Llama** — Local merged or base model paths from `settings` (see `.env.default`).

## Environment

Copy `.env.default` to `.env` at repo root. Backend loads it via `config/settings.py`. Sentiment-related keys include `SENTIMENT_FAST_MODE`, `SENTIMENT_PARALLEL_CLASSIFIERS`, `SENTIMENT_RESULT_CACHE_*`, and token caps when fast mode is enabled.
