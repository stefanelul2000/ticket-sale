# Request / Response Examples

## Authentication

### `POST /login`
Request
```json
{
  "username": "admin",
  "password": "secret",
  "remember": true
}
```
Response `200`
```json
{
  "two_factor": false,
  "user": {
    "id": 1,
    "name": "Site Owner",
    "username": "admin",
    "role_id": 6
  }
}
```

## Users

### `POST /users`
Request
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "username": "janedoe",
  "password": "changeme123",
  "role_id": 5
}
```
Response `201`
```json
{
  "id": 12,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "username": "janedoe",
  "role_id": 5,
  "active": true
}
```

## Tickets

### `POST /tickets/generate`
Request
```json
{
  "event_id": 4,
  "ticket_type_id": 11,
  "count": 50
}
```
Response `200`
```json
{
  "generated": 50,
  "ticket_type_id": 11,
  "event_id": 4
}
```

### `POST /tickets/{ticketNumber}/checkin`
Response `200`
```json
{
  "ticket_number": "ABC123",
  "status": "checked_in",
  "checked_in_at": "2025-12-14T00:20:00Z"
}
```

## Stats

### `GET /stats`
Response `200`
```json
{
  "total": 1000,
  "sold": 630,
  "unsold": 370,
  "checked_in": 420
}
```

