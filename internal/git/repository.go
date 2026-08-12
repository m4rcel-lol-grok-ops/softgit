package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

var (
	// Safe repository / owner name: alphanumeric, hyphen, underscore, dot. No leading/trailing dots or consecutive dots.
	safeNameRe = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,98}[a-zA-Z0-9])?$`)
)

// Manager manages bare Git repositories on disk under a root directory.
type Manager struct {
	Root string
}

func NewManager(root string) (*Manager, error) {
	if err := os.MkdirAll(root, 0o750); err != nil {
		return nil, fmt.Errorf("create git root: %w", err)
	}
	return &Manager{Root: root}, nil
}

// ValidateName ensures a name is safe for use in paths.
func ValidateName(name string) error {
	if name == "" || len(name) > 100 {
		return fmt.Errorf("invalid name length")
	}
	if strings.Contains(name, "..") || strings.ContainsAny(name, `/\`) {
		return fmt.Errorf("invalid characters in name")
	}
	if !safeNameRe.MatchString(name) {
		return fmt.Errorf("name must be alphanumeric with limited punctuation")
	}
	// Reject names that look like path traversal or special
	lower := strings.ToLower(name)
	if lower == "." || lower == ".." || strings.HasPrefix(lower, ".") {
		return fmt.Errorf("invalid name")
	}
	return nil
}

// Path returns the absolute path for a repository owner/name.
// It never allows escaping the root.
func (m *Manager) Path(owner, name string) (string, error) {
	if err := ValidateName(owner); err != nil {
		return "", fmt.Errorf("owner: %w", err)
	}
	if err := ValidateName(name); err != nil {
		return "", fmt.Errorf("name: %w", err)
	}
	p := filepath.Join(m.Root, owner, name+".git")
	// Ensure still under root after cleaning
	clean := filepath.Clean(p)
	if !strings.HasPrefix(clean, filepath.Clean(m.Root)+string(os.PathSeparator)) && clean != filepath.Clean(m.Root) {
		return "", fmt.Errorf("path escapes git root")
	}
	return clean, nil
}

// Exists checks whether a bare repository exists.
func (m *Manager) Exists(owner, name string) (bool, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return false, err
	}
	info, err := os.Stat(filepath.Join(p, "HEAD"))
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return !info.IsDir(), nil
}

// Init creates a new bare repository.
func (m *Manager) Init(owner, name, defaultBranch string) error {
	p, err := m.Path(owner, name)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(p), 0o750); err != nil {
		return err
	}
	if defaultBranch == "" {
		defaultBranch = "main"
	}
	if err := ValidateBranchName(defaultBranch); err != nil {
		return err
	}

	cmd := exec.Command("git", "init", "--bare", "--initial-branch="+defaultBranch, p)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git init: %w: %s", err, string(out))
	}

	// Disable potentially dangerous hooks by ensuring hooks dir is empty / non-executable
	hooks := filepath.Join(p, "hooks")
	_ = os.RemoveAll(hooks)
	_ = os.MkdirAll(hooks, 0o750)

	// Set some safe defaults
	_ = m.runGit(p, "config", "core.logAllRefUpdates", "true")
	_ = m.runGit(p, "config", "receive.denyNonFastForwards", "false")
	_ = m.runGit(p, "config", "http.receivepack", "true")

	return nil
}

// Delete removes a repository from disk.
func (m *Manager) Delete(owner, name string) error {
	p, err := m.Path(owner, name)
	if err != nil {
		return err
	}
	return os.RemoveAll(p)
}

// Rename moves a repository to a new name under the same owner.
func (m *Manager) Rename(owner, oldName, newName string) error {
	oldPath, err := m.Path(owner, oldName)
	if err != nil {
		return err
	}
	newPath, err := m.Path(owner, newName)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(newPath), 0o750); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

// Transfer moves a repository to a new owner.
func (m *Manager) Transfer(oldOwner, name, newOwner string) error {
	oldPath, err := m.Path(oldOwner, name)
	if err != nil {
		return err
	}
	newPath, err := m.Path(newOwner, name)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(newPath), 0o750); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

func (m *Manager) runGit(repoPath string, args ...string) error {
	cmd := exec.Command("git", append([]string{"-C", repoPath}, args...)...)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git %v: %w: %s", args, err, string(out))
	}
	return nil
}

// ValidateBranchName validates a branch or tag name.
func ValidateBranchName(name string) error {
	if name == "" || len(name) > 255 {
		return fmt.Errorf("invalid branch name length")
	}
	if strings.HasPrefix(name, "-") || strings.Contains(name, "..") {
		return fmt.Errorf("invalid branch name")
	}
	for _, r := range name {
		if unicode.IsControl(r) || r == ' ' || r == '~' || r == '^' || r == ':' || r == '?' || r == '*' || r == '[' {
			return fmt.Errorf("invalid character in branch name")
		}
	}
	return nil
}

// ListBranches returns local branch names.
func (m *Manager) ListBranches(owner, name string) ([]string, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	cmd := exec.Command("git", "-C", p, "for-each-ref", "--format=%(refname:short)", "refs/heads/")
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var branches []string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			branches = append(branches, line)
		}
	}
	return branches, nil
}

// ListTags returns tag names.
func (m *Manager) ListTags(owner, name string) ([]string, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	cmd := exec.Command("git", "-C", p, "for-each-ref", "--format=%(refname:short)", "refs/tags/")
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var tags []string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			tags = append(tags, line)
		}
	}
	return tags, nil
}

// RevParse resolves a revision to a full SHA.
func (m *Manager) RevParse(owner, name, rev string) (string, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return "", err
	}
	if err := ValidateBranchName(rev); err != nil && !isSHA(rev) {
		return "", err
	}
	cmd := exec.Command("git", "-C", p, "rev-parse", "--verify", rev)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("rev-parse: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}

func isSHA(s string) bool {
	if len(s) < 7 || len(s) > 40 {
		return false
	}
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// Log returns recent commits (format: sha|author|email|timestamp|subject).
func (m *Manager) Log(owner, name, rev string, limit int) ([]CommitInfo, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	args := []string{"-C", p, "log", "--format=%H|%an|%ae|%at|%s", "-n", fmt.Sprintf("%d", limit)}
	if rev != "" {
		args = append(args, rev)
	}
	cmd := exec.Command("git", args...)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var commits []CommitInfo
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 5)
		if len(parts) < 5 {
			continue
		}
		commits = append(commits, CommitInfo{
			SHA:     parts[0],
			Author:  parts[1],
			Email:   parts[2],
			Date:    parts[3],
			Subject: parts[4],
		})
	}
	return commits, nil
}

type CommitInfo struct {
	SHA     string `json:"sha"`
	Author  string `json:"author"`
	Email   string `json:"email"`
	Date    string `json:"date"`
	Subject string `json:"subject"`
}

// CatFile returns the content of a blob at path in the given tree-ish.
func (m *Manager) CatFile(owner, name, rev, path string) ([]byte, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	// Sanitize path
	path = filepath.Clean("/" + path)
	path = strings.TrimPrefix(path, "/")
	if strings.Contains(path, "..") {
		return nil, fmt.Errorf("invalid path")
	}
	spec := rev + ":" + path
	cmd := exec.Command("git", "-C", p, "cat-file", "-p", spec)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("cat-file: %w", err)
	}
	return out, nil
}

// LsTree lists tree entries.
func (m *Manager) LsTree(owner, name, rev, path string) ([]TreeEntry, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	args := []string{"-C", p, "ls-tree", "--full-name", rev}
	if path != "" && path != "/" {
		path = strings.TrimPrefix(filepath.Clean("/"+path), "/")
		args = append(args, path)
	}
	cmd := exec.Command("git", args...)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	var entries []TreeEntry
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		// mode type sha\tname
		parts := strings.SplitN(line, "\t", 2)
		if len(parts) != 2 {
			continue
		}
		meta := strings.Fields(parts[0])
		if len(meta) < 3 {
			continue
		}
		entries = append(entries, TreeEntry{
			Mode: meta[0],
			Type: meta[1],
			SHA:  meta[2],
			Path: parts[1],
		})
	}
	return entries, nil
}

type TreeEntry struct {
	Mode string `json:"mode"`
	Type string `json:"type"`
	SHA  string `json:"sha"`
	Path string `json:"path"`
}

// Merge performs a merge of source into target using the given strategy.
// strategy: "merge" | "squash" | "rebase"
func (m *Manager) Merge(owner, name, source, target, strategy, message string) (string, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return "", err
	}
	// Work in a temporary worktree to avoid polluting the bare repo
	tmp, err := os.MkdirTemp("", "softgit-merge-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmp)

	// Clone (local) into temp
	cmd := exec.Command("git", "clone", "--branch", target, p, tmp)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("clone for merge: %w: %s", err, out)
	}

	switch strategy {
	case "squash":
		cmd = exec.Command("git", "-C", tmp, "merge", "--squash", source)
	case "rebase":
		cmd = exec.Command("git", "-C", tmp, "rebase", source)
	default:
		cmd = exec.Command("git", "-C", tmp, "merge", "--no-ff", "-m", message, source)
	}
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("merge failed: %w: %s", err, out)
	}

	if strategy == "squash" {
		cmd = exec.Command("git", "-C", tmp, "commit", "-m", message)
		cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
		if out, err := cmd.CombinedOutput(); err != nil {
			return "", fmt.Errorf("squash commit: %w: %s", err, out)
		}
	}

	// Push back to bare
	cmd = exec.Command("git", "-C", tmp, "push", "origin", target)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("push merge: %w: %s", err, out)
	}

	sha, err := m.RevParse(owner, name, target)
	return sha, err
}

// Archive creates a tarball or zip of the tree at rev.
func (m *Manager) Archive(owner, name, rev, format string) ([]byte, error) {
	p, err := m.Path(owner, name)
	if err != nil {
		return nil, err
	}
	if format != "tar" && format != "tar.gz" && format != "zip" {
		format = "tar.gz"
	}
	cmd := exec.Command("git", "-C", p, "archive", "--format="+format, rev)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	return cmd.Output()
}
