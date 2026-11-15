# MCP rollout status — 2026-11-15

## Deployed

Both Supabase projects are accessible. `boostd_mcp_reader.sql` and
`boostd_mcp_session_oauth.sql` are installed on staging and production.
Dynamic clients receive SELECT-only `boostd_mcp_reader`; existing registered
clients retain their workspace role. Bindings require the approving user,
active consent, client, session and exact resource. Missing/wrong resources
and ambiguous concurrent approvals fail closed. Refresh uses its own session.
Production allows only https://www.boostd.app/api/mcp.

Production deployment `dpl_4J69g7AJ82LC8kwSqFwb3NKnTqdE` is READY and aliased
to https://www.boostd.app. Both dynamic-OAuth Vercel flags are enabled.
Workspace-write disclosure was NOT enabled; dynamic clients have no write
privileges. Release source excludes unrelated local edits and image deletions.

## Validation

The deployed staging regression passed: first exchange, initialize, list_tasks,
wrong/missing resources, independent session refresh, no token, ordinary login,
direct write rejection, cross-account filtering, and revoked consent.
Security advisors reported no error-level findings on either project.
The isolated frontend release build passed. Earlier broad TypeScript checks
had unrelated existing errors and were not represented as passing.
Tokens and task contents were not logged.

Staging deployment: dpl_62CsRGUaBnUZP2ZV1Xs43mZ5pqdp. Future staging releases
must include the test environment variables and update the long OAuth alias.

## Remaining

1. Enable production Supabase oauth_server_allow_dynamic_registration.
   The attempted PATCH was NOT executed: automatic approval review hit its
   usage limit. This was a review-service failure, not an unsafe determination.
   Do not bypass the approval check.
2. Verify public production metadata and unauthenticated 401 after rollout.
3. Add/authenticate production Codex, get the user's consent, and call
   production list_tasks. Production end-to-end success is NOT established.
The reader/session hook, regression script and branded MCP pages are included
in this source revision. Production end-to-end verification remains pending.

## Rollback

Previous deployment: dpl_F4e8hjexYLNhmyL9P4B87dQqVVEx
(digital-content-system-1alw9rddx-tamashop848-3253s-projects.vercel.app).
Ignored local backups: build/boostd-production/hook-before-session-rollout.json
and build/boostd-production/auth-before-session-rollout.json. The Auth backup
contains sensitive settings: never print or commit it.

Disable the dynamic flag, restore the previous build and saved hook, and revoke
affected OAuth sessions/grants. Existing tokens may survive until expiry;
revoke reader membership from authenticator for immediate Data API cutoff.
Keep additive tables and user data. The old dynamic_oauth_staging SQL is
historical and must not be reapplied over the session-bound hook.
