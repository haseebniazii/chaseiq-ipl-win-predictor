/**
 * Frontend configuration.
 *
 * Local development: leave API_BASE_URL empty. script.js automatically uses
 * http://127.0.0.1:8000 if the frontend is running locally on another port.
 *
 * Vercel backend deployed separately? Set this to the backend's PUBLIC HTTPS
 * root URL (NO trailing /api/predict):
 *   API_BASE_URL: "https://your-ipl-backend.vercel.app"
 *
 * If frontend & FastAPI share the exact same domain, leave empty.
 * You can also change the URL in the site's API Settings modal (stored locally).
 */
window.IPL_CONFIG = Object.freeze({
  API_BASE_URL: "",
  REQUEST_TIMEOUT_MS: 15000
});
