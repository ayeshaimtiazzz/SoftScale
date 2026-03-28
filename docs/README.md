# SoftScale documentation

This folder describes how the SoftScale monorepo is structured and how major features connect.

| Document | Contents |
|----------|----------|
| [modules-overview.md](./modules-overview.md) | Backend routers, services, data layer, and frontend areas |
| [notifications.md](./notifications.md) | How notifications are created and how `related_entity_*` links to features |
| [deal-conversation-sentiment.md](./deal-conversation-sentiment.md) | Deal thread messages, persisted sentiment, and background processing |

Apply SQL migrations under `backend/database/` to your PostgreSQL instance when adding new tables (see each migration file).
