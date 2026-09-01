# FLOW

A private personal command center for tasks, expenses, goals, journal, bookmarks, activity and a customizable dashboard.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Optional Upstash Redis cache
- Auth.js (Google OAuth when configured + email/password)
- SMTP email verification and journal recovery

## Run locally

1. Create or connect a PostgreSQL database (Neon works well).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `AUTH_SECRET`. Add Google OAuth and SMTP values for those features. Redis values are optional.
3. Install dependencies:
   `npm install`
4. Generate the Prisma client:
   `npx prisma generate`
5. Apply the current Prisma schema:
   `npx prisma db push`
6. Start the app:
   `npm run dev`
7. Open `http://localhost:3000`.

## Environment variables

Required:

```env
DATABASE_URL="..."
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"
```

Optional Google sign-in:

```env
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

Optional Redis acceleration:

```env
UPSTASH_REDIS_REST_URL="https://....upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."
```

SMTP is required for account verification emails and journal password recovery. For Gmail, use the sender Gmail account plus its App Password:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-gmail-address@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"
SMTP_FROM="your-gmail-address@gmail.com"
```

Never commit `.env` or any secret values.

## Cache behavior

Redis is an acceleration layer, not a data dependency. When Redis is missing or unavailable, Flow continues to use PostgreSQL directly.

## Journal

The first visit to Journal lets the user create a separate journal password. Journal entries are encrypted at rest using a key derived from `AUTH_SECRET`, while the journal password controls access. A user can edit or delete an entry, with at most one entry per calendar day. Password recovery uses an email verification link; a signed-in user can also reset the journal password with their Flow login password.

Keep the same `AUTH_SECRET` across local sessions and production deployments. Changing it makes previously encrypted journal content unreadable.

## Production

Set the same production secrets in Vercel (or your host) before deploying. Set `AUTH_URL` to the deployed site URL, not localhost.

Example:

```env
AUTH_URL="https://your-flow-domain.vercel.app"
```

If Google sign-in is enabled, configure its OAuth redirect URI for your deployed domain. SMTP credentials stay server-side and are never entered by the end user.

## Health check

```bash
curl http://localhost:3000/api/health
```

A healthy database returns HTTP 200. Redis may report `ok` when configured or `unconfigured` when omitted; either is valid because Redis is optional.
