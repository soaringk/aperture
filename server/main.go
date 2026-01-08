package main

import (
	"encoding/json"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/soaringk/aperture/server/pkg/ai/sdk"
	"github.com/soaringk/aperture/server/pkg/logger"
	"go.uber.org/zap"
)

var provider sdk.Provider

func main() {
	// Load .env
	godotenv.Load()

	// Initialize logger
	logger.Init()
	defer logger.Sync()
	log := logger.L()

	// Initialize config
	InitConfig()

	log.Info("Configuration loaded",
		zap.String("provider", cfg.LLM.Provider),
		zap.String("model", cfg.LLM.Model),
		zap.String("port", cfg.Port),
	)

	if cfg.LLM.APIKey == "" {
		log.Fatal("LLM_API_KEY not set")
	}

	// Initialize provider once at startup (clients are concurrency-safe)
	var err error
	provider, err = sdk.NewProvider(cfg.LLM)
	if err != nil {
		log.Fatal("Failed to initialize provider", zap.Error(err))
	}
	log.Info("Provider initialized", zap.String("provider", cfg.LLM.Provider))

	mux := http.NewServeMux()
	mux.HandleFunc("/api/chat", handleChat)

	// CORS
	handler := cors.New(cors.Options{
		AllowedOrigins: cfg.CORSOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	}).Handler(mux)

	log.Info("Server starting", zap.String("port", cfg.Port))
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatal("Server failed to start", zap.Error(err))
	}
}

func handleChat(w http.ResponseWriter, r *http.Request) {
	log := logger.L()

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req sdk.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error("Failed to decode request", zap.Error(err))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Debug("Processing chat request",
		zap.String("provider", cfg.LLM.Provider),
		zap.String("model", cfg.LLM.Model),
	)

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Use pre-initialized provider (client reused, concurrency-safe)
	provider.Stream(w, req)
}
