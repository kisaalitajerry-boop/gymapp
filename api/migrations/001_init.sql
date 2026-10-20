-- Initial schema for openGym / MuscleTrack Postgres storage

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created TEXT,
  disabled BOOLEAN DEFAULT FALSE,
  admin BOOLEAN DEFAULT FALSE,
  sv INTEGER DEFAULT 1,
  "invitedBy" TEXT,
  entitlement TEXT DEFAULT 'free',
  "entitlementExpiresAt" TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "publicKey" TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  transports JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keys JSONB NOT NULL,
  created TEXT
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  created TEXT,
  "createdBy" TEXT,
  "usedBy" TEXT,
  "usedAt" TEXT,
  revoked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_states (
  "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creds_user ON credentials("userId");
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions("userId");
