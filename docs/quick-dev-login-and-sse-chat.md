# Quick Dev Login + SSE Chat (60-second sanity check)

Purpose: unblock local/demo testing when EventSource cannot send Authorization headers.

This guide shows how to enable a dev-only JWT mint endpoint and verify streaming chat works end-to-end using the token passed as a query parameter.

Prereqs:
- Set environment variables for the API (JWT_SECRET at minimum).
- Run the server (see your project start script) and the UI if separate.

Port note (important if you see a code-server login on 8080):
- If your environment already uses port 8080 (for example, code-server listens there), run the API on another port by setting PORT before starting the server, e.g. PORT=8081. Then open http://localhost:8081/ (or your server IP with :8081).
   - Example: `PORT=8081 npm start`
   - Health check: visit `/healthz` on the chosen port to verify the API is up.

Steps:
1) Enable the dev quick login endpoint
   - Set DEV_ENABLE_QUICK_LOGIN=true in your environment (never in production).
   - Ensure JWT_SECRET, JWT_ISSUER (default: ai-automation-platform), and JWT_AUDIENCE (default: ai-automation-clients) are set.

2) Get a token from the UI
   - Open Dashboard → Chat tab.
   - Click “Quick Dev Login” (visible only when no token is present).
   - This calls POST /auth/dev-quick-login and stores the JWT in localStorage as `token`.

3) Start a streaming chat
   - In the Chat tab, type a message and Send.
   - The UI uses EventSource to GET /api/llm/chat/stream and passes the token as a `?token=...` query parameter.
   - The backend’s flexible auth middleware accepts tokens from Authorization header, query `token`, or `X-Chat-Token`.

4) Verify it streams
   - You should see tokens stream into the chat window.
   - Sessions and messages are persisted to Postgres (tables: chat_session, message). Use the sidebar to switch sessions.

Notes and safety:
- The dev quick login is gated by DEV_ENABLE_QUICK_LOGIN; it returns 404 when disabled. Do not enable in production.
- For regular auth flows, use POST /auth/login to mint a token and the UI will automatically attach it to authenticated requests.
- EventSource cannot set custom headers in most browsers; passing the token via query or a secondary header is a common workaround.
- SSE endpoints here: GET /api/llm/chat/stream (preferred for browsers). Non-SSE chat is also available via POST /api/llm/chat with Accept: text/event-stream for streaming-capable clients.

Troubleshooting:
- "missing_token": ensure Quick Dev Login succeeded and localStorage contains `token`.
- 401 invalid/expired: renew token via Quick Dev Login (dev) or /auth/login (normal).
- No stream: check server logs and confirm your provider/model config is valid in the Chat panel (Save & Use), or switch to the built-in fallback provider.
