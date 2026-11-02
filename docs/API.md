# REST API Documentation

Base URL: `http://localhost:5000/api`

## Health
- `GET /health` — API and database status.

## Authentication
- `POST /auth/register` — Register a user and create an organization and workspace.
- `POST /auth/login` — Authenticate and receive a JWT.
- `GET /me` — Get the authenticated user's profile.

Protected endpoints require:
`Authorization: Bearer <JWT>`

## Boards
- `GET /tenants/:tenantId/boards` — List workspace boards.
- `POST /tenants/:tenantId/boards` — Create a board.

## Tasks
- `POST /tenants/:tenantId/tasks` — Create a task.
- `PATCH /tenants/:tenantId/tasks/:taskId` — Update task details or move a task.
- `DELETE /tenants/:tenantId/tasks/:taskId` — Delete a task.

Task updates use a version value to detect conflicting edits.

## Activity
- `GET /tenants/:tenantId/activity` — Retrieve workspace activity history.

## Error handling
The API returns HTTP error statuses and JSON error messages for failed requests.
