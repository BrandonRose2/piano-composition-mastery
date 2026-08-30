# Authentication Validation Notes

## 2026-08-26

The unauthenticated `/login` route was opened after the AuthGuard redirect refactor and rendered the local username/password landing page without navigating away. A simulated legacy `/api/oauth/callback?code=stale&state=stale` request redirected safely to `/login` rather than returning the previous `OAuth callback failed` error.

The active authentication path is local username/password. `AuthGuard` now schedules protected-route redirects in a React effect, keeping the render path free of navigation side effects.

## 2026-08-29 — live Manus-session check

The signed-in published site displayed the user as Brandon and loaded the 31-item Scribd cache, but the composition section returned the empty-library state after loading. This proves the session is valid; the remaining fault is isolated to the authenticated composition-list query or the deployment/database schema alignment rather than the sign-in screen.

## 2026-08-30 — library query repair

The live authenticated `compositions.list` request returned an internal database error because the deployed query selects `compositions.contentHash`, but that column was absent from the production table. The missing `contentHash VARCHAR(64)` column was added without modifying any stored compositions. The linked Gmail-backed owner has 31 composition records and 31 cached Scribd documents, so the library is now expected to load after a refresh.

## 2026-08-30 — authenticated metronome check

On the published portal, the Metronome button is visible in the signed-in header. It opens an accessible modal with tempo slider, increment controls, time signatures, tap tempo, test sound, and start/stop control. The Test Sound action responded with the visible confirmation "Test click played," so the browser successfully initialized the audio control. The full 31-score library also loaded in the same authenticated session.

The authenticated Start control transitioned to Stop and showed the running state at 80 BPM in 4/4. Navigating away closed the modal and ended the active metronome session.

The authenticated composition page exposes both Split Screen and Score + Video actions alongside the Practice Metronome. Split Screen successfully opened its dedicated score-and-practice-tracker workspace, including the visible vertical METRONOME control at the right edge.

Within the authenticated split-screen workspace, the vertical METRONOME control opened the complete metronome panel beside the score and tracker. This confirms the metronome remains directly usable during score-and-practice split-screen work.
