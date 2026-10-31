
from __future__ import annotations

import logging
import os
import pickle
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

LOGGER = logging.getLogger("ipl_predictor")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "CHASEIQ-IPL-Frontend"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(BASE_DIR / "pipe.pkl"))).expanduser().resolve()
MODEL_SCORE_FIELD = os.getenv("MODEL_SCORE_FIELD", "first_innings").strip().lower()
if MODEL_SCORE_FIELD not in {"first_innings", "target"}:
    raise ValueError("MODEL_SCORE_FIELD must be 'first_innings' or 'target'")

# Accept official renamed names only when the original trained category exists.
TEAM_ALIASES = {
    "punjab kings": "Kings XI Punjab",
    "royal challengers bengaluru": "Royal Challengers Bangalore",
}
EXPECTED_FEATURES = (
    "batting_team", "bowling_team", "city", "runs_left", "balls_left",
    "wickets", "total_runs_x", "crr", "rrr",
)


class PredictRequest(BaseModel):
    """Current state of a SECOND-INNINGS IPL chase."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "batting_team": "Mumbai Indians",
                    "bowling_team": "Chennai Super Kings",
                    "city": "Mumbai",
                    "target": 181,
                    "current_score": 120,
                    "overs": "13.0",
                    "wickets_lost": 4,
                }
            ]
        },
    )

    batting_team: str = Field(min_length=2, max_length=100)
    bowling_team: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    target: int = Field(gt=0, le=600, description="Runs required to win the chase")
    current_score: int = Field(ge=0, le=600, description="Batting team's current runs")
    overs: str = Field(description="Cricket notation: 12.3 = 12 overs + 3 balls")
    wickets_lost: int = Field(ge=0, le=10, description="Wickets that have fallen, NOT wickets remaining")

    @field_validator("batting_team", "bowling_team", "city", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> str:
        if not isinstance(value, str):
            raise ValueError("Must be a text value")
        value = value.strip()
        if not value:
            raise ValueError("Must not be empty")
        return value

    @field_validator("overs", mode="before")
    @classmethod
    def check_cricket_overs(cls, value: Any) -> str:
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            raise ValueError("Use cricket overs such as 12.3 (12 overs, 3 balls)")
        raw = str(value).strip()
        # An over's fraction is balls 0..5, never tenths of a decimal over.
        if not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.[0-5])?", raw):
            raise ValueError("Invalid cricket overs: use 12.3, never 12.6 or 12.59")
        overs_part, _, ball_part = raw.partition(".")
        whole, ball = int(overs_part), int(ball_part or "0")
        if whole > 20 or (whole == 20 and ball != 0):
            raise ValueError("IPL regulation innings cannot exceed 20.0 overs")
        return f"{whole}.{ball}"


class PredictionResponse(BaseModel):
    batting_team: str
    bowling_team: str
    city: str
    target: int
    current_score: int
    overs: str
    balls_bowled: int
    balls_left: int
    wickets_lost: int
    wickets_remaining: int
    runs_left: int
    current_run_rate: float
    required_run_rate: float | None
    win_probability: float | None = Field(description="Batting team's win chance, percent; null on a tie")
    lose_probability: float | None = Field(description="Bowling team's win chance, percent; null on a tie")
    predicted_winner: str | None
    match_status: Literal["in_progress", "won", "lost", "tied"]
    message: str


class BatchPredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    matches: list[PredictRequest] = Field(min_length=1, max_length=120)


class BatchPredictResponse(BaseModel):
    count: int
    predictions: list[PredictionResponse]


def _get_categories(model: Any) -> dict[str, list[str]]:
    """Read actual fitted OneHotEncoder labels (avoid unsupported teams/cities)."""
    results: dict[str, list[str]] = {}
    for _step_name, step in getattr(model, "steps", []):
        if not hasattr(step, "transformers_"):
            continue
        for _name, transformer, columns in step.transformers_:
            if not hasattr(transformer, "categories_"):
                continue
            for column, options in zip(columns, transformer.categories_):
                if column in {"batting_team", "bowling_team", "city"}:
                    results[column] = sorted(str(value) for value in options)
    missing = {"batting_team", "bowling_team", "city"} - results.keys()
    if missing:
        raise RuntimeError(f"Model's categorical feature metadata is incomplete: {sorted(missing)}")
    return results


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}. Put pipe.pkl beside main.py")
    # Only load a trusted pickle that you trained or inspected yourself.
    with MODEL_PATH.open("rb") as model_file:
        model = pickle.load(model_file)  # noqa: S301 -- trusted local ML artifact
    if not callable(getattr(model, "predict_proba", None)):
        raise RuntimeError("pipe.pkl does not contain a probability prediction pipeline")
    input_features = list(getattr(model, "feature_names_in_", []))
    if set(input_features) != set(EXPECTED_FEATURES) or len(input_features) != len(EXPECTED_FEATURES):
        raise RuntimeError(
            f"Model expects {input_features}; API supports {list(EXPECTED_FEATURES)}. "
            "Update your backend's feature mapping if you retrained a different model."
        )
    model_classes = list(getattr(model, "classes_", []))
    if 0 not in model_classes or 1 not in model_classes or len(model_classes) != 2:
        raise RuntimeError("Expected a binary model with class 0 = loss, class 1 = win")
    app.state.model = model
    app.state.input_features = input_features
    app.state.win_class_index = model_classes.index(1)
    app.state.categories = _get_categories(model)
    LOGGER.info("IPL predictor model loaded from %s", MODEL_PATH)
    yield
    app.state.model = None


app = FastAPI(
    title="IPL Win Probability Predictor API",
    version="1.0.0",
    description=(
        "Real-time IPL second-innings match win probabilities using your saved "
        "scikit-learn pipeline. Use GET /api/options for trained teams and cities."
    ),
    lifespan=lifespan,
)

# For production, set FRONTEND_ORIGINS="https://your-frontend.example".
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


def _canonical(value: str, choices: list[str], kind: str) -> str:
    """Case-insensitive category resolution; never pass unknown labels to OHE."""
    normalized = value.strip().casefold()
    lookup = {choice.casefold(): choice for choice in choices}
    if kind in {"batting_team", "bowling_team"} and normalized not in lookup:
        normalized = TEAM_ALIASES.get(normalized, normalized).casefold()
    if normalized not in lookup:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "field": kind,
                "message": f"Unsupported {kind.replace('_', ' ')}: {value!r}",
                "allowed_values": choices,
            },
        )
    return lookup[normalized]


def _predict(payload: PredictRequest, request: Request) -> PredictionResponse:
    categories: dict[str, list[str]] = request.app.state.categories
    batting_team = _canonical(payload.batting_team, categories["batting_team"], "batting_team")
    bowling_team = _canonical(payload.bowling_team, categories["bowling_team"], "bowling_team")
    city = _canonical(payload.city, categories["city"], "city")
    if batting_team == bowling_team:
        raise HTTPException(status_code=422, detail="Batting and bowling teams cannot be the same")

    over_str, ball_str = payload.overs.split(".")
    balls_bowled = int(over_str) * 6 + int(ball_str)
    balls_left = 120 - balls_bowled
    wickets_remaining = 10 - payload.wickets_lost
    runs_left = max(payload.target - payload.current_score, 0)

    # Pipeline only learned from deliveries AFTER play started, not pre-match odds.
    if balls_bowled == 0:
        raise HTTPException(
            status_code=422,
            detail="At least one ball must have been bowled (use overs='0.1' or later)",
        )

    crr = round(payload.current_score * 6 / balls_bowled, 4)
    rrr = round(runs_left * 6 / balls_left, 4) if balls_left else None

    if payload.current_score >= payload.target:
        match_status, win, message = "won", 100.0, "Target reached: batting team won the chase."
    elif balls_left == 0 or wickets_remaining == 0:
        if payload.current_score == payload.target - 1:
            match_status, win, message = (
                "tied", None,
                "Scores tied: Super Over outcome cannot be predicted by this model.",
            )
        else:
            match_status, win, message = "lost", 0.0, "Chase ended before the target was reached."
    else:
        match_status, message = "in_progress", "Probability estimated from the trained IPL model."
        # In the supplied notebook total_runs_x is the first-innings score.
        model_total = payload.target - 1 if MODEL_SCORE_FIELD == "first_innings" else payload.target
        row = {
            "batting_team": batting_team,
            "bowling_team": bowling_team,
            "city": city,
            "runs_left": runs_left,
            "balls_left": balls_left,
            "wickets": wickets_remaining,
            "total_runs_x": model_total,
            "crr": payload.current_score * 6 / balls_bowled,
            "rrr": runs_left * 6 / balls_left,
        }
        frame = pd.DataFrame([row], columns=request.app.state.input_features)
        try:
            probabilities = request.app.state.model.predict_proba(frame)[0]
            probability = float(probabilities[request.app.state.win_class_index])
            if not 0 <= probability <= 1:
                raise ValueError("Invalid output probability from model")
        except Exception as exc:
            LOGGER.exception("Model prediction failed")
            raise HTTPException(
                status_code=500,
                detail="ML prediction failed. Verify pipe.pkl and installed scikit-learn version.",
            ) from exc
        win = round(probability * 100, 2)

    lose = round(100.0 - win, 2) if win is not None else None
    predicted_winner = None if win is None else batting_team if win >= 50 else bowling_team
    return PredictionResponse(
        batting_team=batting_team,
        bowling_team=bowling_team,
        city=city,
        target=payload.target,
        current_score=payload.current_score,
        overs=payload.overs,
        balls_bowled=balls_bowled,
        balls_left=balls_left,
        wickets_lost=payload.wickets_lost,
        wickets_remaining=wickets_remaining,
        runs_left=runs_left,
        current_run_rate=round(crr, 2),
        required_run_rate=round(rrr, 2) if rrr is not None else None,
        win_probability=win,
        lose_probability=lose,
        predicted_winner=predicted_winner,
        match_status=match_status,
        message=message,
    )


@app.get("/api", tags=["General"])
def root():
    return {
        "name": "IPL Win Probability Predictor API",
        "version": app.version,
        "status": "running",
        "docs": "/docs",
        "predict": "/api/predict",
        "options": "/api/options",
    }


@app.get("/api/health", tags=["General"])
def health(request: Request):
    return {"status": "ok", "model_loaded": request.app.state.model is not None}


@app.get("/api/options", tags=["General"])
def options(request: Request):
    categories: dict[str, list[str]] = request.app.state.categories
    teams = sorted(set(categories["batting_team"]) & set(categories["bowling_team"]))
    return {
        "teams": teams,
        "cities": categories["city"],
        "aliases": TEAM_ALIASES,
        "overs_format": "12.3 = 12 overs and 3 balls",
        "model_score_field": MODEL_SCORE_FIELD,
    }


@app.get("/api/teams", tags=["General"])
def teams(request: Request):
    choices = request.app.state.categories
    return {"teams": sorted(set(choices["batting_team"]) & set(choices["bowling_team"]))}


@app.get("/api/cities", tags=["General"])
def cities(request: Request):
    return {"cities": request.app.state.categories["city"]}


@app.post("/api/predict", response_model=PredictionResponse, tags=["Predictions"])
@app.post("/predict", response_model=PredictionResponse, include_in_schema=False)
def predict(payload: PredictRequest, request: Request) -> PredictionResponse:
    """Predict chase outcome; returns both teams' win/loss probabilities."""
    return _predict(payload, request)


@app.post("/api/predict/batch", response_model=BatchPredictResponse, tags=["Predictions"])
def predict_batch(payload: BatchPredictRequest, request: Request) -> BatchPredictResponse:
    """Predict up to 120 match states, useful for plotting a progression chart."""
    result = [_predict(match, request) for match in payload.matches]
    return BatchPredictResponse(count=len(result), predictions=result)


# Serve the entire HTML/CSS/JS website on the SAME domain as the API.
# Keep this mount LAST: /api/*, /docs and /openapi.json take precedence.
if not (FRONTEND_DIR / "index.html").is_file():
    raise RuntimeError(f"Frontend index.html not found: {FRONTEND_DIR}")
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", "8000")))
