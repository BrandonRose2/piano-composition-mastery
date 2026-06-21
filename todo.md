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
- [ ] Audit: check which interactive features are gated/missing for built-in page
- [ ] Wire floating metronome to built-in La Campanella page
- [ ] Wire YouTube 5-video selectable cards + URL override to built-in page
- [ ] Wire split-screen practice mode to built-in page
- [ ] Wire score viewer (IMSLP PDF link) to built-in page
- [ ] Wire progress bar display to built-in page
- [ ] Add fingering guide section to La Campanella data + UI
- [ ] Add listening guide with timestamps (recommended recordings)
- [ ] Add practice journal/notes field (localStorage-backed)
- [ ] Add difficulty breakdown by section
- [ ] Add edition/publication notes
