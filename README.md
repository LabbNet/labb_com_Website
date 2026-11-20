# labb.com

The Labb public website, CPP member portal, Labb Learning courses and admin, built with Next.js (App Router) and TypeScript.

- **Hosting:** Render web service `labb_com_Website` (Ohio). Every push to `main` deploys automatically.
- **Database:** Render Postgres. Plain SQL migrations in `db/migrations` run on start (`scripts/migrate.mjs`).
- **Email:** SendGrid first, then Google Workspace SMTP, then Resend, whichever keys are set. Mail is sent from `info@mail.labb.com` (authenticated in SendGrid) with replies to `info@labb.com`.
- **Payments:** Stripe Checkout for courses and Quick Test, fulfilled by `/api/stripe/webhook`.
- **Files:** guidebooks, drug profiles, member files and courses live in `private/` and are served only through signed-in or lead-gated routes, never from `public/`.

## Run locally

```bash
npm install
DATABASE_URL=postgres://... SESSION_SECRET=<32+ random chars> npm run dev
npm run create-admin      # first admin account
npm run lint              # TypeScript check
```

## Environment (Render dashboard)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `SESSION_SECRET` | Signs the session cookie and lead tokens |
| `NEXT_PUBLIC_SITE_URL` | `https://labb.com` in production. Canonical tags, sitemap and email links use it |
| `NEXT_PUBLIC_NOINDEX` | `true` blocks indexing everywhere. Leave unset or `false`: only the labb.com host is ever indexed, other hosts get `noindex` automatically |
| `SENDGRID_API_KEY` | Email (or `SMTP_USER`/`SMTP_PASS`, or `RESEND_API_KEY`) |
| `MAIL_FROM`, `LEAD_FROM_EMAIL`, `MAIL_REPLY_TO` | Sender and reply-to overrides |
| `LEAD_TO_EMAIL`, `CPP_LEAD_TO_EMAIL` | Where new leads are sent |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments. The webhook must send `checkout.session.completed` and `checkout.session.async_payment_succeeded` |
| `SHOW_GRAPHIC_SLOTS` | `1` shows labeled placeholders where a graphic file is missing (drafts only) |

## Layout

- `app/`: pages and API routes. Routes follow one pattern: sign-in check, same-origin check, validate, write, redirect with `go()`.
- `lib/`: data and server logic (`kits`, `drugProfiles`, `resources`, `courses`, `leads`, `mail`, `http`).
- `lib/http.ts`: shared request helpers: `go()` and `safePath()` (same-site redirects only), `clientIp()` and `RateLimiter`.
- `content/`: generated content (drug profiles, news articles).
- `redirects.ts`: every old Shopify URL mapped to its new page.
