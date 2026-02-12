package config

import (
	"os"
	"sync"

	"github.com/joho/godotenv"
)

var (
	configInstance *Config
	configOnce     sync.Once
)

func parseEnv() error {
	paths := []string{".env", "backend/.env"}
	var lastErr error
	for _, path := range paths {
		if err := godotenv.Overload(path); err == nil {
			return nil
		} else {
			lastErr = err
		}
	}

	return lastErr
}

func loadConfig() *Config {
	parseEnv()

	return &Config{
		Port:             os.Getenv("PORT"),
		WeaviateScheme:   os.Getenv("WEAVIATE_SCHEME"),
		WeaviateHost:     os.Getenv("WEAVIATE_HOST"),
		WeaviateAPIKey:   os.Getenv("WEAVIATE_API_KEY"),
		WeaviateGrpcHost: os.Getenv("WEAVIATE_GRPC_HOST"),
	}
}

func LoadConfig() (*Config, error) {
	configOnce.Do(func() {
		configInstance = loadConfig()
	})
	return configInstance, nil
}
