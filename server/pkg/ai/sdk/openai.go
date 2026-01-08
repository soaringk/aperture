package sdk

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
	"github.com/soaringk/aperture/server/pkg/logger"
	"go.uber.org/zap"
)

// OpenAIProvider holds the reusable OpenAI client and config
type OpenAIProvider struct {
	client *openai.Client
	model  string
}

// NewOpenAIProvider creates an OpenAI provider with initialized client
func NewOpenAIProvider(cfg Config) (*OpenAIProvider, error) {
	opts := []option.RequestOption{option.WithAPIKey(cfg.APIKey)}
	if cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(cfg.BaseURL))
	}
	client := openai.NewClient(opts...)

	return &OpenAIProvider{
		client: &client,
		model:  cfg.Model,
	}, nil
}

// Stream handles streaming chat completion
func (p *OpenAIProvider) Stream(w http.ResponseWriter, req ChatRequest) error {
	log := logger.L()

	// Parse messages
	var messages []openai.ChatCompletionMessageParamUnion
	var rawMessages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(req.Messages, &rawMessages); err != nil {
		log.Error("Failed to parse messages", zap.Error(err))
		return err
	}

	for _, m := range rawMessages {
		switch m.Role {
		case "system":
			messages = append(messages, openai.SystemMessage(m.Content))
		case "user":
			messages = append(messages, openai.UserMessage(m.Content))
		case "assistant":
			messages = append(messages, openai.AssistantMessage(m.Content))
		}
	}

	log.Debug("Sending request to OpenAI",
		zap.String("model", p.model),
		zap.Int("message_count", len(messages)),
	)

	ctx := context.Background()
	stream := p.client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: messages,
		Model:    p.model,
	})

	hasWritten := false
	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) > 0 {
			content := chunk.Choices[0].Delta.Content
			if content != "" {
				hasWritten = true
				fmt.Fprintf(w, "data: %s\n\n", content)
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}
			}
		}
	}

	if err := stream.Err(); err != nil {
		log.Error("OpenAI stream error", zap.Error(err))
		if !hasWritten {
			return err
		}
		// Send mid-stream error to client
		fmt.Fprintf(w, "error: %s\n\n", err.Error())
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
	}
	return nil
}
