import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import storage from '../storage/index.js';
import { handleRevenueCatWebhook, isUserPro } from '../billing/webhook.js';

test('RevenueCat webhook handling and entitlement verification', async t => {
  const testUser = {
    id: 'user_billing_test_' + Date.now(),
    name: 'Billing Tester',
    entitlement: 'free',
    entitlementExpiresAt: null
  };

  await storage.createUser(testUser);

  await t.test('rejects webhook with invalid auth header', async () => {
    await assert.rejects(
      handleRevenueCatWebhook({ event: { type: 'INITIAL_PURCHASE' } }, 'Bearer wrong', 'secret_key_123'),
      { statusCode: 401 }
    );
  });

  await t.test('processes INITIAL_PURCHASE and activates Pro', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: testUser.id,
        expiration_at_ms: Date.now() + 30 * 86400000
      }
    };

    const res = await handleRevenueCatWebhook(payload, 'Bearer secret_key_123', 'secret_key_123');
    assert.equal(res.ok, true);
    assert.equal(res.entitlement, 'pro');

    const updated = await storage.getUser(testUser.id);
    assert.equal(updated.entitlement, 'pro');
    assert.equal(isUserPro(updated), true);
  });

  await t.test('processes EXPIRATION and revokes Pro', async () => {
    const payload = {
      event: {
        type: 'EXPIRATION',
        app_user_id: testUser.id
      }
    };

    const res = await handleRevenueCatWebhook(payload, 'Bearer secret_key_123', 'secret_key_123');
    assert.equal(res.ok, true);
    assert.equal(res.entitlement, 'free');

    const updated = await storage.getUser(testUser.id);
    assert.equal(updated.entitlement, 'free');
    assert.equal(isUserPro(updated), false);
  });

  await t.test('isUserPro checks expiry date', () => {
    assert.equal(isUserPro(null), false);
    assert.equal(isUserPro({ entitlement: 'free' }), false);
    assert.equal(isUserPro({ entitlement: 'pro', entitlementExpiresAt: new Date(Date.now() + 100000).toISOString() }), true);
    assert.equal(isUserPro({ entitlement: 'pro', entitlementExpiresAt: new Date(Date.now() - 100000).toISOString() }), false);
  });

  // Cleanup
  await storage.deleteUser(testUser.id);
});
