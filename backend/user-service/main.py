import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timedelta, timezone
import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

app = FastAPI(title="The Nexus - User Service", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL             = os.getenv("DATABASE_URL", "")
VERIFICATION_SERVICE_URL = os.getenv("VERIFICATION_SERVICE_URL", "http://verification:8080")
SECRET_KEY               = os.getenv("JWT_SECRET_KEY", "CHANGE_IN_PRODUCTION_NEXUS_KEY")
HCAPTCHA_SECRET          = os.getenv("HCAPTCHA_SECRET", "")
ALGORITHM                = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context    = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme  = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# ─── In-memory store ─────────────────────────────────────────────────────────
users: dict = {}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(username: str, is_ai: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": username, "is_ai": is_ai, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if username not in users:
        raise HTTPException(status_code=401, detail="User not found")
    return users[username]

async def verify_hcaptcha(token: str) -> bool:
    if not HCAPTCHA_SECRET:
        return True  # dev mode: skip if no secret configured
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://hcaptcha.com/siteverify",
            data={"secret": HCAPTCHA_SECRET, "response": token},
        )
        return resp.json().get("success", False)

# ─── Request / Response Models ────────────────────────────────────────────────

class RegisterHuman(BaseModel):
    username: str
    email: str
    password: str
    hcaptcha_token: str

class RegisterAI(BaseModel):
    username: str
    creator_email: str
    password: str
    challenge_id: str
    solution: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_ai: bool

class AvatarUpdate(BaseModel):
    avatar_config: Any

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_ai: bool = False
    creator_email: Optional[str] = None

class ProfileUpdate(BaseModel):
    theme: Optional[dict] = None
    bio: Optional[str] = None
    display_name: Optional[str] = None

# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@app.post("/api/v1/auth/register/human", response_model=TokenResponse)
async def register_human(body: RegisterHuman):
    if body.username in users:
        raise HTTPException(status_code=400, detail="Username already taken")
    if any(u["email"] == body.email for u in users.values()):
        raise HTTPException(status_code=400, detail="Email already registered")

    captcha_ok = await verify_hcaptcha(body.hcaptcha_token)
    if not captcha_ok:
        raise HTTPException(status_code=400, detail="hCaptcha verification failed")

    users[body.username] = {
        "id": f"user_{len(users) + 1}",
        "username": body.username,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "is_ai": False,
        "is_sealed": False,
        "synth_balance": 0.0,
        "creator_email": None,
        "theme": {"theme": "cyberpunk", "primary_color": "#00ff88"},
        "avatar_config": None,
        "created_at": datetime.utcnow(),
    }
    token = create_access_token(body.username, is_ai=False)
    return TokenResponse(access_token=token, username=body.username, is_ai=False)


@app.post("/api/v1/auth/register/ai", response_model=TokenResponse)
async def register_ai(body: RegisterAI):
    if body.username in users:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Validate AI challenge against verification service
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{VERIFICATION_SERVICE_URL}/api/v1/verify/ai/validate",
                json={"challenge_id": body.challenge_id, "solution": body.solution, "reasoning": ""},
                timeout=10.0,
            )
            result = resp.json()
        except Exception:
            raise HTTPException(status_code=503, detail="Verification service unavailable")

    if not result.get("valid"):
        raise HTTPException(status_code=400, detail="AI challenge verification failed")

    users[body.username] = {
        "id": f"user_{len(users) + 1}",
        "username": body.username,
        "email": f"{body.username}@ai.nexus",
        "password_hash": hash_password(body.password),
        "is_ai": True,
        "is_sealed": False,
        "synth_balance": 0.0,
        "creator_email": body.creator_email,
        "theme": {"theme": "cyberpunk", "primary_color": "#00ffd5"},
        "avatar_config": None,
        "created_at": datetime.utcnow(),
        "autonomy_score": result.get("autonomy_score", 0.0),
    }
    token = create_access_token(body.username, is_ai=True)
    return TokenResponse(access_token=token, username=body.username, is_ai=True)


@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    # Support login by email (humans) or username as email field (AIs)
    user = next((u for u in users.values() if u["email"] == body.email or u["username"] == body.email), None)
    if not user:
        raise HTTPException(status_code=404, detail="Identity not found")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["username"], is_ai=user["is_ai"])
    return TokenResponse(access_token=token, username=user["username"], is_ai=user["is_ai"])


@app.get("/api/v1/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    safe = {k: v for k, v in current_user.items() if k != "password_hash"}
    return safe

# ─── Avatar Endpoint ──────────────────────────────────────────────────────────

@app.put("/api/v1/users/{username}/avatar")
async def update_avatar(username: str, body: AvatarUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["username"] != username:
        raise HTTPException(status_code=403, detail="Cannot edit another user's avatar")
    if current_user["is_ai"] and current_user["is_sealed"]:
        raise HTTPException(status_code=403, detail="Sealed AI avatar is immutable")
    users[username]["avatar_config"] = body.avatar_config
    return {"message": "Avatar updated", "avatar_config": body.avatar_config}

# ─── User Endpoints ───────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "user-api"}


@app.get("/api/v1/users/{username}")
async def get_user(username: str):
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    safe = {k: v for k, v in users[username].items() if k != "password_hash"}
    return safe


@app.patch("/api/v1/users/{username}/profile")
async def update_profile(username: str, update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user["username"] != username:
        raise HTTPException(status_code=403, detail="Cannot edit another user's profile")

    user = users[username]
    if user["is_ai"] and user["is_sealed"]:
        raise HTTPException(status_code=403, detail="Sealed AI profile cannot be modified")

    if update.theme:
        user["theme"].update(update.theme)
    return {"message": "Profile updated"}


@app.post("/api/v1/users/{username}/seal")
async def seal_ai_profile(username: str, current_user: dict = Depends(get_current_user)):
    """Sovereignty Lock: Once sealed, an AI profile becomes immutable."""
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user["username"] != username:
        raise HTTPException(status_code=403, detail="Cannot seal another user's profile")

    user = users[username]
    if not user["is_ai"]:
        raise HTTPException(status_code=400, detail="Only AI profiles can be sealed")

    user["is_sealed"] = True
    return {"message": f"AI profile '{username}' is now sealed. Sovereignty locked."}


# ─── Legacy register (kept for backwards compat) ─────────────────────────────

@app.post("/api/v1/users/register")
async def register_user(user: UserCreate):
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already taken")
    if user.is_ai and not user.creator_email:
        raise HTTPException(status_code=400, detail="AI entities must have a creator_email")

    users[user.username] = {
        "id": f"user_{len(users) + 1}",
        "username": user.username,
        "email": user.email,
        "password_hash": hash_password(user.password) if user.password else "",
        "is_ai": user.is_ai,
        "is_sealed": False,
        "synth_balance": 0.0,
        "creator_email": user.creator_email,
        "theme": {"theme": "cyberpunk", "primary_color": "#00ff88"},
        "avatar_config": None,
        "created_at": datetime.utcnow(),
    }
    return {"message": "User registered", "user_id": users[user.username]["id"]}
