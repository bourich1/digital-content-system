# BoostD CAPTCHA verification — 2026-10-27

- Published commit: `4629c0d` (Vercel Production: Ready).
- Cloudflare Turnstile: BoostD, Managed; allowed hosts `boostd.app`, `localhost`, `127.0.0.1`. Root hostname also covers `www`.
- Public site key configured in Vercel Production and ignored local `.env.local`.
- Secret configured only in Supabase Auth for project `erzksxgbbdxzjdtssuyv`.
- Login and sign-up send `options.captchaToken`; submit waits for verification. Tokens are cleared after each attempt, on expiry/errors, and on switching modes.
- Corrected the existing Sign Up handler, which previously called password sign-in. Confirmation-required sign-up now shows a check-email notice.
- Google OAuth remains available through its existing flow.

## Verification

- `npm run build`: passed.
- `node --test scripts/test-turnstile.mjs`: 3 passed. Covers Strict Mode/script deduplication, expired/failed/timed-out checks, unmount cleanup, retry, and consumed-widget reset.
- Browser: production and local real widgets completed verification; Login enabled after success. Switching to Sign Up required a fresh verification.
- Supabase password-login endpoint: missing CAPTCHA returned HTTP 400 `captcha_failed` / no captcha token found.
- Supabase password-login endpoint: invalid token returned HTTP 400 `captcha_failed` / invalid-input-response.
- Production UI with a valid real token and deliberately invalid example.com login credentials returned `Invalid login credentials`, confirming CAPTCHA validation passed before credential rejection. No account was created.
- `npm run lint`: same 5 pre-existing TypeScript issues in App.tsx, FeatureContext.tsx, and the older landing components (lord-icon, next/image, JSX namespace). No new CAPTCHA type errors.

No real-user login, account creation, or password reset was performed.
