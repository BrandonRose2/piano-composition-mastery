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
