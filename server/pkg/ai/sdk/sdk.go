package sdk

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// Config holds LLM provider configuration
type Config struct {
	Provider string
	Model    string
	APIKey   string
	BaseURL  string
}

// ChatRequest is the unified request format from frontend
type ChatRequest struct {
	Messages     json.RawMessage `json:"messages"`
	SystemPrompt string          `json:"systemPrompt"`
}

// APIError represents a unified error from LLM providers
type APIError struct {
	Message    string
	StatusCode int
	Code       string // String identifier (e.g., "invalid_api_key")
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	if e.StatusCode != 0 {
		return fmt.Sprintf("API Error (Status %d)", e.StatusCode)
	}
	return "Unknown Error"
}

// Provider interface for LLM providers
type Provider interface {
	Stream(w http.ResponseWriter, req ChatRequest) error
}

// NewProvider creates and initializes the appropriate provider based on config
func NewProvider(cfg Config) (Provider, error) {
	switch cfg.Provider {
	case "openai":
		return NewOpenAIProvider(cfg)
	default:
		return NewGeminiProvider(cfg)
	}
}
