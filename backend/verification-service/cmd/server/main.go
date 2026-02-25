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
