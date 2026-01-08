package logger

import (
	"os"
	"strings"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	log  *zap.Logger
	once sync.Once
)

// Init initializes the global logger. Should be called once at startup.
func Init() {
	once.Do(func() {
		// Parse log level from env (default: info for prod, debug for dev)
		level := parseLogLevel(os.Getenv("LOG_LEVEL"))

		var config zap.Config
		if os.Getenv("GO_ENV") == "production" {
			config = zap.NewProductionConfig()
		} else {
			config = zap.NewDevelopmentConfig()
		}
		config.Level = zap.NewAtomicLevelAt(level)

		var err error
		log, err = config.Build()
		if err != nil {
			panic("Failed to initialize logger: " + err.Error())
		}
		log.Info("Logger initialized", zap.String("level", level.String()))
	})
}

// parseLogLevel converts string level to zapcore.Level
func parseLogLevel(levelStr string) zapcore.Level {
	switch strings.ToLower(levelStr) {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn", "warning":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	case "fatal":
		return zapcore.FatalLevel
	default:
		// Default based on environment
		if os.Getenv("GO_ENV") == "production" {
			return zapcore.InfoLevel
		}
		return zapcore.DebugLevel
	}
}

// L returns the global logger instance
func L() *zap.Logger {
	if log == nil {
		Init()
	}
	return log
}

// Sync flushes any buffered log entries
func Sync() {
	if log != nil {
		log.Sync()
	}
}
