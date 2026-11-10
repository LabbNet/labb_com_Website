# labb.com (Next.js)

The new labb.com, rebuilt off Shopify. Built for lead generation first, with gating, Stripe and the Labb learning platform ready to switch on.

- **Stack:** Next.js 16 (App Router, TypeScript), plain CSS, Poppins self-hosted. No CMS, no Shopify, no HubSpot.
- **Hosting:** Vercel (recommended, free to start) or any Node 20+ host (`npm run build && npm start`).
- **Leads:** every form posts to `/api/lead`, which emails `kelly.ramsey@labb.com` via Resend and can also POST to a CRM webhook.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in SESSION_SECRET at minimum
npm run dev                  # http://localhost:3000
```

Without `RESEND_API_KEY` or `LEAD_WEBHOOK_URL`, leads are printed to the server log in dev. In production the form shows an error, so leads are never silently lost.

## What's in it

| Area | Path | Notes |
|---|---|---|
| Home | `/` | Lead form, specimen choice, kits, industries, handbooks, FAQ |
| LabbHR | `/labbhr` | Platform, True Privacy, how it works |
| Specimen pages | `/oral-fluid-drug-testing`, `/urine-drug-testing` | Target the main search terms |
| Test kits | `/test-kits`, `/test-kits/[slug]` | 8 kits with full panels and cutoffs from the v3.01 data sheets (`lib/kits.ts`) |
| Industries | `/industries/construction`, `/manufacturing`, `/logistics-warehousing` | Lead form in the hero |
| Clinics / CPP | `/for-clinics` | Partner lead form (second lead type) |
| Handbooks (gated) | `/resources/[slug]` | Public, indexable landing page. Download link is returned only after the form is submitted |
| Partner library (gated) | `/library` | Member cookie required (enforced in `proxy.ts`). Interim shared password, same as Shopify today |
| Certifications | `/certifications` | Waitlist now; Stripe checkout and LMS enrollment hooks ready |
| News | `/news`, `/news/[slug]` | All 8 Shopify blog posts migrated, images moved off the Shopify CDN |
| Legal | `/privacy`, `/terms` | **Drafts for attorney review** |

Edit content in `lib/` (kits, industries, resources, site settings) and `content/articles.json`.

## SEO built in

- Every old Shopify URL 308-redirects to its new home (`redirects.ts`): pages, kit pages, blog posts, products, collections, policies, cart and account routes, plus the existing Shopify short links.
- Unique title, description and canonical on every page; Open Graph image; `sitemap.xml`; `robots.txt` (blocks `/api`, `/library`, `/thank-you`).
- Structured data: Organization, BreadcrumbList, Product (kits), FAQPage, BlogPosting, SoftwareApplication, Book (handbooks).
- Google Search Console verification tag carried over, so the property stays verified.
- Static pages, optimized images (AVIF/WebP), self-hosted fonts.
- Gated content keeps a full public landing page so it still ranks.

## Launch checklist (Shopify cutover)

1. **Deploy to Vercel:** import the repo, set env vars from `.env.example`. Set `NEXT_PUBLIC_NOINDEX=true` and `NEXT_PUBLIC_SITE_URL` to the preview URL while reviewing.
2. **Resend:** create an account, verify `labb.com`, add the SPF and DKIM DNS records it gives you, put the key in `RESEND_API_KEY`. This also fixes leads landing in spam.
3. **Test** every form on the preview URL and confirm Kelly receives them.
4. **DNS:** in Vercel add `labb.com` and `www.labb.com`. At the DNS provider, point the apex A record and `www` CNAME to Vercel (replacing the Shopify records). Keep Shopify running until DNS has switched.
5. **Go live:** set `NEXT_PUBLIC_SITE_URL=https://labb.com`, `NEXT_PUBLIC_NOINDEX=false`, redeploy.
6. **Search Console:** submit `https://labb.com/sitemap.xml`, then watch Coverage for 404s over the next 2 to 4 weeks and add any missing redirects to `redirects.ts`.
7. **Then** cancel Shopify. Any images still referenced from `cdn.shopify.com` elsewhere (emails, Drive docs) will break when the store closes.

## Phase 2 hooks

- **Stripe:** set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and a Price ID per product. `POST /api/checkout {sku}` returns a Checkout URL; `/api/stripe/webhook` handles fulfillment.
- **Learning platform:** set `LMS_API_URL` / `LMS_API_KEY`; `enrollInLms()` in `lib/commerce.ts` is called after payment. `NEXT_PUBLIC_LMS_URL` adds an "Open Labb Learning" card in the library.
- **Real member accounts:** replace `verifyMemberLogin()` in `lib/session.ts` with the LMS or identity provider sign-in. The cookie, proxy gate and pages stay the same.
- **Hard-gated files:** handbook and library links are Google Drive share links, so anyone who has the link can open it. For true protection, move the PDFs to private storage and serve them through a signed `/api/download` route.
