import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMealPhoto, checkAndIncrementQuota } from '../ai/meal-photo.js';

test('Meal Photo AI Endpoint', async t => {
  const proUser = { id: 'u_pro', entitlement: 'pro', entitlementExpiresAt: null };
  const freeUser = { id: 'u_free', entitlement: 'free' };

  await t.test('rejects Free user with 402', async () => {
    const res = await handleMealPhoto({
      user: freeUser,
      body: { image: 'data:image/jpeg;base64,abc123' },
      env: { GEMINI_API_KEY: 'test-key' }
    });
    assert.equal(res.status, 402);
    assert.match(res.error, /Pro subscription required/i);
  });

  await t.test('rejects missing image payload with 400', async () => {
    const res = await handleMealPhoto({
      user: proUser,
      body: {},
      env: { GEMINI_API_KEY: 'test-key' }
    });
    assert.equal(res.status, 400);
    assert.match(res.error, /Missing image/i);
  });

  await t.test('enforces daily quota with 429', async () => {
    const quotaStore = new Map();
    // Simulate hitting limit of 2
    checkAndIncrementQuota('u_quota', 2, quotaStore);
    checkAndIncrementQuota('u_quota', 2, quotaStore);

    const res = await handleMealPhoto({
      user: { id: 'u_quota', entitlement: 'pro' },
      body: { image: 'data:image/jpeg;base64,abc' },
      env: { GEMINI_API_KEY: 'test-key', MEAL_PHOTO_DAILY_LIMIT: '2' },
      customQuotaStore: quotaStore
    });

    assert.equal(res.status, 429);
    assert.match(res.error, /limit reached/i);
  });

  await t.test('handles malformed LLM response with 502', async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'NOT VALID JSON' }] } }]
      })
    });

    const res = await handleMealPhoto({
      user: proUser,
      body: { image: 'data:image/jpeg;base64,abc' },
      env: { GEMINI_API_KEY: 'test-key' },
      fetchFn: mockFetch,
      customQuotaStore: new Map()
    });

    assert.equal(res.status, 502);
    assert.match(res.error, /Malformed AI response/i);
  });

  await t.test('handles schema validation failure with 502', async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ wrongField: 123 }) }] } }]
      })
    });

    const res = await handleMealPhoto({
      user: proUser,
      body: { image: 'data:image/jpeg;base64,abc' },
      env: { GEMINI_API_KEY: 'test-key' },
      fetchFn: mockFetch,
      customQuotaStore: new Map()
    });

    assert.equal(res.status, 502);
    assert.match(res.error, /expected nutritional schema/i);
  });

  await t.test('returns 200 with validated meal items on success', async () => {
    const validMeal = {
      items: [
        {
          name: 'Grilled Salmon with Brown Rice',
          grams: 350,
          kcal: 540,
          p: 42,
          c: 48,
          f: 18,
          confidence: 0.95
        }
      ]
    };

    const mockFetch = async (url, opts) => {
      assert.match(url, /generateContent/);
      const parsedBody = JSON.parse(opts.body);
      assert.equal(parsedBody.contents[0].parts[1].inlineData.mimeType, 'image/png');
      assert.equal(parsedBody.contents[0].parts[1].inlineData.data, 'XYZ12345');

      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(validMeal) }] } }]
        })
      };
    };

    const res = await handleMealPhoto({
      user: proUser,
      body: { image: 'data:image/png;base64,XYZ12345' },
      env: { GEMINI_API_KEY: 'test-key' },
      fetchFn: mockFetch,
      customQuotaStore: new Map()
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.items.length, 1);
    assert.equal(res.data.items[0].name, 'Grilled Salmon with Brown Rice');
    assert.equal(res.data.items[0].kcal, 540);
    assert.equal(res.data.items[0].p, 42);
  });
});
