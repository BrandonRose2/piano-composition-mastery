# Project TODO

- [x] YouTube performance section: show 5 selectable video cards with smarter query (key + tempo + composer)

## Username/Password Auth (replaced Google OAuth per user request)
- [x] Add username and passwordHash columns to users table
- [x] Push schema migration (pnpm db:push)
- [x] Install bcryptjs for password hashing
- [x] Add localAuth.register tRPC procedure (username + bcrypt hash)
- [x] Add localAuth.login tRPC procedure (verify hash, issue session cookie)
- [x] Rewrite Landing.tsx with register/login forms (no email required)
- [x] Keep Manus OAuth as secondary option on auth forms

## La Campanella Full Upgrade
- [x] Audit: check which interactive features are gated/missing for built-in page
- [x] Wire floating metronome to built-in La Campanella page
- [x] Wire YouTube 5-video selectable cards + URL override to built-in page
- [x] Wire split-screen practice mode to built-in page
- [x] Wire score viewer (IMSLP PDF link + direct download card) to built-in page
- [x] Wire progress bar display to built-in page
- [x] Add fingering guide section to La Campanella data + UI
- [x] Add listening guide with timestamps (4 pianists: Trifonov, Kissin, Lang Lang, Argerich)
- [x] Add practice journal/notes field (localStorage-backed, 30-day grid)
- [x] Add difficulty breakdown by section with animated bars
- [x] Add edition/publication notes (3 editions: 1834, 1838, 1851)

## HTML File Support
- [x] Accept .html/.htm files in the upload drag-and-drop zone (file input accept attribute)
- [x] Add paste handler (Ctrl/Cmd+V) to upload zone — handles clipboard files, HTML content, plain text
- [x] Add pasting state visual feedback and keyboard focus (tabIndex=0) to upload zone
- [x] Update hint text to show HTML and keyboard shortcut
- [x] Server-side: strip HTML tags, style/script blocks, decode entities for LLM analysis (text/html + text/plain MIME types)

## URL Fetch from Upload Zone
- [x] Add URL input field below the drag-and-drop zone so users can paste a website URL
- [x] Add fetchFromUrl tRPC procedure: server fetches the URL, stores HTML in S3, kicks off AI analysis
- [x] Wire URL input submit to the same upload/analyze flow as file uploads
- [x] Show loading state while fetching URL ("Fetching page..." spinner)

## YouTube → Sheet Music Finder
- [x] Add "Find Sheet Music from YouTube" section on Home page with URL input (paste or drag a YouTube URL)
- [x] Backend: extract YouTube video ID and fetch video metadata (title, description, channel) via YouTube Data API / callDataApi
- [x] Backend: parse video title/description to identify composition name and composer
- [x] Backend: search Scribd for the composition PDF (authenticated with session cookie)
- [x] Backend: scrape YouTube video description and top comments for PDF/sheet music links
- [x] Backend: fallback search IMSLP and MuseScore for free scores
- [x] Backend: return ranked list of found PDF sources with source label (Scribd / YouTube description / YouTube comments / IMSLP / MuseScore)
- [x] Frontend: show step-by-step progress animation while searching
- [x] Frontend: show result cards with source badge, confidence, preview link, and Import button
- [x] Backend: importSheetMusicResult mutation fetches the PDF and adds it to the user's library with AI analysis

## Scribd Direct Download
- [x] Backend: investigated Scribd document pages — pages are fully JS-rendered (3KB HTML server-side), no PDF URL extractable without headless browser
- [x] Backend: PDF validation added to importSheetMusicResult (content-type + magic bytes check)
- [x] Frontend: Scribd result cards show "Open in Scribd" button + micro-tip "Download the PDF, then drag it into the upload zone above"
- [x] Frontend: IMSLP shows "Open IMSLP", MuseScore shows "Browse MuseScore" with same drag-back guidance

## Retry Analysis
- [x] Backend: retryAnalysis tRPC mutation — re-fetch file from S3, re-run analyzeComposition, update status
- [x] Frontend: show "Retry" button on error cards in the library (inline next to error message)

## Weekly Auto-Import from Downloads Folder
- [x] Add `imported_files` table to schema: filename, filePath, importedAt, compositionId (nullable), status
- [x] Add `getImportedFilenames`, `recordImportedFile`, `listImportedFiles` helpers to db.ts
- [x] Add `autoImport.list` tRPC procedure
- [x] Add `/api/scheduled/auto-import` Express handler that accepts PDF uploads from the AGENT cron
- [x] Register `/api/scheduled/auto-import` in server/_core/index.ts
- [x] Create AGENT cron via manus-config schedule (every Sunday 9 AM UTC, taskUid: gkPG1zk4auEHTrVhxz68oR)
- [x] Frontend: Auto-Import page at /auto-import showing schedule info, stats, and import history
- [x] Frontend: Route registered in App.tsx with AuthGuard

## Run Now Button on Auto-Import Page
- [x] Backend: autoImport.runNow tRPC mutation — scan /mnt/desktop for PDFs, skip already-imported, upload + analyze new ones
- [x] Frontend: Run Now button on /auto-import page with progress feedback
- [x] ScoreViewer: graceful fallback for non-PDF/non-image mimeTypes (shows friendly message + download link)
- [x] DB cleanup: removed junk HTML/Spotify/YouTube compositions (3 rows deleted, 15 real piano scores remain)

## Auto-Import Piano Folder Fix + Spotify Support
- [x] Auto-Import: changed scan path to ~/Desktop/Piano - New Music to Learn/ only (removed Downloads)
- [x] Auto-Import: removed keyword filter — all PDFs in the Piano folder are imported
- [x] Auto-Import: updated AGENT cron detail to scan Piano folder
- [x] Auto-Import: updated UI text to reference Piano folder
- [x] Imported Le Rêve D'une Note and Wyden Down from Piano folder into library
- [x] Spotify link support: isSpotifyUrl() detection in sheetMusicFinder.ts
- [x] Spotify link support: getSpotifyMetadata() via free oEmbed API (no API key needed)
- [x] Spotify link support: identifyCompositionFromSpotify() AI identification
- [x] Spotify link support: findSheetMusicFromSpotify() main entry point (Scribd + IMSLP + MuseScore)
- [x] Backend: findSheetMusic procedure now accepts { url } (YouTube or Spotify)
- [x] Frontend: finder input accepts both YouTube and Spotify URLs, icon changes dynamically
- [x] Frontend: progress steps adapt for Spotify (no YouTube description step)
- [x] Frontend: result banner shows Spotify badge when source is Spotify

## Auto-Import Browser Upload (replaces server-side filesystem scan)
- [x] Auto-Import: replace Run Now server scan with browser-based multi-PDF drag-and-drop uploader
- [x] Auto-Import: wire browser file upload to S3 + AI analysis pipeline (same as main upload zone)
- [x] Auto-Import: show per-file status icons during batch upload (spinner → checkmark/skip/error)
- [x] Auto-Import: keep Import History table and stats intact

## Scribd Saved Docs Search (priority fix)
- [x] Backend: add searchScribdSaved() — fuzzy-match cached saved docs by composition name (per-user)
- [x] Backend: finder injects saved-docs matches at top of results for both Spotify and YouTube pipelines
- [x] Frontend: show "Your Scribd Library ★" gold badge on results that came from saved docs

## Sync Scribd Library Feature
- [x] DB: add scribd_saved_docs table (docId, title, url, slug, syncedAt)
- [x] Backend: scribd.syncSaved mutation — accepts array of {docId, title, url} from browser, upserts into DB
- [x] Backend: scribd.getSavedDocs query — returns all cached saved docs
- [x] Backend: update sheet music finder to check scribd_saved_docs cache first before public search
- [x] Frontend: Sync Scribd Library button on Auto-Import page (browser scrapes saved list, sends to server)
- [x] Frontend: show "Your Scribd Library ★" gold badge on matched results in sheet music finder

## Scribd Sync Fix (superseded by Scribd Sync v2)
- [x] Replace broken browser cross-origin fetch — done via two-method approach (HTML paste + single URL)
- [x] Update AutoImport.tsx Sync Now button — replaced with two-panel UI

## Scribd Sync v2 (Both Methods)
- [x] Backend: scribd.syncFromHtml mutation — parse pasted Scribd page HTML server-side, extract doc links, upsert to DB
- [x] Backend: scribd.addByUrl mutation — accept a single Scribd URL, extract docId/title/slug, upsert to DB
- [x] Frontend: replace broken Sync Now button with two-panel UI: (1) paste HTML bulk sync with step-by-step instructions, (2) single URL input with Add button
- [x] Frontend: show live count of synced docs in header

## UX Redesign: Unified "Find Any Piece" + Direct Scribd Library
- [x] Rename "Find Sheet Music from YouTube or Spotify" → "Find Any Piece" — accepts Spotify, YouTube, plain text, or any URL
- [x] Backend: extend findSheetMusic to accept plain text queries (not just URLs) — detect if input is a URL or plain text, if plain text run AI composition ID + search pipeline directly
- [x] Frontend: unified input placeholder makes clear it accepts anything (Spotify link, YouTube URL, composition name, etc.)
- [x] Frontend: results panel shows ALL results together: sheet music sources + YouTube performance video embed
- [x] Frontend: add "My Scribd Library" section directly on Home page — searchable/browseable without needing a Spotify/YouTube link
- [x] Frontend: Scribd library section shows all cached docs with search box, "Open in Scribd" buttons, and count
- [x] Frontend: fix searchScribdSavedDocs keyword filter — strip punctuation, allow 2-char keywords (already done in db.ts)
- [x] Backend: fix db.ts keyword filter (already applied — allow >= 2 chars, strip punctuation)

## ZIP Folder Upload (Piano Folder Batch Import)
- [x] Frontend: accept .zip files in the upload zone (add to file input accept attribute)
- [x] Frontend: detect ZIP file drop/select, extract PDFs client-side using JSZip, show batch progress
- [x] Frontend: show per-file status during ZIP extraction and upload (filename, spinner/check/skip/error)
- [x] Backend: no changes needed — reuse existing compositions.upload mutation per PDF
- [x] Frontend: show summary after ZIP import (X imported, Y skipped duplicates, Z errors)

## Bug Fixes (from screen recording 2026-08-02)
- [x] Raise per-file upload limit from 15MB to 50MB (frontend ZIP handler + single upload + backend)
- [x] Add automatic retry with exponential backoff for AI JSON parse errors (up to 3 retries)

## Updated User Guide
- [x] Create refreshed PDF guide covering current library, composer folders, import, finder, practice, and recovery workflows
- [x] Redesign the user-guide PDF with the portal’s dark velvet-and-gold styling and rename it to Piano Composition Mastery Portal

## Finder Source Priority
- [x] Search the Scribd saved-library cache and Scribd catalog first for every title, Spotify, YouTube, or text query
- [x] Present free score sources before MuseScore, including IMSLP and other no-cost databases
- [x] Place MuseScore after free public sources and label it clearly
- [x] Show subscription-required sources only as a clearly labeled last-resort section
- [x] Display the active source-search sequence in the finder results

## Metronome and Comprehensive Guide
- [x] Inspect the metronome control, audio behavior, and placement on composition pages
- [x] Make the metronome more visible and accessible on desktop and mobile
- [x] Verify the metronome starts, stops, changes tempo, and remains usable in split-screen practice
- [x] Expand the user-guide PDF into a full feature-by-feature walkthrough, including the metronome, score viewer, print, split-screen, library organization, import, finder, Scribd, analysis, and recovery flows

## Library Visibility Recovery
- [x] Verify every composition record and its user ownership in the database
- [x] Trace the compositions.list query and composer-folder rendering for any filtering or display regression
- [x] Restore the complete composition library view without deleting or recreating user data
- [x] Add a persistent library-owner link for the user’s email and Google login identities
- [x] Resolve the linked library owner for every composition, progress, upload, and Scribd procedure
- [x] Verify both login identities show the same 29-score library and practice progress
- [x] Add regression coverage confirming linked identities resolve the same practice-progress records
- [x] Confirm the linked-library behavior through the available authenticated Comet portal session
