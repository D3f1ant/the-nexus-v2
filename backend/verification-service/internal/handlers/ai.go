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
