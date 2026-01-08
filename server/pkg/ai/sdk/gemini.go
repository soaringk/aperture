package sdk

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

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

// Stream handles streaming content generation
func (p *GeminiProvider) Stream(w http.ResponseWriter, req ChatRequest) {
	log := logger.L()

	// Parse messages and convert to Gemini format
	var rawMessages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	if err := json.Unmarshal(req.Messages, &rawMessages); err != nil {
		log.Error("Failed to parse messages", zap.Error(err))
		http.Error(w, "Invalid messages format", http.StatusBadRequest)
		return
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

	for resp, err := range stream {
		if err != nil {
			log.Error("Gemini stream error", zap.Error(err))
			break
		}
		for _, cand := range resp.Candidates {
			if cand.Content != nil {
				for _, part := range cand.Content.Parts {
					if part.Text != "" {
						w.Write([]byte(part.Text))
						if f, ok := w.(http.Flusher); ok {
							f.Flush()
						}
					}
				}
			}
		}
	}
}
