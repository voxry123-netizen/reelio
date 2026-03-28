from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime

app = FastAPI(title="Reelio AI", version="0.0.1")

class Candidate(BaseModel):
    id: str
    createdAt: Any = None
    realmId: str | None = None
    authorId: str

class FeedScoreIn(BaseModel):
    userId: str
    candidates: List[Candidate]

@app.post("/score/feed")
def score_feed(payload: FeedScoreIn):
    # MVP heuristic scoring: newest + slight boost for realm posts
    scores: Dict[str, float] = {}
    now = datetime.utcnow().timestamp()
    for c in payload.candidates:
        try:
            ts = c.createdAt
            if isinstance(ts, str):
                t = datetime.fromisoformat(ts.replace("Z","+00:00")).timestamp()
            elif isinstance(ts, (int,float)):
                t = float(ts)
            else:
                t = now
        except Exception:
            t = now
        age_sec = max(1.0, now - t)
        base = 1.0 / (age_sec / 3600.0)  # newer => higher
        if c.realmId:
            base *= 1.05
        scores[c.id] = float(base)
    return {"scores": scores}

class ModerationIn(BaseModel):
    text: str | None = None

@app.post("/score/moderation")
def score_moderation(payload: ModerationIn):
    # MVP: naive keyword based
    text = (payload.text or "").lower()
    risk = 0.0
    for bad in ["hate", "kill", "spam"]:
        if bad in text:
            risk += 0.4
    risk = min(1.0, risk)
    return {"risk": risk}

class OptimizeIn(BaseModel):
    title: str
    caption: str | None = None

@app.post("/suggest/content")
def suggest_content(payload: OptimizeIn):
    # MVP: rule-based suggestions
    title = payload.title.strip()
    suggestions = []
    if len(title) < 10:
        suggestions.append("Title too short; add a hook (e.g., 'You won't believe...').")
    if len(title) > 80:
        suggestions.append("Title too long; keep it under ~60 characters for clarity.")
    return {
        "suggestedTitle": title[:60],
        "thumbnailTips": ["Use a high-contrast close-up", "Avoid tiny text", "Show action/motion"],
        "notes": suggestions,
    }
