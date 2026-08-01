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
