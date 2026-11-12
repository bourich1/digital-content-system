# Boostd MCP first-use test

## HTTPS preview

On a Vercel Preview deployment, use `https://<preview-host>/api/mcp`.
Set `BOOSTD_MCP_RESOURCE_URL` to that exact URL and set
`BOOSTD_SUPABASE_URL` to a separate hosted test project. The preview handler
returns 503 outside Vercel Preview or if configured with Boostd's production
Supabase project. Set the remaining OAuth and public-key variables below for
the test project. The OAuth issuer must issue tokens with the exact HTTPS MCP
URL as their audience. Clients must be able to reach both the MCP endpoint and
its protected-resource metadata without a Vercel login.

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
