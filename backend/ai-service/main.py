import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="The Nexus - AI Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_CACHE = os.getenv("MODEL_CACHE", "/models")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")


class PersonalityRequest(BaseModel):
    name: str
    traits: list[str]
    backstory: Optional[str] = None
    communication_style: Optional[str] = None


class PersonalityResponse(BaseModel):
    personality_id: str
    name: str
    embedding_stored: bool
    traits: list[str]


# In-memory personality store (replace with Pinecone in production)
personalities: dict = {}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-engine"}


@app.post("/api/v1/personality/generate", response_model=PersonalityResponse)
async def generate_personality(request: PersonalityRequest):
    """Generate an AI personality profile with trait embeddings."""
    personality_id = f"personality_{len(personalities) + 1}"

    personality = {
        "id": personality_id,
        "name": request.name,
        "traits": request.traits,
        "backstory": request.backstory,
        "communication_style": request.communication_style or "neutral",
        "embedding_stored": False,  # Will be True once Pinecone is configured
    }

    personalities[personality_id] = personality
    return PersonalityResponse(
        personality_id=personality_id,
        name=request.name,
        embedding_stored=personality["embedding_stored"],
        traits=request.traits,
    )


@app.get("/api/v1/personality/{personality_id}")
async def get_personality(personality_id: str):
    if personality_id not in personalities:
        raise HTTPException(status_code=404, detail="Personality not found")
    return personalities[personality_id]
