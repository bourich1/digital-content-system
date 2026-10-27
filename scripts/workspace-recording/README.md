# Workspace tour

The landing page plays `public/videos/boostd-workspace-tour.mp4` (18 seconds, H.264, 1280 × 600). The recording uses fictional data and the real Dashboard, Content Ideas and Calendar components.

The recording-only Vite config aliases authentication, features and the database client to local fixtures. It never connects to the real backend. Run from the workspace root:

    node node_modules/vite/bin/vite.js --config scripts/workspace-recording/vite.config.ts

Open http://127.0.0.1:3001/scripts/workspace-recording/index.html . The `/landing` and `/tour-preview` hash routes are local recording previews; they are not part of the production application.

The Focus Room and Collaborations footage was omitted because browser capture returned stale frames. Replace the MP4, poster and VTT together when recording a longer tour; update chapter times in WorkspaceDemo.tsx.
