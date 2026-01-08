package main

import (
	"os"
	"strings"

	"github.com/soaringk/aperture/server/pkg/ai/sdk"
)

// Config holds all server configuration
type Config struct {
	Port        string
	CORSOrigins []string
	LLM         sdk.Config
}

var cfg Config

// InitConfig loads configuration from environment variables
func InitConfig() {
	// Parse CORS origins
	corsOrigins := []string{"*"}
	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		corsOrigins = strings.Split(origins, ",")
	}

	cfg = Config{
		Port:        getEnv("PORT", "3000"),
		CORSOrigins: corsOrigins,
		LLM: sdk.Config{
			Provider: getEnv("LLM_PROVIDER", "gemini"),
			Model:    getEnv("LLM_MODEL", "gemini-2.0-flash"),
			APIKey:   os.Getenv("LLM_API_KEY"),
			BaseURL:  os.Getenv("LLM_BASE_URL"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
