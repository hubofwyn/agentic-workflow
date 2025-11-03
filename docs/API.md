# API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. This should be implemented for production use.

## Response Format

### Success Response

```json
{
  "data": {},
  "metadata": {}
}
```

### Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "severity": "low|medium|high|critical",
  "errorId": "err_123456789_abc123" // Development only
}
```

## Endpoints

### Health Checks

#### GET /health

Check application health status.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

#### GET /health/ready

Check if application is ready to serve requests.

**Response:**

```json
{
  "status": "ready",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "checks": {
    "server": true,
    "memory": true,
    "uptime": true
  }
}
```

#### GET /health/live

Liveness probe for Kubernetes.

**Response:**

```json
{
  "status": "alive",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "pid": 12345,
  "uptime": 123.456
}
```

#### GET /health/metrics

Detailed system metrics.

**Response:**

```json
{
  "timestamp": "2025-11-02T12:00:00.000Z",
  "uptime": 123.456,
  "memory": {
    "rss": "45.23 MB",
    "heapTotal": "20.50 MB",
    "heapUsed": "15.30 MB",
    "external": "1.20 MB",
    "arrayBuffers": "0.50 MB"
  },
  "cpu": {
    "user": 123456,
    "system": 12345
  },
  "process": {
    "pid": 12345,
    "version": "v20.0.0",
    "platform": "darwin",
    "arch": "arm64"
  }
}
```

### Users

#### POST /api/users

Create a new user.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Required Fields:**
- `name` (string): User's full name
- `email` (string): User's email address

**Success Response (201 Created):**

```json
{
  "user": {
    "id": "user_1234567890_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request - Missing required fields:
```json
{
  "error": "INVALID_USER_DATA",
  "message": "Name and email are required"
}
```

400 Bad Request - Duplicate email:
```json
{
  "error": "USER_ALREADY_EXISTS",
  "message": "User with email john@example.com already exists"
}
```

#### GET /api/users

List all users.

**Success Response (200 OK):**

```json
{
  "users": [
    {
      "id": "user_1234567890_abc123",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-11-02T12:00:00.000Z",
      "updatedAt": "2025-11-02T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/users/:id

Get a specific user by ID.

**Parameters:**
- `id` (string): User ID

**Success Response (200 OK):**

```json
{
  "user": {
    "id": "user_1234567890_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:00:00.000Z"
  }
}
```

**Error Response:**

400 Bad Request - User not found:
```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found with ID: user_999"
}
```

#### PUT /api/users/:id

Update a user.

**Parameters:**
- `id` (string): User ID

**Request Body:**

```json
{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

**Optional Fields:**
- `name` (string): User's full name
- `email` (string): User's email address

**Success Response (200 OK):**

```json
{
  "user": {
    "id": "user_1234567890_abc123",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "createdAt": "2025-11-02T12:00:00.000Z",
    "updatedAt": "2025-11-02T12:05:00.000Z"
  }
}
```

**Error Response:**

400 Bad Request - User not found:
```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found with ID: user_999"
}
```

#### DELETE /api/users/:id

Delete a user.

**Parameters:**
- `id` (string): User ID

**Success Response (204 No Content)**

No body returned.

**Error Response:**

400 Bad Request - User not found:
```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found with ID: user_999"
}
```

## Rate Limiting

API is rate-limited to 100 requests per 15-minute window per IP address.

**Rate Limit Headers:**

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1635859200
```

**Rate Limit Exceeded Response (429):**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests from this IP, please try again later."
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_USER_DATA` | 400 | Missing or invalid user data |
| `USER_NOT_FOUND` | 400 | User does not exist |
| `USER_ALREADY_EXISTS` | 400 | Email already registered |
| `ROUTE_NOT_FOUND` | 404 | Endpoint does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Observability Headers

All responses include observability headers:

```
X-Request-ID: req_1234567890_abc123
X-Trace-ID: 1234567890abcdef
X-Span-ID: abcdef1234567890
```

## Example Usage

### cURL Examples

#### Create User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

#### Get All Users

```bash
curl http://localhost:3000/api/users
```

#### Get User by ID

```bash
curl http://localhost:3000/api/users/user_1234567890_abc123
```

#### Update User

```bash
curl -X PUT http://localhost:3000/api/users/user_1234567890_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated"
  }'
```

#### Delete User

```bash
curl -X DELETE http://localhost:3000/api/users/user_1234567890_abc123
```

### JavaScript Examples

```javascript
// Create user
const response = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
});

const { user } = await response.json();
console.log('Created user:', user);

// Get all users
const usersResponse = await fetch('http://localhost:3000/api/users');
const { users, count } = await usersResponse.json();
console.log(`Found ${count} users`);

// Get user by ID
const userResponse = await fetch(`http://localhost:3000/api/users/${user.id}`);
const { user: foundUser } = await userResponse.json();
console.log('Found user:', foundUser);
```

### Python Examples

```python
import requests

# Create user
response = requests.post(
    'http://localhost:3000/api/users',
    json={
        'name': 'John Doe',
        'email': 'john@example.com'
    }
)
user = response.json()['user']
print('Created user:', user)

# Get all users
response = requests.get('http://localhost:3000/api/users')
data = response.json()
print(f"Found {data['count']} users")

# Get user by ID
response = requests.get(f"http://localhost:3000/api/users/{user['id']}")
found_user = response.json()['user']
print('Found user:', found_user)
```

## Webhooks

Currently not implemented. Coming soon.

## WebSocket Support

Currently not implemented. Coming soon.

## Versioning

API version is included in responses and can be checked via the root endpoint:

```bash
curl http://localhost:3000
```

Future versions will use `/v2/`, `/v3/` URL prefixes.

## Support

For API support, please:

1. Check the [documentation](../README.md)
2. Review [examples](../examples/)
3. Open an [issue](https://github.com/hubofwyn/agentic-workflow/issues)
4. Join [discussions](https://github.com/hubofwyn/agentic-workflow/discussions)