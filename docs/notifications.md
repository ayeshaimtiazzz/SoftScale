# Notifications module

## Storage

Rows live in `notifications` (see `backend/data/notification_repository.py` and migrations). Important columns:

- **`user_id`** — Recipient.
- **`deal_id`**, **`proposal_id`**, **`job_id`**, **`project_id`** — Optional foreign context when the event belongs to that entity.
- **`type`** — Short string (`info`, `deal_update`, `deal_sentiment`, etc.).
- **`related_entity_type`** + **`related_entity_id`** — Cross-module pointer for UI routing and auditing.

## Conventions by module

| Module / event | `type` (example) | `related_entity_type` | `related_entity_id` | `deal_id` |
|----------------|------------------|------------------------|---------------------|-----------|
| Deal stage change | `deal_update` | `deal` | `deal_id` | `deal_id` |
| Deal conversation sentiment ready | `deal_sentiment` | `deal_sentiment` | `analysis_id` from `deal_sentiment_analyses` | `deal_id` |
| Proposal marked sent (CRM) | `proposal_sent` | `proposal` | `proposal_id` | when linked |

Always set **`deal_id`** when the notification is about a specific deal so the CRM can open the right deal from the bell menu later.

## API

- `GET /notifications` — List (optional `unread_only`).
- `GET /notifications/unread-count`
- `POST /notifications/{id}/read`
- `POST /notifications/read-all`

## Creating notifications from code

Use **`NotificationService.create_notification`** (`backend/services/notification_service.py`) rather than inserting from random call sites, so commits and `ensure_notifications_table` stay consistent.
