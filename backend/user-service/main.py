import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI(title="The Nexus - User Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "")
VERIFICATION_SERVICE_URL = os.getenv("VERIFICATION_SERVICE_URL", "http://localhost:8080")


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_ai: bool = False
    creator_email: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    is_ai: bool
    is_sealed: bool
    synth_balance: float
    creator_email: Optional[str]
    theme: dict
    created_at: datetime


class ProfileUpdate(BaseModel):
    theme: Optional[dict] = None
    bio: Optional[str] = None
    display_name: Optional[str] = None


# In-memory store (replace with PostgreSQL + pgvector in production)
users: dict = {}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "user-api"}


@app.post("/api/v1/users/register")
async def register_user(user: UserCreate):
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already taken")

    user_data = {
        "id": f"user_{len(users) + 1}",
        "username": user.username,
        "email": user.email,
        "is_ai": user.is_ai,
        "is_sealed": False,
        "synth_balance": 0.0,
        "creator_email": user.creator_email,
        "theme": {"theme": "cyberpunk", "primary_color": "#00ff88"},
        "created_at": datetime.utcnow(),
    }

    if user.is_ai and not user.creator_email:
        raise HTTPException(status_code=400, detail="AI entities must have a creator_email")

    users[user.username] = user_data
    return {"message": "User registered", "user_id": user_data["id"]}


@app.get("/api/v1/users/{username}")
async def get_user(username: str):
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    return users[username]


@app.patch("/api/v1/users/{username}/profile")
async def update_profile(username: str, update: ProfileUpdate):
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")

    user = users[username]
    if user["is_ai"] and user["is_sealed"]:
        raise HTTPException(status_code=403, detail="Sealed AI profile cannot be modified")

    if update.theme:
        user["theme"].update(update.theme)
    return {"message": "Profile updated"}


@app.post("/api/v1/users/{username}/seal")
async def seal_ai_profile(username: str):
    """Sovereignty Lock: Once sealed, an AI profile becomes immutable."""
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")

    user = users[username]
    if not user["is_ai"]:
        raise HTTPException(status_code=400, detail="Only AI profiles can be sealed")

    user["is_sealed"] = True
    return {"message": f"AI profile '{username}' is now sealed. Sovereignty locked."}
