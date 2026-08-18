# Deal conversation and sentiment

## Purpose

- **`deal_conversations`** — Named **threads** on a deal (create via “New thread” in CRM).
- **`deal_conversation_messages`** — Messages in a thread (`conversation_id`), separate from `deal_notes`.
- **`deal_sentiment_analyses`** — Full sentiment pipeline output saved per message (JSON + report text), joined to the message for the UI.

## Access control

`DealRepository.user_can_access_deal` allows:

- The **deal owner** (`deals.user_id`), or
- The **talent** when `deals.talent_id` matches the user’s freelancer or job-seeker profile id.

## HTTP API (all under `/api`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/deals/{deal_id}/conversations` | Body: `{ "title": "..." }`. Creates a new thread. |
| GET | `/deals/{deal_id}/conversations` | Lists threads (preview + counts). Ensures a primary thread exists. |
| GET | `/deals/{deal_id}/conversations/{id}/thread` | Messages **with** latest sentiment joined per row (`sentiment` object or null). |
| POST | `/deals/{deal_id}/conversation/messages` | Body: `{ "body": "...", "conversation_id": optional }`. Queues background sentiment. |
| GET | `/deals/{deal_id}/conversation/messages` | All messages on deal (legacy flat list). |
| GET | `/deals/{deal_id}/sentiment-analyses` | Latest saved analyses (up to 100). |

## Background processing

After POST returns, FastAPI **`BackgroundTasks`** runs `process_deal_message_sentiment` (`backend/services/deal_sentiment_worker.py`):

1. Loads message text.
2. Runs **`SentimentAnalysisService.analyze_message`** (same engine as `/api/sentiment-analysis`).
3. Inserts **`deal_sentiment_analyses`** and sets `deal_conversation_messages.sentiment_status` to `completed` or `failed`.
4. Creates **notifications** for the author and (if different) the deal owner (`type=deal_sentiment`, `related_entity_type=deal_sentiment`).

## DB migration

Run `backend/database/migration_deal_conversation_sentiment.sql` on PostgreSQL if tables are not yet created. Repositories also **`CREATE TABLE IF NOT EXISTS`** on first use for dev friendliness.

## Frontend

CRM **`DealDetailsModal`** → tab **Conversation**: send messages, see status chips, and browse saved analyses.

## Performance notes

Standalone and deal-linked sentiment share:

- **Parallel classifiers** (sentiment + intent) when enabled in settings.
- **In-process cache** keyed by normalized text hash (repeat messages skip Llama work until TTL expires).

Llama generations remain **sequential** on a single GPU; threading does not parallelize multiple `generate` calls on one model safely without batching infrastructure.
