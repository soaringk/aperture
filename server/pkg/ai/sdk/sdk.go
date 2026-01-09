package sdk

import (
	"context"
	"encoding/json"
	"fmt"
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
	Stream       bool            `json:"stream,omitempty"` // Default to true if omitted usually, logic in main
}

// OpenAIChunk represents standard chat completion chunk
type OpenAIChunk struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   *Usage   `json:"usage,omitempty"` // Only present in final chunk if requested
}

type Choice struct {
	Index        int     `json:"index"`
	Delta        Delta   `json:"delta"`
	FinishReason *string `json:"finish_reason"`
}

type Delta struct {
	Role             string     `json:"role,omitempty"`
	Content          string     `json:"content,omitempty"`
	ReasoningContent string     `json:"reasoning_content,omitempty"`
	ToolCalls        []ToolCall `json:"tool_calls,omitempty"`
}

type ToolCall struct {
	Index    int          `json:"index"`
	ID       string       `json:"id,omitempty"`
	Type     string       `json:"type,omitempty"`
	Function FunctionCall `json:"function,omitempty"`
}

type FunctionCall struct {
	Name      string `json:"name,omitempty"`
	Arguments string `json:"arguments,omitempty"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// APIError represents a unified error from LLM providers
type APIError struct {
	Message    string
	StatusCode int
	Status     string // String identifier (e.g., "invalid_api_key")
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
	Chat(ctx context.Context, req ChatRequest, yield func(any) error) error
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
