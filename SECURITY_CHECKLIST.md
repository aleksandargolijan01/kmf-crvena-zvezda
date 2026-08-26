# KMF Crvena Zvezda Security Checklist

## Environment variables

- Set `NODE_ENV=production` in production.
- Set `FRONTEND_ORIGINS` to exact production origins only, for example `https://kmfcrvenazvezda.rs,https://www.kmfcrvenazvezda.rs`.
- Use unique, high-entropy values for `JWT_SECRET` and `JWT_REFRESH_SECRET`; each should be at least 32 characters and must not match.
- Keep `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `SMTP_PASS`, and JWT secrets only on the backend host.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, database URLs, SMTP credentials, OpenAI keys, or JWT secrets in Angular environment files.
- Rotate secrets after staff changes, suspected compromise, or accidental log/repo exposure.

## CORS and HTTPS

- Do not use wildcard CORS origins in production.
- Serve the frontend and backend over HTTPS only.
- Keep HSTS enabled at the backend and hosting/CDN layer.
- If a reverse proxy or CDN terminates TLS, verify it forwards the original protocol and blocks direct insecure backend access.

## Supabase database and RLS

- Enable RLS before production for all sensitive tables.
- Protect `User` and `NewsletterSubscriber` tables with deny-by-default policies.
- Do not grant public anon access to admin, user, newsletter, or audit-related tables.
- Use the service role key only from the backend runtime.
- Keep `DATABASE_URL` and `DIRECT_URL` out of frontend builds, logs, and client-visible config.
- Back up the database automatically and test restore procedures.

## Supabase Storage

- Use a dedicated bucket for site media.
- If the bucket is public, allow public reads only for media that is intended to be public.
- Keep writes, deletes, and bucket administration restricted to the backend service role.
- Do not allow SVG uploads unless a dedicated sanitizer and CSP review are added.
- Periodically review orphaned media files and bucket policies.

## Admin access

- Use long, unique admin passwords; rotate the seeded `SUPER_ADMIN_PASSWORD` after first login.
- Disable inactive admin users instead of sharing accounts.
- Keep `SUPER_ADMIN` accounts minimal.
- Review `/admin/*` access logs and failed login logs.
- Consider MFA at the hosting, VPN, or identity-provider layer if available.

## Rate limits and abuse controls

- Verify production rate limits for `/auth/login`, `/auth/refresh`, `/newsletter/subscribe`, `/sponsor-inquiries`, `/admin/media/upload`, and `/admin/translations/regenerate-missing`.
- Put CDN or reverse-proxy throttling in front of public forms.
- Keep honeypot fields enabled for newsletter and sponsor forms.
- Monitor spikes in validation failures, upload failures, and failed logins.

## OpenAI translations

- Keep `OPENAI_API_KEY` only in backend environment variables.
- Set usage limits and billing alerts in the OpenAI dashboard.
- Keep translation regeneration limited to `SUPER_ADMIN` and `ADMIN`.
- Use small regeneration batches and review failures instead of retrying unbounded jobs.

## SMTP and sponsor inquiries

- Use a least-privilege SMTP account dedicated to the site.
- Configure SPF, DKIM, and DMARC for the sender domain.
- Keep `SPONSOR_INQUIRY_FROM_EMAIL` and `SPONSOR_INQUIRY_TO_EMAIL` as fixed trusted addresses.
- Do not log inquiry message bodies unless there is a specific incident response need.

## Operations

- Run `npm audit --omit=dev` for frontend and backend before releases.
- Run backend `npm run lint`, `npm run build`, and `npx prisma validate` before deployment.
- Run frontend `npm run build` and TypeScript checks before deployment.
- Review dependency updates for security-sensitive packages: NestJS, Angular, Prisma, Supabase, bcrypt, jsonwebtoken/JWT, multer, helmet, sanitize-html, nodemailer, and OpenAI SDK.
- Keep server logs access-controlled and rotate them regularly.
