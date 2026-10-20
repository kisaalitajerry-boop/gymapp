import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PostgresStorage } from '../storage/postgres.js';

// An in-memory SQL mock pool implementing the basic relational tables for testing
function createMockPool() {
  const tables = {
    users: new Map(),
    credentials: new Map(),
    subscriptions: new Map(),
    invites: new Map(),
    user_states: new Map()
  };

  return {
    async query(sql, params = []) {
      const s = sql.trim();

      // Users
      if (s.startsWith('SELECT * FROM users WHERE id = $1')) {
        const u = tables.users.get(params[0]);
        return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('SELECT * FROM users')) {
        return { rows: [...tables.users.values()], rowCount: tables.users.size };
      }
      if (s.startsWith('INSERT INTO users')) {
        const row = {
          id: params[0], name: params[1], created: params[2], disabled: params[3],
          admin: params[4], sv: params[5], invitedBy: params[6],
          entitlement: params[7], entitlementExpiresAt: params[8], meta: JSON.parse(params[9] || '{}')
        };
        tables.users.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE users SET')) {
        const existing = tables.users.get(params[0]);
        if (!existing) return { rows: [], rowCount: 0 };
        const row = {
          ...existing,
          name: params[1], disabled: params[2], admin: params[3], sv: params[4],
          invitedBy: params[5], entitlement: params[6], entitlementExpiresAt: params[7],
          meta: JSON.parse(params[8] || '{}')
        };
        tables.users.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM users WHERE id = $1')) {
        const existed = tables.users.delete(params[0]);
        return { rows: [], rowCount: existed ? 1 : 0 };
      }

      // Credentials
      if (s.startsWith('SELECT * FROM credentials WHERE id = $1')) {
        const c = tables.credentials.get(params[0]);
        return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
      }
      if (s.startsWith('SELECT * FROM credentials')) {
        return { rows: [...tables.credentials.values()], rowCount: tables.credentials.size };
      }
      if (s.startsWith('INSERT INTO credentials')) {
        const row = { id: params[0], userId: params[1], publicKey: params[2], counter: params[3], transports: JSON.parse(params[4] || '[]') };
        tables.credentials.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('UPDATE credentials SET counter = $2 WHERE id = $1')) {
        const c = tables.credentials.get(params[0]);
        if (c) c.counter = params[1];
        return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
      }
      if (s.startsWith('DELETE FROM credentials WHERE id = $1')) {
        const existed = tables.credentials.delete(params[0]);
        return { rows: [], rowCount: existed ? 1 : 0 };
      }

      // Subscriptions
      if (s.startsWith('SELECT * FROM subscriptions WHERE "userId" = $1')) {
        const rows = [...tables.subscriptions.values()].filter(sub => sub.userId === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (s.startsWith('INSERT INTO subscriptions')) {
        const row = { endpoint: params[0], userId: params[1], keys: JSON.parse(params[2] || '{}'), created: params[3] };
        tables.subscriptions.set(row.endpoint, row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM subscriptions WHERE "userId" = $1 AND endpoint = $2')) {
        tables.subscriptions.delete(params[1]);
        return { rows: [], rowCount: 1 };
      }

      // Invites
      if (s.startsWith('SELECT * FROM invites WHERE code = $1')) {
        const i = tables.invites.get(params[0]);
        return { rows: i ? [i] : [], rowCount: i ? 1 : 0 };
      }
      if (s.startsWith('INSERT INTO invites')) {
        const row = { code: params[0], created: params[1], createdBy: params[2], usedBy: params[3], usedAt: params[4], revoked: params[5] };
        tables.invites.set(row.code, row);
        return { rows: [row], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM invites WHERE code = $1')) {
        const existed = tables.invites.delete(params[0]);
        return { rows: [], rowCount: existed ? 1 : 0 };
      }

      // User state
      if (s.startsWith('SELECT state FROM user_states WHERE "userId" = $1')) {
        const st = tables.user_states.get(params[0]);
        return { rows: st ? [{ state: st }] : [], rowCount: st ? 1 : 0 };
      }
      if (s.startsWith('INSERT INTO user_states')) {
        tables.user_states.set(params[0], params[1]);
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('DELETE FROM user_states WHERE "userId" = $1')) {
        tables.user_states.delete(params[0]);
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }
  };
}

test('PostgresStorage implementation contract', async t => {
  const pool = createMockPool();
  const pgStorage = new PostgresStorage({ pool });

  await t.test('users lifecycle', async () => {
    const user = await pgStorage.createUser({ id: 'u_pg_1', name: 'Postgres User' });
    assert.equal(user.id, 'u_pg_1');

    const fetched = await pgStorage.getUser('u_pg_1');
    assert.equal(fetched.name, 'Postgres User');

    const updated = await pgStorage.updateUser('u_pg_1', { name: 'Updated Name', entitlement: 'pro' });
    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.entitlement, 'pro');

    const list = await pgStorage.listUsers();
    assert.equal(list.length, 1);

    const deleted = await pgStorage.deleteUser('u_pg_1');
    assert.equal(deleted, true);
    assert.equal(await pgStorage.getUser('u_pg_1'), null);
  });

  await t.test('credentials lifecycle', async () => {
    const cred = await pgStorage.createCred({ id: 'c_pg_1', userId: 'u_pg_1', publicKey: 'pk_123' });
    assert.equal(cred.id, 'c_pg_1');

    const fetched = await pgStorage.getCred('c_pg_1');
    assert.equal(fetched.publicKey, 'pk_123');

    await pgStorage.updateCred('c_pg_1', { counter: 42 });
    assert.equal((await pgStorage.getCred('c_pg_1')).counter, 42);

    assert.equal(await pgStorage.deleteCred('c_pg_1'), true);
  });

  await t.test('subscriptions lifecycle', async () => {
    await pgStorage.saveSub({ endpoint: 'https://push.example.com/1', userId: 'u_pg_1', keys: { auth: 'a' } });
    const subs = await pgStorage.getSubsForUser('u_pg_1');
    assert.equal(subs.length, 1);
    assert.equal(subs[0].endpoint, 'https://push.example.com/1');

    await pgStorage.removeSub('u_pg_1', 'https://push.example.com/1');
    assert.equal((await pgStorage.getSubsForUser('u_pg_1')).length, 0);
  });

  await t.test('invites lifecycle', async () => {
    const invite = await pgStorage.createInvite({ code: 'CODE123' });
    assert.equal(invite.code, 'CODE123');
    assert.equal((await pgStorage.getInvite('code123')).code, 'CODE123');
    assert.equal(await pgStorage.removeInvite('CODE123'), true);
  });

  await t.test('state save, read and delete', async () => {
    const sampleState = { routines: [{ id: 'r1', name: 'Leg Day' }], unit: 'kg' };
    await pgStorage.saveState('u_pg_1', sampleState);

    const read = await pgStorage.readState('u_pg_1');
    assert.deepEqual(read, sampleState);

    await pgStorage.deleteState('u_pg_1');
    assert.equal(await pgStorage.readState('u_pg_1'), null);
  });
});
