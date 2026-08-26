# Authentication Validation Notes

## 2026-08-26

The unauthenticated `/login` route was opened after the AuthGuard redirect refactor and rendered the local username/password landing page without navigating away. A simulated legacy `/api/oauth/callback?code=stale&state=stale` request redirected safely to `/login` rather than returning the previous `OAuth callback failed` error.

The active authentication path is local username/password. `AuthGuard` now schedules protected-route redirects in a React effect, keeping the render path free of navigation side effects.
