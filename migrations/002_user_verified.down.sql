DROP INDEX IF EXISTS idx_users_verified;
ALTER TABLE users DROP COLUMN IF EXISTS is_verified;
