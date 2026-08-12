package ssh

import (
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"strings"

	"github.com/m4rcel-lol/softgit/internal/config"
	"github.com/m4rcel-lol/softgit/internal/db"
	"github.com/m4rcel-lol/softgit/internal/git"
	gossh "golang.org/x/crypto/ssh"
)

type Server struct {
	cfg    *config.Config
	db     *db.DB
	git    *git.Manager
	logger *slog.Logger
	listener net.Listener
	config *gossh.ServerConfig
}

func NewServer(cfg *config.Config, database *db.DB, gitMgr *git.Manager, logger *slog.Logger) (*Server, error) {
	s := &Server{cfg: cfg, db: database, git: gitMgr, logger: logger}

	// Ensure host key
	if err := ensureHostKey(cfg.SSH.HostKeyPath); err != nil {
		return nil, err
	}
	keyBytes, err := os.ReadFile(cfg.SSH.HostKeyPath)
	if err != nil {
		return nil, err
	}
	signer, err := gossh.ParsePrivateKey(keyBytes)
	if err != nil {
		return nil, err
	}

	sshCfg := &gossh.ServerConfig{
		PublicKeyCallback: s.publicKeyCallback,
		// No password auth for Git over SSH by default
	}
	sshCfg.AddHostKey(signer)
	s.config = sshCfg
	return s, nil
}

func ensureHostKey(path string) error {
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	if err := os.MkdirAll(filepathDir(path), 0o750); err != nil {
		return err
	}
	cmd := exec.Command("ssh-keygen", "-t", "ed25519", "-f", path, "-N", "", "-q")
	return cmd.Run()
}

func filepathDir(p string) string {
	i := strings.LastIndex(p, "/")
	if i < 0 {
		return "."
	}
	return p[:i]
}

func (s *Server) publicKeyCallback(conn gossh.ConnMetadata, key gossh.PublicKey) (*gossh.Permissions, error) {
	// Look up fingerprint in ssh_keys
	// Simplified: accept any key registered (production should match fingerprint)
	fp := gossh.FingerprintSHA256(key)
	s.logger.Debug("ssh public key auth attempt", "user", conn.User(), "fp", fp)
	// For foundation: allow and map to username = conn.User()
	return &gossh.Permissions{
		Extensions: map[string]string{
			"user": conn.User(),
		},
	}, nil
}

func (s *Server) ListenAndServe() error {
	addr := fmt.Sprintf("%s:%d", s.cfg.SSH.Host, s.cfg.SSH.Port)
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	s.listener = ln
	for {
		conn, err := ln.Accept()
		if err != nil {
			return err
		}
		go s.handleConn(conn)
	}
}

func (s *Server) handleConn(nConn net.Conn) {
	defer nConn.Close()
	_, chans, reqs, err := gossh.NewServerConn(nConn, s.config)
	if err != nil {
		return
	}
	go gossh.DiscardRequests(reqs)
	for newChannel := range chans {
		if newChannel.ChannelType() != "session" {
			_ = newChannel.Reject(gossh.UnknownChannelType, "unknown")
			continue
		}
		channel, requests, err := newChannel.Accept()
		if err != nil {
			continue
		}
		go s.handleSession(channel, requests)
	}
}

func (s *Server) handleSession(channel gossh.Channel, requests <-chan *gossh.Request) {
	defer channel.Close()
	for req := range requests {
		if req.Type != "exec" {
			if req.WantReply {
				_ = req.Reply(false, nil)
			}
			continue
		}
		// payload is command
		cmdLine := string(req.Payload[4:]) // skip length
		if req.WantReply {
			_ = req.Reply(true, nil)
		}
		s.runGitCommand(channel, cmdLine)
		return
	}
}

func (s *Server) runGitCommand(channel gossh.Channel, cmdLine string) {
	// Expected: git-upload-pack 'owner/repo.git' or git-receive-pack 'owner/repo.git'
	parts := strings.Fields(cmdLine)
	if len(parts) < 2 {
		_, _ = io.WriteString(channel.Stderr(), "invalid command\n")
		return
	}
	gitCmd := parts[0]
	repoArg := strings.Trim(parts[1], "'")
	repoArg = strings.TrimSuffix(repoArg, ".git")
	repoArg = strings.TrimPrefix(repoArg, "/")
	segs := strings.SplitN(repoArg, "/", 2)
	if len(segs) != 2 {
		_, _ = io.WriteString(channel.Stderr(), "invalid repository path\n")
		return
	}
	owner, name := segs[0], segs[1]
	path, err := s.git.Path(owner, name)
	if err != nil {
		_, _ = io.WriteString(channel.Stderr(), "invalid repository\n")
		return
	}

	var cmd *exec.Cmd
	switch gitCmd {
	case "git-upload-pack":
		cmd = exec.Command("git", "upload-pack", path)
	case "git-receive-pack":
		cmd = exec.Command("git", "receive-pack", path)
	default:
		_, _ = io.WriteString(channel.Stderr(), "unsupported command\n")
		return
	}
	cmd.Stdin = channel
	cmd.Stdout = channel
	cmd.Stderr = channel.Stderr()
	_ = cmd.Run()
}

func (s *Server) Close() error {
	if s.listener != nil {
		return s.listener.Close()
	}
	return nil
}
