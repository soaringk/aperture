package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/soaringk/aperture/server/pkg/ai/sdk"
	"github.com/soaringk/aperture/server/pkg/logger"
	"go.jetify.com/sse"
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
		zap.Bool("stream", req.Stream),
	)

	// Routing based on stream parameter
	if req.Stream {
		handleStreamChat(w, r, req)
	} else {
		handleNonStreamChat(w, r, req)
	}
}

func handleStreamChat(w http.ResponseWriter, r *http.Request, req sdk.ChatRequest) {
	log := logger.L()

	// Centralized SSE handling
	var conn *sse.Conn
	upgraded := false

	// Define yield callback for streaming
	yield := func(chunk any) error {
		if !upgraded {
			// First chunk received: Upgrade connection now
			var err error
			conn, err = sse.Upgrade(r.Context(), w)
			if err != nil {
				log.Error("Failed to upgrade to SSE", zap.Error(err))
				return err
			}
			upgraded = true
		}

		// Send chunk via SSE
		return conn.SendEvent(r.Context(), &sse.Event{
			Data: chunk,
		})
	}

	// Call provider
	err := provider.Chat(r.Context(), req, yield)
	if err != nil {
		log.Error("Chat failed", zap.Error(err))
		if !upgraded {
			sendJSONError(w, err)
			return
		}
		if conn != nil {
			_ = conn.SendEvent(r.Context(), &sse.Event{
				Event: "error",
				Data:  err.Error(),
			})
		}
		return
	}

	if upgraded && conn != nil {
		_ = conn.SendEvent(r.Context(), &sse.Event{
			Data: "[DONE]",
		})
	}
}

func handleNonStreamChat(w http.ResponseWriter, r *http.Request, req sdk.ChatRequest) {
	log := logger.L()

	var collectedContent string
	var collectedReasoningContent string
	var collectedRole string
	var finishReason *string
	var firstChunk *sdk.OpenAIChunk
	var lastUsage *sdk.Usage
	var toolCalls []sdk.ToolCall
	toolCallsMap := make(map[int]*sdk.ToolCall) // Track tool calls by index

	// Define yield callback for accumulation
	yield := func(chunk any) error {
		// Check for client disconnect
		select {
		case <-r.Context().Done():
			log.Debug("Non-stream: client disconnected, exiting early")
			return r.Context().Err()
		default:
		}

		c, ok := chunk.(sdk.OpenAIChunk)
		if !ok {
			return nil
		}
		if firstChunk == nil {
			firstChunk = &c
		}
		// Capture usage from final chunk
		if c.Usage != nil {
			lastUsage = c.Usage
		}
		if len(c.Choices) > 0 {
			choice := c.Choices[0]
			// Accumulate content
			collectedContent += choice.Delta.Content
			// Accumulate reasoning content
			collectedReasoningContent += choice.Delta.ReasoningContent
			// Capture role
			if choice.Delta.Role != "" {
				collectedRole = choice.Delta.Role
			}
			// Capture finish_reason (last one wins)
			if choice.FinishReason != nil {
				finishReason = choice.FinishReason
			}
			// Accumulate tool calls
			for _, tc := range choice.Delta.ToolCalls {
				existing, ok := toolCallsMap[tc.Index]
				if !ok {
					newTC := sdk.ToolCall{
						Index: tc.Index,
						ID:    tc.ID,
						Type:  tc.Type,
						Function: sdk.FunctionCall{
							Name:      tc.Function.Name,
							Arguments: tc.Function.Arguments,
						},
					}
					toolCallsMap[tc.Index] = &newTC
				} else {
					// Accumulate function arguments
					if tc.ID != "" {
						existing.ID = tc.ID
					}
					if tc.Type != "" {
						existing.Type = tc.Type
					}
					if tc.Function.Name != "" {
						existing.Function.Name = tc.Function.Name
					}
					existing.Function.Arguments += tc.Function.Arguments
				}
			}
		}
		return nil
	}

	// Call provider
	err := provider.Chat(r.Context(), req, yield)
	if err != nil {
		log.Error("Chat failed", zap.Error(err))
		sendJSONError(w, err)
		return
	}

	// Convert tool calls map to slice
	for _, tc := range toolCallsMap {
		toolCalls = append(toolCalls, *tc)
	}

	// Handle nil firstChunk
	if firstChunk == nil {
		sendJSONError(w, fmt.Errorf("no response from provider"))
		return
	}

	// Default finish_reason
	fr := "stop"
	if finishReason != nil {
		fr = *finishReason
	}

	// Default role
	if collectedRole == "" {
		collectedRole = "assistant"
	}

	// Build message object
	message := map[string]any{
		"role":    collectedRole,
		"content": collectedContent,
	}
	if collectedReasoningContent != "" {
		message["reasoning_content"] = collectedReasoningContent
	}
	if len(toolCalls) > 0 {
		message["tool_calls"] = toolCalls
	}

	// Construct full response
	resp := map[string]any{
		"id":      firstChunk.ID,
		"object":  "chat.completion",
		"created": firstChunk.Created,
		"model":   firstChunk.Model,
		"choices": []map[string]any{
			{
				"index":         0,
				"message":       message,
				"finish_reason": fr,
			},
		},
	}

	// Add usage if available
	if lastUsage != nil {
		resp["usage"] = lastUsage
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func sendJSONError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")

	statusCode := http.StatusInternalServerError
	var aerr *sdk.APIError
	if errors.As(err, &aerr) && aerr.StatusCode != 0 {
		statusCode = aerr.StatusCode
	}

	var errorCode = "server_error"
	if errors.As(err, &aerr) && aerr.Status != "" {
		errorCode = aerr.Status
	}

	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]any{
			"message": err.Error(),
			"type":    errorCode,
		},
	})
}
