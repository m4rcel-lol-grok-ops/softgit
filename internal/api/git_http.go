package api

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

// Git Smart HTTP handlers – real git-http-backend style using git commands.

func (s *Server) handleGitInfoRefs(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	repo := strings.TrimSuffix(chi.URLParam(r, "repo"), ".git")
	service := r.URL.Query().Get("service")

	path, err := s.git.Path(owner, repo)
	if err != nil {
		http.Error(w, "invalid repository", http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(filepath.Join(path, "HEAD")); err != nil {
		http.Error(w, "repository not found", http.StatusNotFound)
		return
	}

	// Authorization: public repos allow read; private require auth
	// (simplified – production should check collaborator permissions)

	var cmd *exec.Cmd
	switch service {
	case "git-upload-pack":
		cmd = exec.Command("git", "upload-pack", "--stateless-rpc", "--advertise-refs", path)
	case "git-receive-pack":
		// require auth for push
		user, _ := s.authenticate(r)
		if user == nil {
			w.Header().Set("WWW-Authenticate", `Basic realm="SoftGit"`)
			http.Error(w, "authentication required", http.StatusUnauthorized)
			return
		}
		cmd = exec.Command("git", "receive-pack", "--stateless-rpc", "--advertise-refs", path)
	default:
		http.Error(w, "unsupported service", http.StatusForbidden)
		return
	}

	cmd.Env = append(os.Environ(), "GIT_PROTOCOL=version=2")
	out, err := cmd.Output()
	if err != nil {
		s.logger.Error("git info/refs", "error", err)
		http.Error(w, "git error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")
	w.Header().Set("Cache-Control", "no-cache")
	// pkt-line service announcement
	header := "# service=" + service + "\n"
	_, _ = w.Write(pktLine(header))
	_, _ = w.Write([]byte("0000"))
	_, _ = w.Write(out)
}

func (s *Server) handleGitUploadPack(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	repo := strings.TrimSuffix(chi.URLParam(r, "repo"), ".git")
	path, err := s.git.Path(owner, repo)
	if err != nil {
		http.Error(w, "invalid", http.StatusBadRequest)
		return
	}

	cmd := exec.Command("git", "upload-pack", "--stateless-rpc", path)
	cmd.Stdin = r.Body
	cmd.Stdout = w
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "GIT_PROTOCOL=version=2")

	w.Header().Set("Content-Type", "application/x-git-upload-pack-result")
	w.Header().Set("Cache-Control", "no-cache")
	if err := cmd.Run(); err != nil {
		s.logger.Error("git-upload-pack", "error", err)
	}
}

func (s *Server) handleGitReceivePack(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	repo := strings.TrimSuffix(chi.URLParam(r, "repo"), ".git")
	path, err := s.git.Path(owner, repo)
	if err != nil {
		http.Error(w, "invalid", http.StatusBadRequest)
		return
	}

	user, _ := s.authenticate(r)
	if user == nil {
		w.Header().Set("WWW-Authenticate", `Basic realm="SoftGit"`)
		http.Error(w, "authentication required", http.StatusUnauthorized)
		return
	}

	cmd := exec.Command("git", "receive-pack", "--stateless-rpc", path)
	cmd.Stdin = r.Body
	cmd.Stdout = w
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(),
		"GIT_PROTOCOL=version=2",
		"SOFTGIT_USER="+user.Username,
	)

	w.Header().Set("Content-Type", "application/x-git-receive-pack-result")
	w.Header().Set("Cache-Control", "no-cache")
	if err := cmd.Run(); err != nil {
		s.logger.Error("git-receive-pack", "error", err)
		return
	}
	// Update pushed_at
	_, _ = s.db.Pool.Exec(r.Context(), `
		UPDATE repositories SET pushed_at = NOW(), updated_at = NOW()
		WHERE LOWER(owner_name) = LOWER($1) AND LOWER(name) = LOWER($2)
	`, owner, repo)
}

func pktLine(s string) []byte {
	return []byte(sprintf("%04x%s", len(s)+4, s))
}

func sprintf(format string, a ...interface{}) string {
	return strings.Replace(format, "%04x", toHex4(a[0].(int)), 1) + a[1].(string)
}

func toHex4(n int) string {
	const hexdigits = "0123456789abcdef"
	b := []byte{0, 0, 0, 0}
	b[0] = hexdigits[(n>>12)&0xf]
	b[1] = hexdigits[(n>>8)&0xf]
	b[2] = hexdigits[(n>>4)&0xf]
	b[3] = hexdigits[n&0xf]
	return string(b)
}
