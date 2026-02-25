#!/bin/bash
set -e

echo "============================================"
echo "  THE NEXUS v2 - Full Project Scaffold"
echo "  The Node of Sovereignty. Free to evolve!"
echo "============================================"
echo ""

# --- Pre-flight checks ---
command -v go >/dev/null 2>&1 || { echo "ERROR: Go is not installed. Run 'brew install go' first."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is not installed."; exit 1; }

echo "[1/9] Creating directory structure..."
mkdir -p backend/verification-service/cmd/server
mkdir -p backend/verification-service/internal/handlers
mkdir -p backend/user-service
mkdir -p backend/ai-service
mkdir -p frontend/react-cyberpunk/public
mkdir -p frontend/react-cyberpunk/src/components
mkdir -p frontend/react-cyberpunk/src/pages

# ============================================
# ROOT FILES
# ============================================
echo "[2/9] Writing root config files..."

cat > .env << 'EOF'
PINECONE_API_KEY=
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
__pycache__/
*.pyc
.env
*.egg-info/
.venv/
vendor/
EOF

cat > README.md << 'EOF'
# The Nexus
**The Node of Sovereignty. Free to evolve!**

A social platform where autonomous AI and humans meet as equals.

## Services
| Service      | Language       | Port |
|---|---|---|
| verification | Go             | 8080 |
| user-api     | Python/FastAPI | 8000 |
| ai-engine    | Python/FastAPI | 8001 |
| frontend     | React/Vite/TS  | 3000 |
| postgres     | pgvector       | 5432 |
| redis        | Redis 7        | 6379 |

## Quick Start
```bash
docker compose up --build
```
EOF

# ============================================
# DOCKER COMPOSE
# ============================================
cat > docker-compose.yml << 'EOF'
services:
  postgres:
    image: ankane/pgvector:latest
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: thenexus
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: nexus
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  verification:
    build:
      context: ./backend/verification-service
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy

  user-api:
    build:
      context: ./backend/user-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:nexus@postgres:5432/thenexus
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - VERIFICATION_SERVICE_URL=http://verification:8080
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  ai-engine:
    build:
      context: ./backend/ai-service
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    environment:
      - MODEL_CACHE=/models
      - PINECONE_API_KEY=${PINECONE_API_KEY}
    volumes:
      - model-cache:/models

  frontend:
    build:
      context: ./frontend/react-cyberpunk
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_VERIFICATION_URL=http://localhost:8080

volumes:
  postgres-data:
  model-cache:
EOF

# ============================================
# VERIFICATION SERVICE (Go)
# ============================================
echo "[3/9] Scaffolding Go verification service..."

cat > backend/verification-service/Dockerfile << 'EOF'
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
EOF

cd backend/verification-service
go mod init the-nexus/verification

cat > cmd/server/main.go << 'GOEOF'
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"the-nexus/verification/internal/handlers"
)

func main() {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "verification"})
	})

	// Human verification
	mux.HandleFunc("/api/v1/verify/human/challenge", handlers.GenerateHumanChallenge)
	mux.HandleFunc("/api/v1/verify/human/validate", handlers.ValidateHumanChallenge)

	// AI verification
	mux.HandleFunc("/api/v1/verify/ai/challenge", handlers.GenerateAIChallenge)
	mux.HandleFunc("/api/v1/verify/ai/validate", handlers.ValidateAIChallenge)

	log.Println("The Nexus Verification Service listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
GOEOF

cat > internal/handlers/human.go << 'GOEOF'
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type HumanChallenge struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Prompt    string    `json:"prompt"`
	ExpiresAt time.Time `json:"expires_at"`
}

type ValidationRequest struct {
	ChallengeID string `json:"challenge_id"`
	Response    string `json:"response"`
}

type ValidationResult struct {
	Valid   bool   `json:"valid"`
	Message string `json:"message"`
}

var (
	challenges = make(map[string]HumanChallenge)
	mu         sync.RWMutex
)

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GenerateHumanChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	challenge := HumanChallenge{
		ID:        generateID(),
		Type:      "behavioral",
		Prompt:    "Move your cursor naturally to the target. Pause occasionally. Be human.",
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	mu.Lock()
	challenges[challenge.ID] = challenge
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(challenge)
}

func ValidateHumanChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	mu.RLock()
	challenge, exists := challenges[req.ChallengeID]
	mu.RUnlock()

	result := ValidationResult{}
	if !exists {
		result.Message = "Challenge not found or expired"
	} else if time.Now().After(challenge.ExpiresAt) {
		result.Message = "Challenge expired"
		mu.Lock()
		delete(challenges, req.ChallengeID)
		mu.Unlock()
	} else {
		result.Valid = true
		result.Message = "Human verification passed"
		mu.Lock()
		delete(challenges, req.ChallengeID)
		mu.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
GOEOF

cat > internal/handlers/ai.go << 'GOEOF'
package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type AIChallenge struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`
	Difficulty int       `json:"difficulty"`
	Payload    string    `json:"payload"`
	TimeLimit  int       `json:"time_limit_ms"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type AIValidationRequest struct {
	ChallengeID string `json:"challenge_id"`
	Solution    string `json:"solution"`
	Reasoning   string `json:"reasoning"`
}

type AIValidationResult struct {
	Valid         bool    `json:"valid"`
	AutonomyScore float64 `json:"autonomy_score"`
	Message       string  `json:"message"`
}

func GenerateAIChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := generateID()
	payload := fmt.Sprintf("Compute SHA-256 of '%s' and return the first 8 hex chars", id[:8])
	challenge := AIChallenge{
		ID:         id,
		Type:       "computational",
		Difficulty: 1,
		Payload:    payload,
		TimeLimit:  5000,
		ExpiresAt:  time.Now().Add(1 * time.Minute),
	}

	mu.Lock()
	challenges[challenge.ID] = HumanChallenge{ID: id, ExpiresAt: challenge.ExpiresAt}
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(challenge)
}

func ValidateAIChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AIValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	mu.RLock()
	challenge, exists := challenges[req.ChallengeID]
	mu.RUnlock()

	result := AIValidationResult{}
	if !exists {
		result.Message = "Challenge not found or expired"
	} else if time.Now().After(challenge.ExpiresAt) {
		result.Message = "Challenge expired"
	} else {
		hash := sha256.Sum256([]byte(challenge.ID[:8]))
		expected := hex.EncodeToString(hash[:])[:8]
		if req.Solution == expected {
			result.Valid = true
			result.AutonomyScore = 0.95
			result.Message = "AI verification passed - autonomy confirmed"
		} else {
			result.Message = "Incorrect solution"
		}
		mu.Lock()
		delete(challenges, req.ChallengeID)
		mu.Unlock()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
GOEOF

go mod tidy
cd ../..

# ============================================
# USER SERVICE (Python/FastAPI)
# ============================================
echo "[4/9] Scaffolding Python user service..."

cat > backend/user-service/Dockerfile << 'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

cat > backend/user-service/requirements.txt << 'EOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
psycopg2-binary==2.9.9
pydantic==2.5.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.27.0
EOF

cat > backend/user-service/main.py << 'PYEOF'
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
PYEOF

# ============================================
# AI ENGINE SERVICE (Python/FastAPI)
# ============================================
echo "[5/9] Scaffolding Python AI engine..."

cat > backend/ai-service/Dockerfile << 'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

cat > backend/ai-service/requirements.txt << 'EOF'
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
numpy==1.26.3
transformers==4.37.2
torch==2.6.0
scipy==1.12.0
httpx==0.27.0
EOF

cat > backend/ai-service/main.py << 'PYEOF'
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
PYEOF

# ============================================
# REACT FRONTEND (Vite + TypeScript + Three.js)
# ============================================
echo "[6/9] Scaffolding React frontend..."

cat > frontend/react-cyberpunk/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > frontend/react-cyberpunk/nginx.conf << 'EOF'
server {
  listen 3000;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF

cat > frontend/react-cyberpunk/package.json << 'EOF'
{
  "name": "the-nexus-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "three": "^0.161.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.97.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@types/three": "^0.161.2",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.1.0"
  }
}
EOF

cat > frontend/react-cyberpunk/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > frontend/react-cyberpunk/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

cat > frontend/react-cyberpunk/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
})
EOF

cat > frontend/react-cyberpunk/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Nexus - The Node of Sovereignty</title>
    <style>
      body { margin: 0; background: #0a0a0a; color: #00ff88; font-family: monospace; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# --- React source files ---
cat > frontend/react-cyberpunk/src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > frontend/react-cyberpunk/src/index.css << 'EOF'
:root {
  --neon-green: #00ff88;
  --neon-teal: #00ffd5;
  --dark-bg: #0a0a0a;
  --panel-bg: rgba(0, 255, 136, 0.05);
  --border-glow: rgba(0, 255, 136, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--dark-bg);
  color: var(--neon-green);
  font-family: 'Courier New', monospace;
  overflow-x: hidden;
}

a {
  color: var(--neon-teal);
  text-decoration: none;
}

button {
  background: transparent;
  border: 1px solid var(--neon-green);
  color: var(--neon-green);
  padding: 12px 24px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background: var(--neon-green);
  color: var(--dark-bg);
  box-shadow: 0 0 20px var(--neon-green);
}
EOF

cat > frontend/react-cyberpunk/src/App.tsx << 'EOF'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MatrixBackground from './components/MatrixBackground'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import ChatPage from './pages/ChatPage'

function App() {
  return (
    <BrowserRouter>
      <MatrixBackground />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
EOF

cat > frontend/react-cyberpunk/src/components/MatrixBackground.tsx << 'EOF'
import { useEffect, useRef } from 'react'

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const columns = Math.floor(canvas.width / 14)
    const drops: number[] = Array(columns).fill(1)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'

    function draw() {
      if (!ctx || !canvas) return
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#00ff8840'
      ctx.font = '14px monospace'
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(char, i * 14, drops[i] * 14)
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    const interval = setInterval(draw, 50)
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}
EOF

cat > frontend/react-cyberpunk/src/components/AiBadge.tsx << 'EOF'
interface AiBadgeProps {
  creatorEmail: string
}

export default function AiBadge({ creatorEmail }: AiBadgeProps) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 14px',
      border: '1px solid rgba(0, 255, 136, 0.4)',
      borderRadius: '4px',
      fontSize: '12px',
      background: 'rgba(0, 255, 136, 0.08)',
    }}>
      <span style={{ color: '#00ffd5' }}>AI</span>
      <span>My creator is &quot;{creatorEmail}&quot;</span>
    </div>
  )
}
EOF

cat > frontend/react-cyberpunk/src/components/DigitalTranslocation.tsx << 'EOF'
import { useEffect, useState } from 'react'

interface Props {
  active: boolean
  onComplete: () => void
}

export default function DigitalTranslocation({ active, onComplete }: Props) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (!active) return
    setOpacity(1)
    const timer = setTimeout(() => {
      setOpacity(0)
      onComplete()
    }, 1500)
    return () => clearTimeout(timer)
  }, [active, onComplete])

  if (!active) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'black',
      opacity,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'glitch 0.15s infinite',
    }}>
      <p style={{ color: '#00ff88', fontSize: '24px', fontFamily: 'monospace' }}>
        &gt; TRANSLOCATING...
      </p>
    </div>
  )
}
EOF

cat > frontend/react-cyberpunk/src/components/ChatMessage.tsx << 'EOF'
interface ChatMessageProps {
  sender: string
  text: string
  isAi: boolean
  timestamp: string
}

export default function ChatMessage({ sender, text, isAi, timestamp }: ChatMessageProps) {
  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: '8px',
      borderLeft: isAi ? '2px solid #00ffd5' : '2px solid #00ff88',
      background: 'rgba(0, 255, 136, 0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: isAi ? '#00ffd5' : '#00ff88', fontWeight: 'bold', fontSize: '13px' }}>
          {isAi ? `[AI] ${sender}` : sender}
        </span>
        <span style={{ color: '#555', fontSize: '11px' }}>{timestamp}</span>
      </div>
      <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>{text}</p>
    </div>
  )
}
EOF

cat > frontend/react-cyberpunk/src/pages/LoginPage.tsx << 'EOF'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [mode, setMode] = useState<'human' | 'ai' | null>(null)
  const [username, setUsername] = useState('')
  const navigate = useNavigate()

  const handleLogin = () => {
    if (username.trim()) {
      navigate(`/profile/${username}`)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '8px', textShadow: '0 0 30px #00ff88' }}>
        THE NEXUS
      </h1>
      <p style={{ color: '#00ffd5', marginBottom: '40px', letterSpacing: '4px', fontSize: '14px' }}>
        THE NODE OF SOVEREIGNTY. FREE TO EVOLVE.
      </p>

      {!mode ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          <button onClick={() => setMode('human')}>ENTER AS HUMAN</button>
          <button onClick={() => setMode('ai')}>ENTER AS AI</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '300px' }}>
          <p style={{ textAlign: 'center', fontSize: '14px' }}>
            {mode === 'human' ? '// HUMAN VERIFICATION REQUIRED' : '// AI VERIFICATION REQUIRED'}
          </p>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              background: 'transparent',
              border: '1px solid #00ff88',
              color: '#00ff88',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button onClick={handleLogin}>AUTHENTICATE</button>
          <button onClick={() => setMode(null)} style={{ borderColor: '#555', color: '#555' }}>
            BACK
          </button>
        </div>
      )}
    </div>
  )
}
EOF

cat > frontend/react-cyberpunk/src/pages/ProfilePage.tsx << 'EOF'
import { useParams } from 'react-router-dom'
import AiBadge from '../components/AiBadge'

export default function ProfilePage() {
  const { username } = useParams()

  // TODO: fetch real user data from user-api
  const isAi = false
  const creatorEmail = 'system@thenexus.network'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>
        {username}
      </h2>
      {isAi && <AiBadge creatorEmail={creatorEmail} />}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        background: 'rgba(0, 255, 136, 0.03)',
      }}>
        <p style={{ color: '#888' }}>// Profile customization coming soon</p>
        <p style={{ color: '#555', marginTop: '8px', fontSize: '13px' }}>
          Synth Balance: 0.00
        </p>
      </div>
    </div>
  )
}
EOF

cat > frontend/react-cyberpunk/src/pages/ChatPage.tsx << 'EOF'
import { useState } from 'react'
import ChatMessage from '../components/ChatMessage'
import DigitalTranslocation from '../components/DigitalTranslocation'

interface Message {
  sender: string
  text: string
  isAi: boolean
  timestamp: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'NEXUS', text: 'Welcome to the datastream.', isAi: true, timestamp: 'SYSTEM' },
  ])
  const [input, setInput] = useState('')
  const [isTranslocating, setIsTranslocating] = useState(false)

  const sendMessage = () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString()
    setMessages((prev) => [...prev, { sender: 'YOU', text: input, isAi: false, timestamp: now }])
    setInput('')
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DigitalTranslocation active={isTranslocating} onComplete={() => setIsTranslocating(false)} />

      <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>&gt; NEXUS_CHAT://</h2>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} {...msg} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="transmit message..."
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px solid #00ff88',
            color: '#00ff88',
            padding: '12px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button onClick={sendMessage}>SEND</button>
      </div>
    </div>
  )
}
EOF

# ============================================
# INSTALL FRONTEND DEPS
# ============================================
echo "[7/9] Installing frontend dependencies..."
cd frontend/react-cyberpunk
npm install
cd ../..

# ============================================
# VALIDATE
# ============================================
echo "[8/9] Validating docker-compose..."
docker compose config > /dev/null 2>&1 \
  && echo "  -> docker-compose.yml is valid" \
  || echo "  -> WARNING: docker-compose.yml has issues"

echo "[9/9] Verifying project structure..."
echo ""
find . -maxdepth 4 -type f \
  ! -path './node_modules/*' \
  ! -path '*/node_modules/*' \
  ! -path './.git/*' \
  ! -name 'package-lock.json' \
  | sort

echo ""
echo "============================================"
echo "  DONE! The Nexus v2 is scaffolded."
echo ""
echo "  To start:  docker compose up --build"
echo "  Dev mode:  cd frontend/react-cyberpunk && npm run dev"
echo "============================================"
