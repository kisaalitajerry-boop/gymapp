import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempData } from './helpers.mjs';
import { createJsonStorage } from '../storage/json.js';
import { createStorage } from '../storage/index.js';

test('createStorage default creates json storage', () => {
  const dir = tempData();
  const storage = createStorage('json', { dataDir: dir });
  assert.ok(storage);
  assert.equal(typeof storage.getUser, 'function');
});

test('user lifecycle: create, get, list, update, delete', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  const u1 = { id: 'u1', name: 'Alice', created: '2026-10-19T00:00:00Z' };
  await storage.createUser(u1);

  const found = await storage.getUser('u1');
  assert.deepEqual(found, u1);

  const list = await storage.listUsers();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'u1');

  await storage.updateUser('u1', { name: 'Alice Smith', sv: 1 });
  const updated = await storage.getUser('u1');
  assert.equal(updated.name, 'Alice Smith');
  assert.equal(updated.sv, 1);

  // Persistence check across reload
  const storage2 = createJsonStorage({ dataDir: dir });
  const reloaded = await storage2.getUser('u1');
  assert.equal(reloaded.name, 'Alice Smith');

  const deleted = await storage.deleteUser('u1');
  assert.equal(deleted, true);
  assert.equal(await storage.getUser('u1'), null);
});

test('credential lifecycle: create, get, update, delete', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  const cred = { id: 'c1', userId: 'u1', publicKey: 'pk1', counter: 0, transports: ['internal'] };
  await storage.createCred(cred);

  const found = await storage.getCred('c1');
  assert.deepEqual(found, cred);

  await storage.updateCred('c1', { counter: 5 });
  const updated = await storage.getCred('c1');
  assert.equal(updated.counter, 5);

  const credsForUser = await storage.listCredsForUser('u1');
  assert.equal(credsForUser.length, 1);

  await storage.deleteCred('c1');
  assert.equal(await storage.getCred('c1'), null);
});

test('subscriptions: save, filter by user, batch remove', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  await storage.saveSub({ userId: 'u1', endpoint: 'ep1', keys: { p256dh: 'k1', auth: 'a1' } });
  await storage.saveSub({ userId: 'u1', endpoint: 'ep2', keys: { p256dh: 'k2', auth: 'a2' } });
  await storage.saveSub({ userId: 'u2', endpoint: 'ep3', keys: { p256dh: 'k3', auth: 'a3' } });

  let u1Subs = await storage.getSubsForUser('u1');
  assert.equal(u1Subs.length, 2);

  // Updating same endpoint replaces rather than duplicates
  await storage.saveSub({ userId: 'u1', endpoint: 'ep1', keys: { p256dh: 'k1-new', auth: 'a1-new' } });
  u1Subs = await storage.getSubsForUser('u1');
  assert.equal(u1Subs.length, 2);
  assert.equal(u1Subs.find(s => s.endpoint === 'ep1').keys.p256dh, 'k1-new');

  // remove by dead endpoints
  await storage.removeSubsByEndpoints(['ep1', 'ep3']);
  const allSubs = await storage.listSubs();
  assert.equal(allSubs.length, 1);
  assert.equal(allSubs[0].endpoint, 'ep2');
});

test('invites: create, get, update, remove', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  const invite = await storage.createInvite({ code: 'ABCD1234', note: 'Friend', createdBy: 'admin' });
  assert.equal(invite.code, 'ABCD1234');

  const found = await storage.getInvite('abcd1234'); // case-insensitive lookup
  assert.ok(found);
  assert.equal(found.note, 'Friend');

  await storage.updateInvite('ABCD1234', { usedBy: 'u1', usedAt: '2026-10-19T01:00:00Z' });
  const updated = await storage.getInvite('ABCD1234');
  assert.equal(updated.usedBy, 'u1');

  await storage.removeInvite('ABCD1234');
  assert.equal(await storage.getInvite('ABCD1234'), null);
});

test('state: save, read, delete', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  const sampleState = { unit: 'kg', routines: [{ id: 'r1', name: 'Push' }] };
  await storage.saveState('u1', sampleState);

  const read = await storage.readState('u1');
  assert.deepEqual(read, sampleState);
  assert.deepEqual(storage.readStateSync('u1'), sampleState);

  await storage.deleteState('u1');
  assert.equal(await storage.readState('u1'), null);
});

test('deleteUser cascades to credentials, subscriptions, and state', async () => {
  const dir = tempData();
  const storage = createJsonStorage({ dataDir: dir });

  await storage.createUser({ id: 'u_del', name: 'Bob' });
  await storage.createCred({ id: 'c_del', userId: 'u_del', publicKey: 'pk', counter: 0 });
  await storage.saveSub({ userId: 'u_del', endpoint: 'ep_del', keys: { p256dh: 'k', auth: 'a' } });
  await storage.saveState('u_del', { workouts: [{ id: 'w1' }] });

  assert.ok(await storage.getUser('u_del'));
  assert.equal((await storage.listCredsForUser('u_del')).length, 1);
  assert.equal((await storage.getSubsForUser('u_del')).length, 1);
  assert.ok(await storage.readState('u_del'));

  const ok = await storage.deleteUser('u_del');
  assert.equal(ok, true);

  assert.equal(await storage.getUser('u_del'), null);
  assert.equal((await storage.listCredsForUser('u_del')).length, 0);
  assert.equal((await storage.getSubsForUser('u_del')).length, 0);
  assert.equal(await storage.readState('u_del'), null);
});
