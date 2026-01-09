package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

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

	// We set headers only if we are successful, or let it fall through to http.Error
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Use pre-initialized provider
	if err := provider.Stream(w, req); err != nil {
		log.Error("Stream failed (initial)", zap.Error(err))

		w.Header().Set("Content-Type", "application/json")

		// Map error to status code
		statusCode := http.StatusInternalServerError

		var aerr *sdk.APIError
		if errors.As(err, &aerr) && aerr.StatusCode != 0 {
			statusCode = aerr.StatusCode
		} else {
			// Fallback to heuristic mapping if not a typed APIError
			errMsg := err.Error()
			switch {
			case strings.Contains(errMsg, "429") || strings.Contains(errMsg, "quota") || strings.Contains(errMsg, "resource exhausted"):
				statusCode = http.StatusTooManyRequests
			case strings.Contains(errMsg, "401") || strings.Contains(errMsg, "unauthenticated") || strings.Contains(errMsg, "invalid api key") || strings.Contains(errMsg, "API key not valid"):
				statusCode = http.StatusUnauthorized
			case strings.Contains(errMsg, "403") || strings.Contains(errMsg, "permission denied"):
				statusCode = http.StatusForbidden
			case strings.Contains(errMsg, "400") || strings.Contains(errMsg, "invalid argument"):
				statusCode = http.StatusBadRequest
			}
		}

		w.WriteHeader(statusCode)

		// Determine 'code' for JSON body (prefer string identifier, fallback to status)
		var errorCode string
		if errors.As(err, &aerr) {
			errorCode = aerr.Code
		}

		errMsg := err.Error()

		// Send JSON error response matching OpenAI error format
		jsonError := map[string]interface{}{
			"error": map[string]interface{}{
				"message": errMsg,
				"type":    "server_error",
				"code":    errorCode,
			},
		}
		json.NewEncoder(w).Encode(jsonError)
	}
}
