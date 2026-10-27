Creator profile preview
=======================

GET /api/creator-profile?url=<profile link>

The Vite development and preview servers register this endpoint. On Vercel,
api/creator-profile.ts provides the same server-side handler. Other hosts must
deploy that handler separately; a static-only host cannot fetch profile metadata.

Only canonical profile URLs for YouTube, Instagram, TikTok, X and GitHub are
accepted. Arbitrary hosts, credentials, ports, redirects and post/video paths
are rejected. Requests time out after eight seconds and read at most 1.5 MB.

GitHub uses its public users API. YouTube, Instagram and TikTok attempt public
Open Graph metadata without credentials. Sites may block it or omit fields.
X currently detects the platform and handle only. No platform authentication,
private profile access or follower counts are implied. Missing metadata always
falls back to editable details, and saving remains an explicit user action.

Run: node --import tsx creator-import.test.ts
