package sdk

import (
	"encoding/json"
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

// Provider interface for LLM providers
type Provider interface {
	Stream(w http.ResponseWriter, req ChatRequest)
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
