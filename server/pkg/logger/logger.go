package logger

import (
	"os"
	"sync"

	"go.uber.org/zap"
)

var (
	log  *zap.Logger
	once sync.Once
)

// Init initializes the global logger. Should be called once at startup.
func Init() {
	once.Do(func() {
		var err error
		if os.Getenv("GO_ENV") == "production" {
			log, err = zap.NewProduction()
		} else {
			log, err = zap.NewDevelopment()
		}
		if err != nil {
			panic("Failed to initialize logger: " + err.Error())
		}
	})
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
