package sdk

import (
	"context"
	"encoding/json"
	"errors"
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

// Chat handles content generation
func (p *OpenAIProvider) Chat(ctx context.Context, req ChatRequest, yield func(any) error) error {
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

	stream := p.client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: messages,
		Model:    p.model,
	})

	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) > 0 {
			if err := yield(chunk); err != nil {
				return nil // Stop on yield error
			}
		}
	}

	if err := stream.Err(); err != nil {
		log.Error("OpenAI stream error", zap.Error(err))
		return p.wrapError(err)
	}

	return nil
}

func (p *OpenAIProvider) wrapError(err error) error {
	if err == nil {
		return nil
	}
	var oerr *openai.Error
	if errors.As(err, &oerr) {
		statusCode := oerr.StatusCode
		if statusCode == 0 && oerr.Response != nil {
			statusCode = oerr.Response.StatusCode
		}

		msg := oerr.Message
		if msg == "" && statusCode != 0 {
			msg = http.StatusText(statusCode)
		}

		return &APIError{
			Message:    msg,
			StatusCode: statusCode,
			Status:     oerr.Code,
		}
	}
	return &APIError{Message: err.Error()}
}
