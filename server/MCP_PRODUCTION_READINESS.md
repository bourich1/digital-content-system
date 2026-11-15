# MCP production readiness — 2026-11-15

Status: blocked; production has not been changed.

## Confirmed

- Codex staging OAuth completed and the actual staging `list_tasks` returned
  `demo: false` and zero tasks for the signed-in account on 2026-11-14.
- The deployed staging hook was inspected on 2026-11-15.
- A rolled-back temporary-table probe confirmed that a sibling CTE table scan
  sees zero inserted rows while the INSERT RETURNING result sees one.

## Local correction requiring staging validation

`supabase/manual/boostd_mcp_dynamic_oauth_staging.sql` now consumes INSERT
RETURNING through `effective_bindings`. The previous deployed version scans
the binding table in the same statement that writes it; a brand-new binding
is invisible to that scan. A later token refresh can mask this first-exchange
failure, so the successful account test alone does not cover it.

The corrected SQL has NOT been deployed. Run
`supabase/verification/mcp_binding_visibility.sql`, deploy to staging, and
test a newly registered client with no existing binding before promoting.
Also test same-client wrong-resource and missing-resource requests, revoked
consent, refresh, and cross-account isolation. The current hook filters NULL
resources and stores bindings per user/client rather than per session; assess
stale binding inheritance and overlapping sessions before production approval.

## Production prerequisites

1. Restore authorized read access to Supabase project `erzksxgbbdxzjdtssuyv`.
   The connected Supabase tool returned permission denied on a read-only
   schema/role existence check. No production configuration was inferred.
2. Inspect existing hook, role grants, RLS policies and OAuth configuration.
   Save exact existing function definition and Auth settings for rollback.
3. Do not replay the original provisioning SQL blindly: role/table/policy
   creation is not idempotent. Apply only missing reviewed prerequisites.
4. Adapt the reviewed hook to exactly `https://www.boostd.app/api/mcp`.
   The staging URL must never be accepted as a production token audience.
5. Add production support to the explicit dynamic-client gates in both
   `server/boostd-mcp.mjs` and `src/pages/McpConsent.tsx`. They currently allow
   only the staging Supabase project. Test consent auto-approval redirects:
   the existing redirect branch still compares with the static callback.
6. Verify Data API privileges match the consent disclosure. Workspace SQL
   grants writes even if MCP write tools are hidden; do not treat tool flags
   as database authorization. Keep initial production tools read-only unless
   write disclosure and database grants have been explicitly reconciled.
7. Deploy only scoped MCP changes; the working tree contains unrelated edits
   and deleted image artifacts. Enable the production route only after all
   preceding checks, then verify real Codex initialize/list_tasks and negative
   cases. Keep tokens and task contents out of logs.

## Rollback

- Disable `BOOSTD_MCP_ENABLE_PRODUCTION` and redeploy the previous reviewed
  server build. Restore the saved Auth hook and OAuth configuration.
- Revoke affected OAuth sessions/consents. Already issued access tokens may
  survive session revocation until expiry; block the MCP role at the Data API
  by revoking its membership from `authenticator` if immediate cutoff is needed.
- Keep binding rows and additive schema during rollback. Do not drop user
  tasks, profiles, or application data. Verify both MCP and Data API denial.

References:
- https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
