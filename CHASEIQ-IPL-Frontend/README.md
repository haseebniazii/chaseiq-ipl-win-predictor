# CHASEIQ — IPL Win Probability Predictor (Frontend)

Premium responsive cricket analytics frontend using **HTML, CSS and vanilla JavaScript**. Connects to your existing FastAPI `main.py` and trained `pipe.pkl` model. No npm, no React, no paid libraries.

## Files

```text
CHASEIQ-IPL-Frontend/
├── index.html          # Full responsive website
├── style.css           # Premium dark sports styling + mobile layouts
├── script.js           # Real API integration, charts, errors and what-if controls
├── config.js           # CONFIGURE YOUR BACKEND URL HERE
├── vercel.json         # Vercel static site configuration
├── assets/
│   ├── favicon.svg
│   └── IMAGE-CREDITS.md
└── README.md
```

The two **real sports photographs** are loaded via public Unsplash image URLs in `index.html` (hero and "How it works" section). This keeps the ZIP small. **An internet connection is required to show the photographs and optional Google Fonts.** The layout has color-gradient fallbacks if a photo or font doesn't load. Image authors are credited in the footer.

## 1. Run on your computer

First start **your existing backend** in its own folder (where `main.py` and `pipe.pkl` are present):

```powershell
pip install -r requirements.txt
uvicorn main:app --reload
```

Your backend should show Swagger at:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/api/options

Now open a **second terminal** inside this downloaded frontend folder:

```powershell
cd CHASEIQ-IPL-Frontend
python -m http.server 5173
```

Then visit **http://127.0.0.1:5173** in the browser. Port `5173` is intentional because your existing `main.py` already permits that frontend origin in CORS. If you use VS Code Live Server's port `5500` instead, update the backend's `FRONTEND_ORIGINS` as explained below.

The site automatically detects local frontend development and calls **http://127.0.0.1:8000** for the backend.

## 2. Deploy BACKEND `main.py` on Vercel

1. Deploy the backend project with `main.py`, `pipe.pkl`, and `requirements.txt` together. The FastAPI instance must be named `app` (it is named `app` in your existing backend).
2. Make sure the deployed URL works, e.g. `https://YOUR-BACKEND.vercel.app/api/options` and `https://YOUR-BACKEND.vercel.app/docs`.
3. If deployment fails, check the Vercel function logs, Python version and the compatibility of `pipe.pkl` with the installed scikit-learn version. Your existing requirements pin `scikit-learn==1.9.0`.

Current official deployment documentation: https://vercel.com/docs/frameworks/backend/fastapi

## 3. EXACT JavaScript change after backend goes live

Open **`config.js`**, find:

```js
window.IPL_CONFIG = Object.freeze({
  API_BASE_URL: "",
  REQUEST_TIMEOUT_MS: 15000
});
```

Change only `API_BASE_URL` to **your own real deployed FastAPI domain**:

```js
window.IPL_CONFIG = Object.freeze({
  API_BASE_URL: "https://YOUR-BACKEND.vercel.app",
  REQUEST_TIMEOUT_MS: 15000
});
```

**Rules:**
- Use HTTPS for Vercel.
- Do **not** put `/api/predict`, `/api/options` or `/docs` after the domain.
- No trailing `/` is necessary.
- You do **not** need to change any of the API routes inside `script.js`.
- If frontend and backend are on the **same domain**, leave `API_BASE_URL: ""` so the frontend calls the same origin.

**Without editing any file:** Click **API settings** in the top right of the website, type the backend URL, and choose **Save & connect**. This saves the URL for that browser using localStorage. If you later edit `config.js` but still see the old URL, use **Reset to automatic connection** from API settings to clear the stored override.

## 4. IMPORTANT: CORS for a separate Vercel frontend

If your FastAPI backend is deployed at `https://YOUR-BACKEND.vercel.app` and this frontend is deployed at a **different** Vercel domain, e.g. `https://YOUR-FRONTEND.vercel.app`, then your existing backend **must allow the FRONTEND origin**.

In your backend's Vercel project, go to **Settings → Environment Variables** and add:

```text
Name:  FRONTEND_ORIGINS
Value: https://YOUR-FRONTEND.vercel.app
```

Redeploy the backend after changing the environment variable. Enter the **frontend** URL there, not the backend URL. Do not add a trailing slash or path. If you have multiple permitted frontends, provide comma-separated origins:

```text
FRONTEND_ORIGINS=http://127.0.0.1:5173,https://YOUR-FRONTEND.vercel.app
```

Your current `main.py` already reads this environment variable; no Python source change is needed. For localhost port `5500`, for example:

```text
FRONTEND_ORIGINS=http://127.0.0.1:5500,http://127.0.0.1:5173,https://YOUR-FRONTEND.vercel.app
```

For Vercel preview deployments, each preview hostname would also need to be allowed (or you can deploy the frontend/backend on the same origin). Do not use `*` indiscriminately for a public production API.

## 5. Deploy FRONTEND to Vercel

1. Put `index.html`, `style.css`, `script.js`, `config.js`, `assets/`, and `vercel.json` into a GitHub repository (or upload the extracted frontend folder via Vercel CLI).
2. Import the repository at https://vercel.com/new.
3. Set Framework Preset to **Other** if asked. There is no build command and no output directory needed for this static website.
4. Deploy. Visit the published homepage and test **Calculate win probability**.
5. If the frontend and backend use different domains, configure **both** `API_BASE_URL` in `config.js` and the backend `FRONTEND_ORIGINS` environment variable.

## What the site does

- Retrieves trained **teams and cities** from `GET /api/options`.
- Automatically submits the included **sample match scenario** when the backend is available (it is an example, **not a live match feed**).
- Calls `POST /api/predict` with the exact fields supported by your backend.
- Displays model-calculated win/loss probabilities, predicted winner, runs/balls remaining, CRR and RRR.
- Provides quick **+4 runs on the next ball** and **lose a wicket on the next ball** what-if actions (both make actual requests to the model).
- Builds a **session-only momentum chart** from your own predictions. It never fabricates historical points or downloads live IPL match scores.
- Handles match completion, ties, errors, validation and mobile screens.

## Troubleshooting

| Symptom | Fix |
|---|---|
| API offline | Make sure `https://YOUR-BACKEND.vercel.app/api/options` works directly, then update `config.js` or API settings. |
| Browser CORS error | Set `FRONTEND_ORIGINS` on the backend to the **exact** website origin, then redeploy. |
| Error 422 | Teams/cities must be from model options; use `12.3` rather than `12.6`; target is **first-innings runs + 1**; wickets input means wickets **lost**. |
| Error 500 | Inspect backend logs. Ensure your saved model and scikit-learn versions match. |
| Photos not visible | The photos are remote Unsplash images; they need internet. The website layout still works using gradient fallback. |
| Frontend config change ignored | API settings may have a browser-local override; reset it in the settings dialog. |
| Chart contains only one point | That's correct until you submit additional match states in the same chase. |

## Example API request

```json
{
  "batting_team": "Mumbai Indians",
  "bowling_team": "Chennai Super Kings",
  "city": "Mumbai",
  "target": 181,
  "current_score": 120,
  "overs": "13.0",
  "wickets_lost": 4
}
```

`target` = runs needed to win the chase, **not** the first-innings total. `overs` is cricket notation, not decimal fractions.

## Image credits / rights

The real images are linked from Unsplash rather than redistributed in the ZIP. Photographer credits and their source URLs are in `assets/IMAGE-CREDITS.md`, and visible in the site footer. Unsplash license: https://unsplash.com/license. This student website uses text team names / colored initials rather than official IPL team logos; it has no IPL affiliation.
