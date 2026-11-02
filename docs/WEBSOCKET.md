# WebSocket Documentation

Transport: Socket.IO

Default server: `http://localhost:5000`

## Authentication
Connect with a JWT using Socket.IO authentication:

`io(URL, { auth: { token } })`

## Tenant rooms
After connecting, emit:

`tenant:join` with the tenant ID.

The server verifies workspace membership before joining the tenant room.

## Events
| Event | Purpose |
|---|---|
| `tenant:join` | Request access to a tenant room |
| `task:created` | Notify clients about a new task |
| `task:updated` | Notify clients about a task update |
| `task:deleted` | Notify clients about a deleted task |

Clients should refresh board data after receiving task events.

## Reconnection
Socket.IO reconnection is enabled. The client rejoins its tenant room after connecting.
