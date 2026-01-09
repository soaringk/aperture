package sdk

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"time"

	"github.com/soaringk/aperture/server/pkg/logger"
	"go.uber.org/zap"
	"google.golang.org/genai"
)

// GeminiProvider holds the reusable Gemini client and config
type GeminiProvider struct {
	client *genai.Client
	model  string
}

// NewGeminiProvider creates a Gemini provider with initialized client
func NewGeminiProvider(cfg Config) (*GeminiProvider, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  cfg.APIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	return &GeminiProvider{
		client: client,
		model:  cfg.Model,
	}, nil
}

// Chat handles content generation
func (p *GeminiProvider) Chat(ctx context.Context, req ChatRequest, yield func(any) error) error {
	log := logger.L()

	// Parse messages and convert to Gemini format
	var rawMessages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(req.Messages, &rawMessages); err != nil {
		log.Error("Failed to parse messages", zap.Error(err))
		return fmt.Errorf("invalid messages format: %w", err)
	}

	var contents []*genai.Content
	for _, m := range rawMessages {
		if m.Role == "system" {
			continue // System prompt handled separately
		}
		role := m.Role
		if role == "assistant" {
			role = "model"
		}
		contents = append(contents, &genai.Content{
			Role:  role,
			Parts: []*genai.Part{genai.NewPartFromText(m.Content)},
		})
	}

	config := &genai.GenerateContentConfig{}
	if req.SystemPrompt != "" {
		config.SystemInstruction = &genai.Content{
			Parts: []*genai.Part{genai.NewPartFromText(req.SystemPrompt)},
		}
	}

	log.Debug("Sending request to Gemini",
		zap.String("model", p.model),
		zap.Int("content_count", len(contents)),
	)

	stream := p.client.Models.GenerateContentStream(ctx, p.model, contents, config)

	// Generate a stable ID for this stream
	id := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	created := time.Now().Unix()
	isFirstChunk := true
	toolCallIndex := 0

	for resp, err := range stream {
		if err != nil {
			log.Error("Gemini stream error", zap.Error(err))
			return p.wrapError(err)
		}

		// Send usage from final response
		var usage *Usage
		if resp.UsageMetadata != nil {
			usage = &Usage{
				PromptTokens:     int(resp.UsageMetadata.PromptTokenCount),
				CompletionTokens: int(resp.UsageMetadata.CandidatesTokenCount),
				TotalTokens:      int(resp.UsageMetadata.TotalTokenCount),
			}
		}

		for _, cand := range resp.Candidates {
			// Map finish reason
			var finishReason *string
			if cand.FinishReason != "" {
				fr := mapGeminiFinishReason(cand.FinishReason)
				finishReason = &fr
			}

			if cand.Content != nil {
				for _, part := range cand.Content.Parts {
					// Handle text content
					if part.Text != "" {
						chunk := OpenAIChunk{
							ID:      id,
							Object:  "chat.completion.chunk",
							Created: created,
							Model:   p.model,
							Choices: []Choice{
								{
									Index: 0,
									Delta: Delta{
										Content: part.Text,
									},
									FinishReason: finishReason,
								},
							},
							Usage: usage,
						}
						// Set role on first chunk
						if isFirstChunk {
							chunk.Choices[0].Delta.Role = "assistant"
							isFirstChunk = false
						}
						if err := yield(chunk); err != nil {
							return nil
						}
					}

					// Handle function calls
					if part.FunctionCall != nil {
						argsJSON, _ := json.Marshal(part.FunctionCall.Args)
						chunk := OpenAIChunk{
							ID:      id,
							Object:  "chat.completion.chunk",
							Created: created,
							Model:   p.model,
							Choices: []Choice{
								{
									Index: 0,
									Delta: Delta{
										ToolCalls: []ToolCall{
											{
												Index: toolCallIndex,
												ID:    fmt.Sprintf("call_%d", toolCallIndex),
												Type:  "function",
												Function: FunctionCall{
													Name:      part.FunctionCall.Name,
													Arguments: string(argsJSON),
												},
											},
										},
									},
									FinishReason: finishReason,
								},
							},
							Usage: usage,
						}
						if isFirstChunk {
							chunk.Choices[0].Delta.Role = "assistant"
							isFirstChunk = false
						}
						if err := yield(chunk); err != nil {
							return nil
						}
						toolCallIndex++
					}

					// Note: Gemini's part.Thought is a bool flag, not content.
					// Reasoning content is not exposed in the current SDK version.
				}
			}
		}
	}

	return nil
}

// mapGeminiFinishReason converts Gemini finish reasons to OpenAI format
func mapGeminiFinishReason(reason genai.FinishReason) string {
	switch reason {
	case genai.FinishReasonStop:
		return "stop"
	case genai.FinishReasonMaxTokens:
		return "length"
	case genai.FinishReasonSafety, genai.FinishReasonRecitation, genai.FinishReasonBlocklist:
		return "content_filter"
	case genai.FinishReasonOther:
		return "stop"
	default:
		return "stop"
	}
}

func (p *GeminiProvider) wrapError(err error) error {
	if err == nil {
		return nil
	}
	var gerr genai.APIError
	if errors.As(err, &gerr) {
		return &APIError{
			Message:    gerr.Message,
			StatusCode: gerr.Code,
			Status:     gerr.Status,
		}
	}
	return &APIError{Message: err.Error()}
}
