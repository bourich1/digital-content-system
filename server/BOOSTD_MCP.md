# Boostd MCP first-use test

## Workspace write access

Test `supabase/manual/boostd_mcp_rpc_grants.sql` and then
`supabase/manual/boostd_mcp_workspace.sql` on a database with the Boostd
policies before applying them in production. The first script preserves the
existing application roles' policy helper access. The second refuses to create
the MCP role if it would inherit execution of a public SECURITY DEFINER
function. It then explicitly permits the caller's own admin-status helper,
which existing table policies need.

Install `supabase/manual/boostd_mcp_oauth_hook.sql` after the workspace role.
Register the intended OAuth client and add its ID and exact HTTPS MCP URL to
`boostd_mcp_private.oauth_clients`. Configure the Supabase Custom Access Token
Hook to call `boostd_mcp_private.custom_access_token`, then verify both claims
with a real token. If the project already has a hook, review how to combine the
logic before changing Auth settings. Set `VITE_BOOSTD_MCP_WORKSPACE_WRITES=true`
on the consent app before issuing workspace tokens so the user sees the full
set of grants.
The MCP server advertises each write operation only when its feature flag is
enabled. These flags control MCP tool discovery and invocation. The SQL grants
control what that token can do directly against the Data API.

After the creator schema change, set `VITE_BOOSTD_CREATOR_SYNC=true` so
Creator Inspiration displays saved account rows alongside existing
browser-local entries. Set `BOOSTD_MCP_ENABLE_CREATOR_WRITES=true` to expose
Instagram creator creation through MCP. The Focus Room tool supplies a
duration link. The user starts the timer inside the app.

## HTTPS preview

On a Vercel Preview deployment, use `https://<preview-host>/api/mcp`.
Set `BOOSTD_MCP_RESOURCE_URL` to that exact URL and set
`BOOSTD_SUPABASE_URL` to a separate hosted test project. The preview handler
returns 503 if configured with Boostd's production Supabase project in Preview.
Set the remaining OAuth and public-key variables below for
the test project. The OAuth issuer must issue tokens with the exact HTTPS MCP
URL as their audience. Clients must be able to reach both the MCP endpoint and
its protected-resource metadata without a Vercel login.

Production uses `https://www.boostd.app/api/mcp`. It is disabled until
`BOOSTD_MCP_ENABLE_PRODUCTION=true` is set on the production deployment.
Production accepts only the scoped workspace role. Verify the actual OAuth
token and database grants before enabling the endpoint.

### Production rollout order

1. Review and apply the RPC grants, workspace role, and OAuth hook SQL files
   in that order. The workspace SQL adds nullable `tasks.due_date` and
   `creators.avatar_url`, plus a unique owner/profile URL index. Check for
   duplicate creator URLs before adding the index.
2. Register the OpenCode public client with its exact loopback callback.
   Insert that client ID and `https://www.boostd.app/api/mcp` in the private
   registry. Configure the Auth token hook before enabling the OAuth server.
   Set the authorization path to `/oauth/consent` and keep dynamic
   registration disabled for this rollout.
3. Deploy Boostd with the production public key and matching OAuth client
   settings. Enable the consent disclosure before issuing write-capable
   workspace tokens. Enable the production MCP route only after deployment
   and database checks.
4. Verify discovery without a Vercel login. Use OpenCode to deny, then
   authorize and create a dated task. Verify that the task appears in Boostd,
   that a second account cannot see it, and that catalog writes are denied.

### Production rollback

1. Turn off `BOOSTD_MCP_ENABLE_PRODUCTION` and redeploy. Revoke the MCP OAuth
   client's grants or disable the client. Restore the previous Auth hook
   configuration before issuing further tokens.
2. Block existing workspace tokens at the Data API by revoking
   `boostd_mcp_workspace` from `authenticator`. Confirm an existing token
   can neither read nor write through the Data API before restoring RPC grants.
3. If the RPC grant change needs to be reverted, restore `EXECUTE TO PUBLIC`
   for the eight functions in `boostd_mcp_rpc_grants.sql`. The production
   baseline already grants execute directly to `anon`, `authenticated` and
   `service_role`. Keep the additive columns and index so existing tasks and
   creators retain their data.

The local OAuth transport listens on `http://127.0.0.1:4317/mcp`.
Start it with `node server/boostd-mcp-http.mjs`.

Use a staging auth project for the first real-account test. Set
`BOOSTD_SUPABASE_URL` on the server and `VITE_SUPABASE_URL` on the web app
to the same staging project or local Supabase origin (such as
`http://127.0.0.1:54321`). Set the app's `VITE_SUPABASE_ANON_KEY`
to its public key.

1. Configure Supabase OAuth with `/oauth/consent` as the authorization path.
   Register the test client's exact callback URI and keep dynamic registration off.
2. Set `BOOSTD_MCP_OAUTH_CLIENT_ID` on the server and
   `VITE_BOOSTD_MCP_OAUTH_CLIENT_ID` on the web app to the registered client ID.
   Set `VITE_BOOSTD_MCP_OAUTH_CALLBACK` to the registered callback URI.
   Set `BOOSTD_SUPABASE_PUBLIC_KEY` on the server to the project's public key.
3. Verify that the signed OAuth token includes the registered `client_id` and
   the exact MCP endpoint in its audience. A normal Boostd browser session is
   rejected at the HTTP endpoint.
4. In the client, configure a remote MCP server with the loopback URL and the
   pre-registered OAuth client ID. The server starts OAuth discovery with a
   `401` challenge. Test denial, approval, an owned task read, and a second
   account with distinct tasks.

Before granting OAuth access on the live Supabase project, verify directly that
the issued token is restricted at the database and other application API
boundaries. A client that receives a Supabase token can try calling those APIs
directly. Restrict OAuth sessions to the intended owned reads and verify that
they cannot write, invoke privileged RPCs, or read other account data.
