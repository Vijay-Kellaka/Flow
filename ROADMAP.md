# Flow build roadmap

## Implemented in the starter
- Apple-clean landing, login, registration and dashboard
- Google OAuth + verified email/password login gate
- Separate hashed journal password
- Journal lock/unlock with a short-lived unlock cookie
- Journal recovery email verification -> new journal password
- PostgreSQL Prisma schema covering core product entities
- Redis cache-aside dashboard + cache invalidation on writes
- Custom dashboard visibility, ordering, and widget sizing, persisted server-side
- Keyboard shortcuts and global command palette
- Daily named expenses with categories and timestamps
- Tasks, goals and activity timeline
- Private daily journal with mood/tags and word count
- Bookmarks section

## Next engineering slice
1. Complete CRUD/edit/delete for every module.
2. Add custom expense range filters + charts + period comparisons.
3. Add dashboard drag-and-drop and saved dashboard presets.
4. Add memories and monthly review pages.
5. Add proper email templates, rate limits, audit logs and token rotation.
6. Add tests, Playwright flows and CI.
7. Add PWA/offline sync with conflict handling.
8. Deploy with managed PostgreSQL + Redis + SMTP + Google OAuth.
