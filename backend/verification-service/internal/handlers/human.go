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
