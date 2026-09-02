# YouTube-to-PDF Acquisition Validation

## Supplied video

- **Video:** `fuKvTWUvvlY`
- **Identified work:** *Moody Blue* by James Malikey.

## Verified source findings

| Source | Finding | Direct in-portal import status |
|---|---|---|
| James Malikey official store | The official *Moody Blue* score product is listed at $0.00, but the public product page does not expose a direct PDF attachment. | Requires the store’s authorized fulfillment flow; do not bypass it. |
| MuseScore score page | A community score page exists at `https://musescore.com/user/71025190/scores/27080713` and exposes its own Download control. The unauthenticated server-side download endpoint returned access protection rather than a PDF, and the page presents a sign-in / subscription offer. | Open in the user’s browser; do not bypass sign-in or subscription controls. |
| Scribd | The user’s signed-in search page loads, but the results are JavaScript-rendered and no browser-independent PDF URL is exposed. | Open in the user’s Scribd session; do not scrape or bypass access controls. |

## Implementation policy

The portal may automatically acquire and import only a **verified, directly accessible PDF** from an authorized public URL or a link supplied in the source video. It must never bypass a Scribd, MuseScore, official-store, paywall, sign-in, subscription, or checkout control. For a source that requires the user’s authorized browser action, the portal should clearly identify the source and offer an assisted import path once the downloaded PDF is selected or dropped.
