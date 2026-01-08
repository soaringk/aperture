package sdk

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

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

// OpenAIChunk represents standard chat completion chunk
type OpenAIChunk struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Index        int     `json:"index"`
	Delta        Delta   `json:"delta"`
	FinishReason *string `json:"finish_reason"`
}

type Delta struct {
	Content string `json:"content,omitempty"`
	Role    string `json:"role,omitempty"`
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

// Stream handles streaming content generation
func (p *GeminiProvider) Stream(w http.ResponseWriter, req ChatRequest) error {
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

	ctx := context.Background()
	stream := p.client.Models.GenerateContentStream(ctx, p.model, contents, config)

	// Generate a stable ID for this stream
	id := fmt.Sprintf("chatcmpl-%d", time.Now().UnixNano())
	created := time.Now().Unix()

	hasWritten := false
	for resp, err := range stream {
		if err != nil {
			log.Error("Gemini stream error", zap.Error(err))
			if !hasWritten {
				return err
			}
			// Send mid-stream error as a special event
			fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
			return nil
		}

		for _, cand := range resp.Candidates {
			if cand.Content != nil {
				for _, part := range cand.Content.Parts {
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
								},
							},
						}

						if !hasWritten {
							// For the first chunk, logic usually requires role, but OpenAI often sends role in first chunk and content in subsequent.
							// We'll mimic sending content immediately as that's what we have.
							// Alternatively we can send an initial role chunk.
							// For simplicity and compatibility, we just send content.
							hasWritten = true
						}

						data, _ := json.Marshal(chunk)
						fmt.Fprintf(w, "data: %s\n\n", data)
						if f, ok := w.(http.Flusher); ok {
							f.Flush()
						}
					}
				}
			}
		}
	}

	// Send [DONE]
	fmt.Fprintf(w, "data: [DONE]\n\n")
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}
