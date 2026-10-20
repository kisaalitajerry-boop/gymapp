import fs from 'node:fs';
import path from 'node:path';

function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function safeUid(uid) {
  return String(uid).replace(/[^a-zA-Z0-9_-]/g, '');
}

export class JsonStorage {
  constructor(options = {}) {
    this.dataDir = options.dataDir || process.env.DATA_DIR || '/data';
    this.dbFile = path.join(this.dataDir, 'db.json');
    this._ensureDir();
    this.db = this._loadDb();
  }

  _ensureDir() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    try { fs.chmodSync(this.dataDir, 0o700); } catch { /* best-effort */ }
  }

  _loadDb() {
    let db = { users: [], creds: [], subs: [], invites: [] };
    try {
      db = JSON.parse(fs.readFileSync(this.dbFile, 'utf8'));
    } catch {
      // file missing or invalid json — start with empty defaults
    }
    db.users = Array.isArray(db.users) ? db.users : [];
    db.creds = Array.isArray(db.creds) ? db.creds : [];
    db.subs = Array.isArray(db.subs) ? db.subs : [];
    db.invites = Array.isArray(db.invites) ? db.invites : [];
    return db;
  }

  _saveDb() {
    atomicWrite(this.dbFile, JSON.stringify(this.db, null, 2));
  }

  _stateFile(uid) {
    return path.join(this.dataDir, 'state-' + safeUid(uid) + '.json');
  }

  /* ---------- Users ---------- */

  async getUser(id) {
    return this.db.users.find(u => u.id === id) || null;
  }

  async findUser(predicate) {
    return this.db.users.find(predicate) || null;
  }

  async listUsers() {
    return [...this.db.users];
  }

  listUsersSync() {
    return [...this.db.users];
  }

  async createUser(user) {
    const existing = this.db.users.find(u => u.id === user.id);
    if (existing) throw new Error(`User ${user.id} already exists`);
    this.db.users.push({ ...user });
    this._saveDb();
    return user;
  }

  async updateUser(id, patch) {
    const user = this.db.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    this._saveDb();
    return { ...user };
  }

  async deleteUser(id) {
    const initialLen = this.db.users.length;
    this.db.users = this.db.users.filter(u => u.id !== id);
    this.db.creds = this.db.creds.filter(c => c.userId !== id);
    this.db.subs = this.db.subs.filter(s => s.userId !== id);
    if (this.db.users.length !== initialLen) {
      this._saveDb();
      await this.deleteState(id);
      return true;
    }
    return false;
  }

  /* ---------- Credentials ---------- */

  async getCred(id) {
    return this.db.creds.find(c => c.id === id) || null;
  }

  async listCreds() {
    return [...this.db.creds];
  }

  async listCredsForUser(userId) {
    return this.db.creds.filter(c => c.userId === userId);
  }

  async createCred(cred) {
    const existing = this.db.creds.find(c => c.id === cred.id);
    if (existing) throw new Error(`Credential ${cred.id} already exists`);
    this.db.creds.push({ ...cred });
    this._saveDb();
    return cred;
  }

  async updateCred(id, patch) {
    const cred = this.db.creds.find(c => c.id === id);
    if (!cred) return null;
    Object.assign(cred, patch);
    this._saveDb();
    return { ...cred };
  }

  async deleteCred(id) {
    const initialLen = this.db.creds.length;
    this.db.creds = this.db.creds.filter(c => c.id !== id);
    if (this.db.creds.length !== initialLen) {
      this._saveDb();
      return true;
    }
    return false;
  }

  /* ---------- Subscriptions ---------- */

  async listSubs() {
    return [...this.db.subs];
  }

  async getSubsForUser(userId) {
    return this.db.subs.filter(s => s.userId === userId);
  }

  async saveSub(sub) {
    this.db.subs = this.db.subs.filter(s => s.endpoint !== sub.endpoint);
    this.db.subs.push({ ...sub });
    this._saveDb();
  }

  async removeSub(userId, endpoint) {
    const initialLen = this.db.subs.length;
    this.db.subs = this.db.subs.filter(s => !(s.userId === userId && s.endpoint === endpoint));
    if (this.db.subs.length !== initialLen) {
      this._saveDb();
    }
  }

  async removeSubsByEndpoints(endpoints) {
    const set = new Set(endpoints);
    const initialLen = this.db.subs.length;
    this.db.subs = this.db.subs.filter(s => !set.has(s.endpoint));
    if (this.db.subs.length !== initialLen) {
      this._saveDb();
    }
  }

  /* ---------- Invites ---------- */

  async listInvites() {
    return [...this.db.invites];
  }

  async getInvite(code) {
    const c = String(code || '').toUpperCase();
    return this.db.invites.find(i => i.code === c) || null;
  }

  async createInvite(invite) {
    const code = String(invite.code || '').toUpperCase();
    if (this.db.invites.some(i => i.code === code)) {
      throw new Error(`Invite code ${code} already exists`);
    }
    const item = { ...invite, code };
    this.db.invites.push(item);
    this._saveDb();
    return item;
  }

  async updateInvite(code, patch) {
    const c = String(code || '').toUpperCase();
    const inv = this.db.invites.find(i => i.code === c);
    if (!inv) return null;
    Object.assign(inv, patch);
    this._saveDb();
    return { ...inv };
  }

  async removeInvite(code) {
    const c = String(code || '').toUpperCase();
    const initialLen = this.db.invites.length;
    this.db.invites = this.db.invites.filter(i => i.code !== c);
    if (this.db.invites.length !== initialLen) {
      this._saveDb();
      return true;
    }
    return false;
  }

  /* ---------- User State ---------- */

  async readState(uid) {
    try {
      return JSON.parse(fs.readFileSync(this._stateFile(uid), 'utf8'));
    } catch {
      return null;
    }
  }

  readStateSync(uid) {
    try {
      return JSON.parse(fs.readFileSync(this._stateFile(uid), 'utf8'));
    } catch {
      return null;
    }
  }

  async saveState(uid, state) {
    atomicWrite(this._stateFile(uid), JSON.stringify(state));
  }

  async deleteState(uid) {
    try {
      fs.unlinkSync(this._stateFile(uid));
    } catch {
      // not found or already deleted
    }
  }
}

export function createJsonStorage(options) {
  return new JsonStorage(options);
}
