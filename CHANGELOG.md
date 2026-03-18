# Changelog

All notable changes to The Mile Game will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Phase 3A

### Added
- JWT-based authentication system
- Login and Register pages
- Dashboard page for user's events
- Create Event page
- ProtectedRoute component for auth guarding
- Auth store with automatic token refresh
- GET /api/users/me/events endpoint

### Changed
- Admin panel now uses JWT instead of X-Admin-Key
- All admin API calls use automatic JWT interceptor
- Event creation now extracts owner from JWT claims

### Removed
- X-Admin-Key header validation
- ?key= query parameter authentication
- Legacy admin passphrase authentication

### Security
- JWT_SECRET environment variable is now required (no default fallback)
- WebSocket origin validation against CORS_ALLOWED_ORIGINS
- Token comparison uses constant-time comparison (prevents timing attacks)
- PostgreSQL port no longer exposed to host in Docker
- Removed committed binaries and temporary files from git

### Fixed
- getCurrentUser() now correctly transforms backend response to User type
- localStorage access now wrapped in try/catch (SSR-safe)
- Error messages sanitized (no internal details leaked)
- localStorage guards prevent hydration issues
- API field names normalized (camelCase/snake_case)
- AUTH.md documentation updated with correct field names

### Fixed (UI)
- Fixed typo "Escolge" → "Escoge" in CreateEventPage
- Removed duplicate exports in auth/index.ts
- Added aria-label to Switch component

---

## [v2.0.0] - Phase 2

### Added
- Theme API for event customization
- Theme presets (Birthday, Wedding, Corporate, etc.)
- Admin endpoints for theme management
- Multi-event support
- Question Editor API
- Feature flags system
- Secret Box functionality:
  - POST /api/postcards/secret endpoint
  - GET /api/admin/secret-box endpoint
  - POST /api/admin/reveal endpoint
  - GET /api/admin/status endpoint
  - WebSocket event: secret_box_reveal

### Changed
- Quiz questions now stored in database
- Questions can be imported/exported as JSON
- Event slugs for pretty URLs

### Fixed
- WebSocket reconnection logic
- Postcard rotation persistence

---

## [v1.0.0] - Phase 1

### Added
- Initial API release
- Quiz system with scoring
- Ranking system with real-time updates
- Postcards (Corkboard) feature
- WebSocket support for real-time updates
- Docker Compose setup
- Nginx reverse proxy

### Features
- Player registration and quiz submission
- Multiple choice and text input questions
- Real-time ranking via WebSocket
- Corkboard with postcards and push pins
- 3D medals for top players
- Butterfly background animations
