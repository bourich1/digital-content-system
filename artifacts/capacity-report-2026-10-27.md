# BoostD production capacity check — 27 October 2026

## Conclusion

The public site passed a small, bounded production burst check. This does **not** establish a maximum number of simultaneous signed-in users or readiness for a large launch. Email delivery configuration and database query performance should be addressed before promoting widely.

A source scan found no localhost/127.0.0.1 destination links in the frontend. The sole occurrence is an internal URL-parsing base in the API handler; it does not send visitors to localhost.

## Live test

Target: https://www.boostd.app. Final run: 157 read-only requests, approximately 1.09 MB downloaded. No write, signup, message-send, or real-user credential operations. No video body downloaded. Maximum concurrency 20; stop conditions for HTTP 429/5xx, excessive latency, request/byte/time budgets.

| Workload | Concurrent requests | Completed | HTTP failures | Median | p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Public HTML routes, initial stage | 1 | 5 | 0 | 247 ms | 303 ms |
| Public HTML routes | 5 | 25 | 0 | 71 ms | 319 ms |
| Public HTML routes, warmed CDN | 20 | 100 | 0 | 74 ms | 223 ms |
| Public JavaScript/CSS | 4 | 4 | 0 | 281 ms | 370 ms |
| Creator profile API, X fallback | 3 | 9 | 0 | 292 ms | 407 ms |
| Anonymous Supabase feature-flags request | 3 | 12 | 0 | 169 ms | 416 ms |

The remaining two requests were homepage discovery and video HEAD. All final responses were HTTP 200. The 100-request warmed HTML burst lasted 591 ms; its throughput is **not** a sustained-capacity claim. Measurements include network/client effects from one test location.

The creator API test used the existing X fallback, which makes no outbound scraping request. It does not measure slower Instagram/YouTube/GitHub fetches. Anonymous feature-flag reads may be empty under RLS and do not simulate signed-in dashboard queries or database writes.

## Fault discovered and repaired

Before testing the serverless workload, a single creator API request returned HTTP 500 `FUNCTION_INVOCATION_FAILED`. Vercel Runtime Logs identified `ERR_MODULE_NOT_FOUND` for `/var/task/server/creatorLookup`.

Relative runtime imports now use `.js` extensions in the TypeScript source, including the nested parser dependency. A regression check transpiles the modules and loads the emitted JavaScript with Node ESM. It verifies the X fallback, invalid input, oversized input, and method restrictions.

- Fix published: `408b107`.
- All earlier landing changes published: `b95caf4`.
- `node scripts/test-creator-runtime.mjs`: passed.
- `npm run build`: passed.
- Live API after deployment: 9/9 HTTP 200.

## Observed launch constraints

1. **Email delivery — immediate launch priority.** Supabase Auth Rate Limits currently shows 2 emails/hour, with the email setting disabled. Configure a custom SMTP provider for public confirmation/reset email delivery; do not disable confirmation or CAPTCHA to work around the limit. Supabase's default mail service is intended for testing and restricts delivery to authorized team addresses. No SMTP credentials, provider, payment plan, or rate-limit settings were changed.
2. **Supabase Free Realtime.** The project organization is Free. The published plan limit is 200 concurrent Realtime connections and 100 messages/second. The app uses Realtime for flags, notifications and support. These are connection/message limits, not a statement that the website supports exactly 200 people; tabs and non-Realtime operations differ.
3. **Database queries.** Performance Advisor shows 0 errors, 243 warnings and 40 suggestions. The visible warning list includes Auth RLS Initialization Plan issues: authentication functions may be recalculated per row. This is an advisory, not proof of a measured outage. The connector did not have permission to read advisories; these counts were verified in the signed-in dashboard instead. No schema, index or RLS policy changes were made.
4. **Unbounded lists and sequential dashboard reads.** `Dashboard.tsx` reads ideas, tasks and collaborations sequentially with `select('*')`, without explicit pagination. `ContentIdeas.tsx` and `Collaborations.tsx` similarly load full lists. Introduce pagination/targeted columns and evaluate independent parallel reads, relevant indexes and RLS plans against representative data.
5. **Video bandwidth.** `/dashboard.webm` is 13,945,880 bytes (~13.95 MB). 1,000 complete downloads would transfer about 13.95 GB, excluding other assets and protocol overhead. Actual usage depends on scrolling, caching, playback and range requests. The video is already deferred until near the viewport. Consider a smaller encoding and suitable media caching before a large promotion.
6. **Creator API abuse/latency.** The lookup endpoint has no application-level authentication/rate limiting or shared cache, and external lookups can take up to eight seconds. The successful fallback test does not validate sustained external-fetch throughput.

## What remains unproven

No sustained soak test, distributed test, thousands-of-users simulation, authenticated multi-user CRUD test, email delivery test, or Realtime connection saturation test was performed against production. Use isolated staging and synthetic accounts/data for those tests. User counts cannot be extrapolated from the short CDN burst or the 50,000 monthly-active-user plan allowance.

## Sources

- [Supabase SMTP restrictions and production delivery](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase compute limits](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Supabase RLS performance guidance](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Vercel Hobby included usage](https://vercel.com/docs/plans/hobby): currently lists 100 GB Fast Data Transfer and 1 million CDN requests. This is shared plan usage, not a guaranteed number of application users. Hobby is intended for personal, non-commercial use; check the appropriate plan for a commercial launch.

Raw measurements: `capacity-results-2026-10-27.json`. Initial measurements: `capacity-initial-results-2026-10-27.json`. Reusable bounded probe: `capacity-check.mjs`.
