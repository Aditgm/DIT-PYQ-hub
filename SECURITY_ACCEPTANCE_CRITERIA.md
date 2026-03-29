# Download Security & Rate Limiting - Acceptance Criteria

## Overview

This document outlines the acceptance criteria for implementing security improvements and rate limiting for the download functionality in Papers.js client and server.

## Changes Summary

### 1. Security: Authorization Header Only

**Requirement**: Auth token must never be sent in POST body; use Authorization header exclusively.

**Acceptance Criteria**:
- [x] Client `initiateDownload()` sends token via `Authorization: Bearer <token>` header
- [x] Request body contains only `{ paperId }` - no `authToken` field
- [x] Client `revokeDownloadToken()` uses same header approach
- [x] Server validates token from `Authorization` header only
- [x] Server rejects requests without valid Bearer token with 401 error

### 2. Rate Limiting

**Requirement**: Per-user limit of 5 downloads within a 3-hour window.

**Acceptance Criteria**:
- [x] Server tracks downloads per user in memory with TTL-based cleanup
- [x] After 5 downloads, subsequent requests return 429 status
- [x] Rate limit error includes `nextAvailableTime` (ISO timestamp)
- [x] Rate limit error includes `retryAfter` (seconds until retry allowed)
- [x] Rate limit resets after 3-hour window expires
- [x] Rate limits are per-user, not global

### 3. Client UI Feedback

**Requirement**: Inform users when rate limit is reached with retry time.

**Acceptance Criteria**:
- [x] `PaperDetail.jsx` shows notification with formatted retry time
- [x] `PaperBrowse.jsx` shows notification with formatted retry time
- [x] Error message includes human-readable retry time (e.g., "Mar 29, 6:00 PM")

### 4. Testing

**Requirement**: Unit and integration tests for all security and rate limiting features.

**Acceptance Criteria**:
- [x] Unit tests verify Authorization header is present
- [x] Unit tests verify authToken is NOT in request body
- [x] Integration tests validate rate limit enforcement
- [x] Integration tests validate nextAvailableTime field in responses
- [x] Tests for error handling when token is missing or invalid

## Storage Approach

**Chosen Approach**: In-memory Map with TTL-based cleanup

**Justification**:
- Minimal implementation effort (~1 hour as specified)
- Low overhead for initial deployment
- Sufficient for current scale
- Automatic cleanup prevents memory leaks

**Trade-offs**:
- Does not persist across server restarts (data lost on restart)
- Not suitable for multi-instance deployments without shared state

**Future Considerations**:
- For persistence: Add Supabase table to track download counts
- For horizontal scaling: Migrate to Redis with shared state

## Rollback Plan

If issues arise:

1. **Revert client changes**: Revert `src/api/papers.js` to previous version with body-based auth
2. **Revert server changes**: Revert `server/routes/download.js` to read from body
3. **Remove rate limiting**: Remove rate limit checks from `/initiate` endpoint
4. **Disable tests**: Comment out or skip test files temporarily

## API Changes

### POST /api/download/initiate

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <auth_token>
```

**Request Body**:
```json
{
  "paperId": "uuid-string"
}
```

**Success Response** (200):
```json
{
  "downloadUrl": "http://...",
  "token": "hex-token",
  "expiresAt": "ISO-timestamp",
  "filename": "paper_watermarked.pdf"
}
```

**Rate Limited Response** (429):
```json
{
  "error": "Rate limit exceeded. Download credits exhausted.",
  "nextAvailableTime": "2026-03-29T18:00:00+05:30",
  "retryAfter": 10800
}
```

**Unauthorized Response** (401):
```json
{
  "error": "Missing or invalid Authorization header. Bearer token required."
}
```

## Test Commands

### Client Tests
```bash
npm test
```

### Server Tests
```bash
cd server
npm install
npm test
```

## Implementation Notes

- Current implementation uses in-memory Map for rate limiting
- Storage backend can be upgraded to Redis or database for production
- Initial implementation effort: ~1 hour
- Estimated additional work for production storage: 2-4 hours