<div align="center">
  <img src="CHASEIQ-IPL-Frontend/assets/favicon.svg" alt="CHASEIQ logo" width="80" />

  # CHASEIQ

  ### IPL Win Probability Predictor

  **Cricket intelligence, one delivery at a time.**  
  A full-stack machine learning web application that estimates a team's chances of winning an **IPL second-innings run chase**.

  [![Live App](https://img.shields.io/badge/Live_App-Explore_CHASEIQ-88E05F?style=for-the-badge&logo=vercel&logoColor=white)](https://chaseiq-ipl-win-predictor.vercel.app/)
  [![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github)](https://github.com/haseebniazii/chaseiq-ipl-win-predictor)

  <br />

  ![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
  ![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
  ![scikit-learn](https://img.shields.io/badge/scikit--learn-Machine_Learning-F7931E?logo=scikitlearn&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
  ![HTML5](https://img.shields.io/badge/HTML5-Frontend-E34F26?logo=html5&logoColor=white)
  ![CSS3](https://img.shields.io/badge/CSS3-Responsive_UI-1572B6?logo=css3&logoColor=white)
  ![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)
  ![License: MIT](https://img.shields.io/badge/License-MIT-green)
</div>

---

## 🌐 Live Application

**Website:** https://chaseiq-ipl-win-predictor.vercel.app/  
**Interactive API documentation:** https://chaseiq-ipl-win-predictor.vercel.app/docs  
**GitHub repository:** https://github.com/haseebniazii/chaseiq-ipl-win-predictor

> **Important:** CHASEIQ is a model-based **match scenario predictor**, not a live IPL score feed. You provide the current match situation, and the application estimates probabilities using a saved model trained on historical IPL data.

## 📸 Application Preview

<div align="center">
  <img src="docs/screenshots/desktop.jpg" alt="CHASEIQ desktop interface showing its cricket-themed website" width="850" />
  <p><sub>Desktop experience — prediction interface and cricket analytics theme</sub></p>
</div>

<details>
<summary><b>📱 View mobile screenshot</b></summary>
<br />
<div align="center">
  <img src="docs/screenshots/mobile.jpg" alt="CHASEIQ responsive mobile interface" width="340" />
</div>
</details>

## 📌 About the Project

**CHASEIQ** transforms the state of an IPL run chase into an easy-to-read prediction. Instead of relying on intuition alone, it combines the match situation with a trained **scikit-learn Logistic Regression pipeline** to estimate the chasing team's probability of winning.

The application provides a **responsive cricket-themed frontend** built with HTML, CSS, and JavaScript, along with a **FastAPI backend** that loads the saved `pipe.pkl` model and performs inference. Both are served together from **one Vercel deployment**.

Select the batting team, bowling team, venue, target, score, overs, and wickets lost. CHASEIQ calculates the match features, requests a prediction, and visualizes the result.

## ✨ Key Features

| Feature | What it does |
| --- | --- |
| 🏏 **IPL chase prediction** | Estimates win and loss probabilities for the second innings. |
| 🎯 **Predicted winner** | Displays the team favored by the model at the supplied match state. |
| 📊 **Probability visualization** | Shows a percentage gauge and side-by-side team probability indicators. |
| 📈 **Momentum chart** | Plots predictions made during the current browser session as you update the chase. |
| ⚡ **What-if scenarios** | Simulates **+4 runs** or **one wicket lost** on the next ball and requests a fresh prediction. |
| 🧮 **Automatic cricket metrics** | Calculates runs required, balls remaining, wickets remaining, CRR, and RRR. |
| 🏟️ **Model-supported options** | Loads supported teams and cities from the trained model through the API. |
| 🛡️ **Input validation** | Checks score, target, overs, teams, city, and wickets before prediction. |
| 🏁 **Match-end handling** | Handles target reached, all out, overs completed, and tied scores. |
| 📱 **Responsive frontend** | Designed for desktop, tablet, and mobile screens. |
| 🔌 **API settings** | Supports an optional custom API base URL, saved in the current browser. |
| ☁️ **Single-domain deployment** | FastAPI serves both the website and prediction endpoints on Vercel. |

## 🔄 How CHASEIQ Works

```text
           User selects an IPL chase scenario
                         │
                         ▼
               HTML / CSS / JavaScript
                         │
                         ▼
                 POST /api/predict
                         │
                         ▼
                    FastAPI
                         │
           Input validation and calculation
                         │
                         ▼
           Match-state feature preparation
                         │
                         ▼
         Saved scikit-learn pipeline (pipe.pkl)
                         │
               predict_proba(...)
                         │
                         ▼
           Win/Loss probability response
                         │
                         ▼
          Probability cards + match statistics
                         │
                         ▼
             Session momentum visualization
```

### Example match scenario

| Match detail | Example |
| --- | --- |
| Batting (chasing) team | Mumbai Indians |
| Bowling (defending) team | Chennai Super Kings |
| Venue | Mumbai |
| Target to win | 181 runs |
| Current score | 120/4 |
| Overs completed | 13.0 |
| Runs remaining | 61 |
| Balls remaining | 42 |

In one tested example, the saved model returned **77.37%** for Mumbai Indians and **22.63%** for Chennai Super Kings. These are **illustrative model outputs**, not actual match results or guaranteed predictions.

## 🧠 Machine Learning Model

The project's notebook (`ipl.ipynb`) contains the data preparation and model-building workflow. The backend performs predictions using the serialized scikit-learn pipeline stored in `pipe.pkl`.

**Model approach:** Logistic Regression with one-hot encoding for categorical features.

| Model input | Meaning |
| --- | --- |
| `batting_team` | Team chasing the target |
| `bowling_team` | Team defending the target |
| `city` | Match venue city |
| `runs_left` | Runs still required to win |
| `balls_left` | Legal deliveries remaining in a 20-over innings |
| `wickets` | Wickets remaining |
| `total_runs_x` | First-innings total (for the included model) |
| `crr` | Current run rate |
| `rrr` | Required run rate |

**Prediction process:** `OneHotEncoder` processes team/venue fields, while the numerical features and encoded categories are passed to the saved classifier. The backend calls `predict_proba()` to return the chasing team's estimated win percentage.

> The predictions depend on the quality and coverage of the historical training data. A probability is an estimate, **not a guarantee**. The model is designed for **second-innings chases only**; it does not predict toss outcomes, first innings, Super Overs, or automatically retrieve live scores.

## 🛠️ Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript, SVG |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Machine Learning | scikit-learn, pandas, NumPy, Pickle |
| Data / development | Historical IPL `matches.csv` and `deliveries.csv`, Jupyter Notebook |
| Deployment | Vercel (one full-stack project) |
| Version control | Git and GitHub |

No React build, Node.js runtime, frontend framework, or external charting library is required.

## 📁 Project Structure

```text
chaseiq-ipl-win-predictor/
│
├── CHASEIQ-IPL-Frontend/
│   ├── assets/
│   │   ├── favicon.svg
│   │   └── IMAGE-CREDITS.md
│   ├── index.html             # Website layout
│   ├── style.css              # Responsive cricket-themed design
│   ├── script.js              # API requests, UI updates, chart, scenarios
│   ├── config.js              # Optional API base URL
│   ├── vercel.json            # Frontend-only deployment config (not used here)
│   └── README.md
│
├── docs/
│   └── screenshots/           # Images used by this README
│       ├── desktop.jpg
│       └── mobile.jpg
│
├── main.py                    # FastAPI app + static frontend serving
├── pipe.pkl                   # Saved trained ML pipeline
├── matches.csv                # Historical match-level dataset
├── deliveries.csv             # Historical ball-by-ball dataset
├── ipl.ipynb                  # ML development notebook
├── requirements.txt           # Python dependencies
├── .gitignore
├── LICENSE
└── README.md
```

## ⚙️ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/haseebniazii/chaseiq-ipl-win-predictor.git
cd chaseiq-ipl-win-predictor
```

### 2. Create and activate a virtual environment

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

Use a compatible Python version (Python **3.11+**) and the scikit-learn version pinned in `requirements.txt`, since pickle models may not load correctly across library versions.

### 4. Start the application

```bash
python -m uvicorn main:app --reload
```

Open:

| Page | URL |
| --- | --- |
| Full website | http://127.0.0.1:8000/ |
| Swagger API documentation | http://127.0.0.1:8000/docs |
| API status | http://127.0.0.1:8000/api |
| Teams and cities | http://127.0.0.1:8000/api/options |

The frontend is served by FastAPI itself, so **you do not need a separate frontend server**. Keep `pipe.pkl` and `CHASEIQ-IPL-Frontend/` beside `main.py`.

## 🔌 REST API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | CHASEIQ frontend |
| `GET` | `/api` | API status and useful links |
| `GET` | `/api/health` | Backend and model readiness |
| `GET` | `/api/options` | Valid team and venue choices |
| `GET` | `/api/teams` | Teams supported by the model |
| `GET` | `/api/cities` | Cities supported by the model |
| `POST` | `/api/predict` | Predict a single chase state |
| `POST` | `/api/predict/batch` | Predict up to 120 chase states |
| `GET` | `/docs` | Swagger UI |

### Predict match win probability

**Request:** `POST /api/predict`

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

**Example response (selected fields):**

```json
{
  "batting_team": "Mumbai Indians",
  "bowling_team": "Chennai Super Kings",
  "target": 181,
  "current_score": 120,
  "balls_left": 42,
  "runs_left": 61,
  "wickets_remaining": 6,
  "current_run_rate": 9.23,
  "required_run_rate": 8.71,
  "win_probability": 77.37,
  "lose_probability": 22.63,
  "predicted_winner": "Mumbai Indians",
  "match_status": "in_progress"
}
```

The complete response also contains the venue, overs, balls bowled, wickets lost, and a status message. See the [interactive API docs](https://chaseiq-ipl-win-predictor.vercel.app/docs) for the full schema.

### Important input rules

- `target` means **runs needed to win** (first-innings score + 1).
- `overs` uses cricket notation: `12.3` means **12 overs and 3 balls**, not 12.3 decimal overs.
- `wickets_lost` is the wickets already fallen, between 0 and 10.
- At least one delivery must be bowled before an in-progress prediction.
- The selected teams must be different and must be supported by the trained model; cities also must match model options.
- Invalid inputs return HTTP `422`. Errors during model inference return HTTP `500`.

## ☁️ Deploying to Vercel

CHASEIQ is deployed as **one FastAPI project** that serves both frontend files and backend endpoints under the same domain.

1. Push the project to your GitHub repository.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Select the **FastAPI** framework preset.
4. Set **Root Directory** to `./` (repository root).
5. Let Vercel install dependencies from `requirements.txt`.
6. Deploy and test `/`, `/api/options`, and `/docs` on the assigned domain.

**Frontend configuration:** In `CHASEIQ-IPL-Frontend/config.js`, keep:

```javascript
window.IPL_CONFIG = Object.freeze({
  API_BASE_URL: "",
  REQUEST_TIMEOUT_MS: 15000
});
```

An empty API base URL means frontend requests are sent to the **same origin** as the website. No second Vercel project or cross-origin CORS configuration is necessary for this setup. The frontend's API Settings panel can also override the URL in an individual browser.

For this single-project deployment, the nested frontend `vercel.json` is **not** the repository-root Vercel configuration.

## 🧪 Testing and Troubleshooting

| Issue | What to check |
| --- | --- |
| Homepage shows JSON instead of CHASEIQ | Ensure `main.py` mounts `CHASEIQ-IPL-Frontend` at `/` after the API routes. |
| API status says offline | Confirm `/api/options` loads and clear any saved custom API URL in site settings. |
| HTTP `422` | Check team/city options, target, wickets, and cricket overs format. |
| HTTP `500` | Check function logs and that the trained `pipe.pkl` matches the installed scikit-learn version. |
| Blank photos | Stadium photographs are hosted externally and require an internet connection. |
| Momentum chart has one point | Enter another match state in the same browser session to add a new point. |

## 📚 What I Learned

- Preparing and exploring historical cricket datasets in Python.
- Building a probability-based ML prediction workflow with scikit-learn.
- Serializing and loading a trained model for inference.
- Validating cricket-specific inputs using Pydantic.
- Designing REST APIs using FastAPI.
- Creating responsive interfaces with HTML, CSS, and vanilla JavaScript.
- Connecting a frontend to an ML backend with `fetch()`.
- Building data visualizations and match what-if scenarios without a chart library.
- Deploying a full-stack Python application with GitHub and Vercel.

## 🚀 Future Improvements

Potential extensions (not part of the current release):

- Integration with a licensed live cricket score provider.
- Additional IPL seasons and periodic model retraining.
- Model benchmarking, calibration, and season-based validation.
- Historical match replay and match comparisons.
- Multiple models and side-by-side prediction explanations.
- Optional player and venue-level features, where reliable data is available.

## 🧾 Data, Imagery and Disclaimer

The model uses historical IPL data; support for teams and venues depends on the training dataset. The frontend references cricket photography hosted by **Unsplash**. Image credits are documented in [`IMAGE-CREDITS.md`](CHASEIQ-IPL-Frontend/assets/IMAGE-CREDITS.md).

CHASEIQ is an independent educational project, **not affiliated with or endorsed by the IPL, BCCI, or any IPL franchise**. Estimates should not be interpreted as guaranteed outcomes or betting advice. Review original dataset and image licensing terms before redistributing third-party material.

## 👨‍💻 Author

**Haseeb Khan**  
Computer Science student interested in Python, Machine Learning, AI, and full-stack development.

- **GitHub:** [@haseebniazii](https://github.com/haseebniazii)
- **Project:** [chaseiq-ipl-win-predictor](https://github.com/haseebniazii/chaseiq-ipl-win-predictor)
- **Live demo:** [CHASEIQ](https://chaseiq-ipl-win-predictor.vercel.app/)

## 📜 License

Released under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>CHASEIQ — The game, decoded.</b>
  <br />
  <sub>Built with Python, Machine Learning, FastAPI, HTML, CSS, and JavaScript.</sub>
  <br /><br />
  ⭐ If this project is useful, consider starring the repository.
</div>
