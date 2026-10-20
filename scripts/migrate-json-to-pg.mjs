#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DATA_DIR = process.env.DATA_DIR || './data';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/opengym';

async function migrate() {
  console.log(`[Migration] Starting JSON to Postgres migration from ${DATA_DIR}...`);

  const dbFile = path.join(DATA_DIR, 'db.json');
  if (!fs.existsSync(dbFile)) {
    console.error(`[Migration] db.json not found at ${dbFile}`);
    process.exit(1);
  }

  const rawDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  const users = rawDb.users || [];
  const creds = rawDb.creds || [];
  const subs = rawDb.subs || [];
  const invites = rawDb.invites || [];

  const { Client } = pg;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Run migrations
    const migrationFile = path.join(process.cwd(), 'api', 'migrations', '001_init.sql');
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, 'utf8');
      console.log('[Migration] Applying schema from 001_init.sql...');
      await client.query(sql);
    }

    // 2. Insert Users
    console.log(`[Migration] Migrating ${users.length} users...`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, created, disabled, admin, sv, "invitedBy", entitlement, "entitlementExpiresAt", meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET name = $2, admin = $5, sv = $6`,
        [u.id, u.name, u.created || new Date().toISOString(), !!u.disabled, !!u.admin, u.sv || 1, u.invitedBy || null, u.entitlement || 'free', u.entitlementExpiresAt || null, JSON.stringify(u.meta || {})]
      );
    }

    // 3. Insert Credentials
    console.log(`[Migration] Migrating ${creds.length} credentials...`);
    for (const c of creds) {
      await client.query(
        `INSERT INTO credentials (id, "userId", "publicKey", counter, transports)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET counter = $4`,
        [c.id, c.userId, c.publicKey, c.counter || 0, JSON.stringify(c.transports || [])]
      );
    }

    // 4. Insert Subscriptions
    console.log(`[Migration] Migrating ${subs.length} push subscriptions...`);
    for (const s of subs) {
      await client.query(
        `INSERT INTO subscriptions (endpoint, "userId", keys, created)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO NOTHING`,
        [s.endpoint, s.userId, JSON.stringify(s.keys), s.created || new Date().toISOString()]
      );
    }

    // 5. Insert Invites
    console.log(`[Migration] Migrating ${invites.length} invite codes...`);
    for (const i of invites) {
      await client.query(
        `INSERT INTO invites (code, created, "createdBy", "usedBy", "usedAt", revoked)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [i.code, i.created || new Date().toISOString(), i.createdBy || null, i.usedBy || null, i.usedAt || null, !!i.revoked]
      );
    }

    // 6. Insert User States
    const stateFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('state-') && f.endsWith('.json'));
    console.log(`[Migration] Migrating ${stateFiles.length} user state files...`);
    for (const sf of stateFiles) {
      const uid = sf.replace(/^state-/, '').replace(/\.json$/, '');
      const stateContent = JSON.parse(fs.readFileSync(path.join(DATA_DIR, sf), 'utf8'));
      await client.query(
        `INSERT INTO user_states ("userId", state, "updatedAt")
         VALUES ($1, $2, NOW())
         ON CONFLICT ("userId") DO UPDATE SET state = $2, "updatedAt" = NOW()`,
        [uid, JSON.stringify(stateContent)]
      );
    }

    console.log('[Migration] Lossless migration to Postgres completed successfully!');
  } finally {
    await client.end();
  }
}

migrate().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
