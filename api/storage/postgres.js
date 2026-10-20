import pg from 'pg';

export class PostgresStorage {
  constructor(options = {}) {
    if (options.pool) {
      this.pool = options.pool;
    } else {
      const { Pool } = pg;
      this.pool = new Pool({
        connectionString: options.connectionString || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/opengym'
      });
    }
  }

  async close() {
    if (this.pool?.end) await this.pool.end();
  }

  /* ---------- Users ---------- */

  async getUser(id) {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findUser(predicate) {
    const all = await this.listUsers();
    return all.find(predicate) || null;
  }

  async listUsers() {
    const res = await this.pool.query('SELECT * FROM users ORDER BY created ASC');
    return res.rows;
  }

  listUsersSync() {
    throw new Error('Synchronous listUsers is not supported on PostgresStorage');
  }

  async createUser(user) {
    const existing = await this.getUser(user.id);
    if (existing) throw new Error(`User ${user.id} already exists`);

    const q = `
      INSERT INTO users (id, name, created, disabled, admin, sv, "invitedBy", entitlement, "entitlementExpiresAt", meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      user.id,
      user.name,
      user.created || new Date().toISOString(),
      !!user.disabled,
      !!user.admin,
      user.sv || 1,
      user.invitedBy || null,
      user.entitlement || 'free',
      user.entitlementExpiresAt || null,
      JSON.stringify(user.meta || {})
    ]);
    return res.rows[0];
  }

  async updateUser(id, patch) {
    const user = await this.getUser(id);
    if (!user) return null;

    const updated = { ...user, ...patch };
    const q = `
      UPDATE users SET
        name = $2,
        disabled = $3,
        admin = $4,
        sv = $5,
        "invitedBy" = $6,
        entitlement = $7,
        "entitlementExpiresAt" = $8,
        meta = $9
      WHERE id = $1
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      id,
      updated.name,
      !!updated.disabled,
      !!updated.admin,
      updated.sv,
      updated.invitedBy,
      updated.entitlement,
      updated.entitlementExpiresAt,
      JSON.stringify(updated.meta || {})
    ]);
    return res.rows[0];
  }

  async deleteUser(id) {
    const res = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  /* ---------- Credentials ---------- */

  async getCred(id) {
    const res = await this.pool.query('SELECT * FROM credentials WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async listCreds() {
    const res = await this.pool.query('SELECT * FROM credentials');
    return res.rows;
  }

  async listCredsForUser(userId) {
    const res = await this.pool.query('SELECT * FROM credentials WHERE "userId" = $1', [userId]);
    return res.rows;
  }

  async createCred(cred) {
    const q = `
      INSERT INTO credentials (id, "userId", "publicKey", counter, transports)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      cred.id,
      cred.userId,
      cred.publicKey,
      cred.counter || 0,
      JSON.stringify(cred.transports || [])
    ]);
    return res.rows[0];
  }

  async updateCred(id, patch) {
    const cred = await this.getCred(id);
    if (!cred) return null;
    const counter = patch.counter !== undefined ? patch.counter : cred.counter;
    const res = await this.pool.query('UPDATE credentials SET counter = $2 WHERE id = $1 RETURNING *', [id, counter]);
    return res.rows[0];
  }

  async deleteCred(id) {
    const res = await this.pool.query('DELETE FROM credentials WHERE id = $1', [id]);
    return res.rowCount > 0;
  }

  /* ---------- Subscriptions ---------- */

  async listSubs() {
    const res = await this.pool.query('SELECT * FROM subscriptions');
    return res.rows;
  }

  async getSubsForUser(userId) {
    const res = await this.pool.query('SELECT * FROM subscriptions WHERE "userId" = $1', [userId]);
    return res.rows;
  }

  async saveSub(sub) {
    const q = `
      INSERT INTO subscriptions (endpoint, "userId", keys, created)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) DO UPDATE SET "userId" = $2, keys = $3, created = $4
    `;
    await this.pool.query(q, [
      sub.endpoint,
      sub.userId,
      JSON.stringify(sub.keys),
      sub.created || new Date().toISOString()
    ]);
  }

  async removeSub(userId, endpoint) {
    await this.pool.query('DELETE FROM subscriptions WHERE "userId" = $1 AND endpoint = $2', [userId, endpoint]);
  }

  async removeSubsByEndpoints(endpoints) {
    if (!endpoints || !endpoints.length) return;
    await this.pool.query('DELETE FROM subscriptions WHERE endpoint = ANY($1)', [endpoints]);
  }

  /* ---------- Invites ---------- */

  async listInvites() {
    const res = await this.pool.query('SELECT * FROM invites');
    return res.rows;
  }

  async getInvite(code) {
    const c = String(code || '').toUpperCase();
    const res = await this.pool.query('SELECT * FROM invites WHERE code = $1', [c]);
    return res.rows[0] || null;
  }

  async createInvite(invite) {
    const code = String(invite.code || '').toUpperCase();
    const q = `
      INSERT INTO invites (code, created, "createdBy", "usedBy", "usedAt", revoked)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await this.pool.query(q, [
      code,
      invite.created || new Date().toISOString(),
      invite.createdBy || null,
      invite.usedBy || null,
      invite.usedAt || null,
      !!invite.revoked
    ]);
    return res.rows[0];
  }

  async updateInvite(code, patch) {
    const c = String(code || '').toUpperCase();
    const current = await this.getInvite(c);
    if (!current) return null;
    const updated = { ...current, ...patch };
    const q = `
      UPDATE invites SET
        "usedBy" = $2,
        "usedAt" = $3,
        revoked = $4
      WHERE code = $1
      RETURNING *
    `;
    const res = await this.pool.query(q, [c, updated.usedBy, updated.usedAt, !!updated.revoked]);
    return res.rows[0];
  }

  async removeInvite(code) {
    const c = String(code || '').toUpperCase();
    const res = await this.pool.query('DELETE FROM invites WHERE code = $1', [c]);
    return res.rowCount > 0;
  }

  /* ---------- User State ---------- */

  async readState(uid) {
    const res = await this.pool.query('SELECT state FROM user_states WHERE "userId" = $1', [uid]);
    if (!res.rows[0]) return null;
    const st = res.rows[0].state;
    return typeof st === 'string' ? JSON.parse(st) : st;
  }

  readStateSync(uid) {
    throw new Error('Synchronous readState is not supported on PostgresStorage');
  }

  async saveState(uid, state) {
    const q = `
      INSERT INTO user_states ("userId", state, "updatedAt")
      VALUES ($1, $2, NOW())
      ON CONFLICT ("userId") DO UPDATE SET state = $2, "updatedAt" NOW()
    `;
    await this.pool.query(q, [uid, JSON.stringify(state)]);
  }

  async deleteState(uid) {
    await this.pool.query('DELETE FROM user_states WHERE "userId" = $1', [uid]);
  }
}

export function createPostgresStorage(options) {
  return new PostgresStorage(options);
}
