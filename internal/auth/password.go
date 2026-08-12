package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/argon2"
)

const (
	argonTime    = 1
	argonMemory  = 64 * 1024
	argonThreads = 4
	argonKeyLen  = 32
	saltLen      = 16
)

// HashPassword hashes a password with Argon2id.
func HashPassword(password string) (string, error) {
	salt := make([]byte, saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	// Format: $argon2id$v=19$m=65536,t=1,p=4$<salt>$<hash>
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemory, argonTime, argonThreads, b64Salt, b64Hash), nil
}

// VerifyPassword checks a password against an Argon2id hash.
func VerifyPassword(password, encoded string) bool {
	// Parse $argon2id$v=19$m=...,t=...,p=...$salt$hash
	parts := splitArgon(encoded)
	if parts == nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts.salt)
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts.hash)
	if err != nil {
		return false
	}
	computed := argon2.IDKey([]byte(password), salt, parts.time, parts.memory, parts.threads, uint32(len(expected)))
	if len(computed) != len(expected) {
		return false
	}
	var diff byte
	for i := range computed {
		diff |= computed[i] ^ expected[i]
	}
	return diff == 0
}

type argonParts struct {
	memory  uint32
	time    uint32
	threads uint8
	salt    string
	hash    string
}

func splitArgon(s string) *argonParts {
	// Minimal parser for our own format
	if len(s) < 20 || s[:10] != "$argon2id$" {
		return nil
	}
	rest := s[10:]
	// v=19$m=65536,t=1,p=4$salt$hash
	var v int
	var m, t, p uint32
	var salt, hash string
	n, err := fmt.Sscanf(rest, "v=%d$m=%d,t=%d,p=%d$", &v, &m, &t, &p)
	if err != nil || n != 4 {
		return nil
	}
	idx := 0
	// find after the params
	for i := 0; i < len(rest); i++ {
		if rest[i] == '$' {
			idx++
			if idx == 2 {
				rest = rest[i+1:]
				break
			}
		}
	}
	parts := stringsSplitN(rest, "$", 2)
	if len(parts) != 2 {
		return nil
	}
	salt, hash = parts[0], parts[1]
	return &argonParts{memory: m, time: t, threads: uint8(p), salt: salt, hash: hash}
}

func stringsSplitN(s, sep string, n int) []string {
	var res []string
	for n > 1 {
		i := indexOf(s, sep)
		if i < 0 {
			break
		}
		res = append(res, s[:i])
		s = s[i+len(sep):]
		n--
	}
	res = append(res, s)
	return res
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// HashToken returns a SHA-256 hex hash of a token (for storage).
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// GenerateToken creates a cryptographically secure random token.
func GenerateToken(nbytes int) (string, error) {
	b := make([]byte, nbytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// FingerprintSSH computes a SHA256 fingerprint of an SSH public key (OpenSSH style).
func FingerprintSSH(publicKey string) (string, error) {
	// Simple SHA256 of the key material; production should parse properly.
	h := sha256.Sum256([]byte(publicKey))
	return "SHA256:" + base64.RawStdEncoding.EncodeToString(h[:]), nil
}
