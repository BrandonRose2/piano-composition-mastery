# Weekly Auto-Import Agent Instructions

This agent runs every Sunday at 9:00 AM UTC. It scans the user's Mac Downloads folder for new PDF files and imports them into the Piano Mastery Portal.

## Steps

1. List all PDF files in `/mnt/desktop/` and subdirectories (the user's connected desktop mount):
   ```
   find /mnt/desktop -name "*.pdf" -type f 2>/dev/null
   ```
   Also check the Downloads folder specifically:
   ```
   find /mnt/desktop -path "*/Downloads/*.pdf" -type f 2>/dev/null
   ```

2. For each PDF found, check if it has already been imported by calling the portal API:
   - POST to `https://piano-composition-mastery.manus.space/api/scheduled/auto-import`
   - Include the Manus cron auth header
   - Body: `{ filename, base64, mimeType: "application/pdf", fileSize }`

3. The endpoint handles deduplication — if the filename was already imported, it records it as "skipped" and returns `{ skipped: true }`.

4. Log results: how many imported, skipped, errors.

## Auth

Use the built-in Manus cron authentication (sdk.authenticateRequest checks isCron flag).

## Notes

- Max file size to upload: 20 MB (skip larger files and log a warning)
- Only process `.pdf` files (case-insensitive)
- The portal URL is: `https://piano-composition-mastery.manus.space`
