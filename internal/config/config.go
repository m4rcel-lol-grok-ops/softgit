package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Git      GitConfig
	Storage  StorageConfig
	SSH      SSHConfig
	Auth     AuthConfig
	RateLimit RateLimitConfig
	SMTP     SMTPConfig
	Webhook  WebhookConfig
	Upload   UploadConfig
}

type AppConfig struct {
	Env      string
	Name     string
	URL      string
	Secret   string
	HTTPPort int
	LogLevel string
	LogFormat string
}

type DatabaseConfig struct {
	URL      string
	MaxConns int32
	MinConns int32
}

type RedisConfig struct {
	URL string
}

type GitConfig struct {
	Root               string
	HTTPBackendTimeout time.Duration
}

type StorageConfig struct {
	Backend   string
	LocalPath string
	S3        S3Config
}

type S3Config struct {
	Endpoint        string
	Bucket          string
	AccessKey       string
	SecretKey       string
	Region          string
	ForcePathStyle  bool
}

type SSHConfig struct {
	Enabled      bool
	Host         string
	Port         int
	HostKeyPath  string
	PublicHost   string
	PublicPort   int
}

type AuthConfig struct {
	JWTSecret                 string
	SessionTTL                time.Duration
	AccessTokenTTL            time.Duration
	RefreshTokenTTL           time.Duration
	PasswordMinLength         int
	RegistrationEnabled       bool
	EmailVerificationRequired bool
}

type RateLimitConfig struct {
	Requests           int
	Window             time.Duration
	LoginRequests      int
	LoginWindow        time.Duration
}

type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	TLS      bool
}

type WebhookConfig struct {
	Timeout    time.Duration
	MaxRetries int
}

type UploadConfig struct {
	MaxUploadSizeMB       int64
	MaxAvatarSizeMB       int64
	MaxReleaseAssetSizeMB int64
}

func Load() (*Config, error) {
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Defaults
	viper.SetDefault("APP_ENV", "development")
	viper.SetDefault("APP_NAME", "SoftGit")
	viper.SetDefault("APP_URL", "http://localhost:3000")
	viper.SetDefault("HTTP_PORT", 3000)
	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_FORMAT", "json")
	viper.SetDefault("DATABASE_MAX_CONNS", 25)
	viper.SetDefault("DATABASE_MIN_CONNS", 5)
	viper.SetDefault("GIT_ROOT", "/data/git")
	viper.SetDefault("GIT_HTTP_BACKEND_TIMEOUT", 3600)
	viper.SetDefault("STORAGE_BACKEND", "local")
	viper.SetDefault("STORAGE_LOCAL_PATH", "/data/storage")
	viper.SetDefault("SSH_ENABLED", true)
	viper.SetDefault("SSH_HOST", "0.0.0.0")
	viper.SetDefault("SSH_PORT", 2222)
	viper.SetDefault("SSH_HOST_KEY_PATH", "/data/ssh/ssh_host_ed25519_key")
	viper.SetDefault("SSH_PUBLIC_HOST", "localhost")
	viper.SetDefault("SSH_PUBLIC_PORT", 22)
	viper.SetDefault("SESSION_TTL_HOURS", 168)
	viper.SetDefault("ACCESS_TOKEN_TTL_HOURS", 1)
	viper.SetDefault("REFRESH_TOKEN_TTL_HOURS", 720)
	viper.SetDefault("PASSWORD_MIN_LENGTH", 8)
	viper.SetDefault("REGISTRATION_ENABLED", true)
	viper.SetDefault("EMAIL_VERIFICATION_REQUIRED", false)
	viper.SetDefault("RATE_LIMIT_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_WINDOW_SECONDS", 60)
	viper.SetDefault("LOGIN_RATE_LIMIT", 10)
	viper.SetDefault("LOGIN_RATE_WINDOW_SECONDS", 300)
	viper.SetDefault("WEBHOOK_TIMEOUT_SECONDS", 30)
	viper.SetDefault("WEBHOOK_MAX_RETRIES", 5)
	viper.SetDefault("MAX_UPLOAD_SIZE_MB", 100)
	viper.SetDefault("MAX_AVATAR_SIZE_MB", 5)
	viper.SetDefault("MAX_RELEASE_ASSET_SIZE_MB", 500)

	cfg := &Config{
		App: AppConfig{
			Env:       viper.GetString("APP_ENV"),
			Name:      viper.GetString("APP_NAME"),
			URL:       strings.TrimRight(viper.GetString("APP_URL"), "/"),
			Secret:    viper.GetString("APP_SECRET"),
			HTTPPort:  viper.GetInt("HTTP_PORT"),
			LogLevel:  viper.GetString("LOG_LEVEL"),
			LogFormat: viper.GetString("LOG_FORMAT"),
		},
		Database: DatabaseConfig{
			URL:      viper.GetString("DATABASE_URL"),
			MaxConns: int32(viper.GetInt("DATABASE_MAX_CONNS")),
			MinConns: int32(viper.GetInt("DATABASE_MIN_CONNS")),
		},
		Redis: RedisConfig{
			URL: viper.GetString("REDIS_URL"),
		},
		Git: GitConfig{
			Root:               viper.GetString("GIT_ROOT"),
			HTTPBackendTimeout: time.Duration(viper.GetInt("GIT_HTTP_BACKEND_TIMEOUT")) * time.Second,
		},
		Storage: StorageConfig{
			Backend:   viper.GetString("STORAGE_BACKEND"),
			LocalPath: viper.GetString("STORAGE_LOCAL_PATH"),
			S3: S3Config{
				Endpoint:       viper.GetString("S3_ENDPOINT"),
				Bucket:         viper.GetString("S3_BUCKET"),
				AccessKey:      viper.GetString("S3_ACCESS_KEY"),
				SecretKey:      viper.GetString("S3_SECRET_KEY"),
				Region:         viper.GetString("S3_REGION"),
				ForcePathStyle: viper.GetBool("S3_FORCE_PATH_STYLE"),
			},
		},
		SSH: SSHConfig{
			Enabled:     viper.GetBool("SSH_ENABLED"),
			Host:        viper.GetString("SSH_HOST"),
			Port:        viper.GetInt("SSH_PORT"),
			HostKeyPath: viper.GetString("SSH_HOST_KEY_PATH"),
			PublicHost:  viper.GetString("SSH_PUBLIC_HOST"),
			PublicPort:  viper.GetInt("SSH_PUBLIC_PORT"),
		},
		Auth: AuthConfig{
			JWTSecret:                 viper.GetString("JWT_SECRET"),
			SessionTTL:                time.Duration(viper.GetInt("SESSION_TTL_HOURS")) * time.Hour,
			AccessTokenTTL:            time.Duration(viper.GetInt("ACCESS_TOKEN_TTL_HOURS")) * time.Hour,
			RefreshTokenTTL:           time.Duration(viper.GetInt("REFRESH_TOKEN_TTL_HOURS")) * time.Hour,
			PasswordMinLength:         viper.GetInt("PASSWORD_MIN_LENGTH"),
			RegistrationEnabled:       viper.GetBool("REGISTRATION_ENABLED"),
			EmailVerificationRequired: viper.GetBool("EMAIL_VERIFICATION_REQUIRED"),
		},
		RateLimit: RateLimitConfig{
			Requests:      viper.GetInt("RATE_LIMIT_REQUESTS"),
			Window:        time.Duration(viper.GetInt("RATE_LIMIT_WINDOW_SECONDS")) * time.Second,
			LoginRequests: viper.GetInt("LOGIN_RATE_LIMIT"),
			LoginWindow:   time.Duration(viper.GetInt("LOGIN_RATE_WINDOW_SECONDS")) * time.Second,
		},
		SMTP: SMTPConfig{
			Host:     viper.GetString("SMTP_HOST"),
			Port:     viper.GetInt("SMTP_PORT"),
			Username: viper.GetString("SMTP_USERNAME"),
			Password: viper.GetString("SMTP_PASSWORD"),
			From:     viper.GetString("SMTP_FROM"),
			TLS:      viper.GetBool("SMTP_TLS"),
		},
		Webhook: WebhookConfig{
			Timeout:    time.Duration(viper.GetInt("WEBHOOK_TIMEOUT_SECONDS")) * time.Second,
			MaxRetries: viper.GetInt("WEBHOOK_MAX_RETRIES"),
		},
		Upload: UploadConfig{
			MaxUploadSizeMB:       int64(viper.GetInt("MAX_UPLOAD_SIZE_MB")),
			MaxAvatarSizeMB:       int64(viper.GetInt("MAX_AVATAR_SIZE_MB")),
			MaxReleaseAssetSizeMB: int64(viper.GetInt("MAX_RELEASE_ASSET_SIZE_MB")),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.App.Secret == "" || len(c.App.Secret) < 16 {
		// Allow shorter in development
		if c.App.Env == "production" && (c.App.Secret == "" || len(c.App.Secret) < 32) {
			return fmt.Errorf("APP_SECRET must be at least 32 characters in production")
		}
	}
	if c.Auth.JWTSecret == "" {
		c.Auth.JWTSecret = c.App.Secret
	}
	if c.Git.Root == "" {
		return fmt.Errorf("GIT_ROOT is required")
	}
	return nil
}

func (c *Config) IsProduction() bool {
	return strings.EqualFold(c.App.Env, "production")
}

func Getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func GetenvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
