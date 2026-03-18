# Authentication API

> Complete reference for The Mile Game authentication endpoints.
> JWT-based authentication with access and refresh tokens.

## Base Authentication

All authenticated endpoints require a JWT Bearer token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The API client automatically handles token injection. See [Frontend Authentication](#frontend-usage) for details.

## Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 8 characters

---

### POST /auth/login

Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid email or password

---

### POST /auth/refresh

Refresh access token using a valid refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### GET /auth/me

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### POST /auth/logout

Logout user and revoke refresh token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Token Details

### Access Token

- **Purpose**: Authenticate API requests
- **Lifetime**: 15 minutes
- **Storage**: Memory only (not persisted)
- **Claims**:
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "exp": 1700000000,
    "iat": 1699999900
  }
  ```

### Refresh Token

- **Purpose**: Obtain new access tokens
- **Lifetime**: 7 days
- **Storage**: localStorage (if "remember me") or memory
- **Rotation**: New refresh token issued on each refresh

### Token Refresh Flow

1. Access token expires → API returns `401 Unauthorized`
2. Client automatically sends refresh token to `/auth/refresh`
3. Server validates refresh token and issues new pair
4. Client retries original request with new access token

The API client handles this automatically - no manual intervention required.

---

## Frontend Usage

### Login

```typescript
import { useAuthStore } from '@/features/auth/store/authStore';

const { login } = useAuthStore();

// With "remember me"
await login({ email: 'user@example.com', password: 'password' }, true);

// Without "remember me" (tokens lost on tab close)
await login({ email: 'user@example.com', password: 'password' }, false);
```

### Access Protected API

The API client automatically adds the Authorization header:

```typescript
import { api } from '@/shared/lib/api';

// Auth header added automatically
const events = await api.get('/users/me/events');

// For protected routes
const response = await api.post('/events', { name: 'My Event' });
```

### Protected Route Example

```tsx
import { ProtectedRoute } from '@/shared/components';

function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  );
}
```

### Auth Store State

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials, rememberMe: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `EMAIL_EXISTS` | Email already registered |
| `TOKEN_EXPIRED` | Access token has expired |
| `INVALID_TOKEN` | Token is invalid or malformed |
| `REFRESH_TOKEN_EXPIRED` | Refresh token has expired |

---

## Migration from Legacy Auth

The previous authentication system using `X-Admin-Key` headers and `?key=` query parameters has been deprecated.

**Before (Legacy):**
```bash
curl -H "X-Admin-Key: secret-passphrase" \
  http://localhost:8081/api/admin/events
```

**After (JWT):**
```bash
# 1. Login to get token
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# 2. Use token for authenticated requests
curl -H "Authorization: Bearer eyJhbGci..." \
  http://localhost:8081/api/admin/events
```

All admin endpoints now require JWT authentication. Event owners can manage their events after logging in.
