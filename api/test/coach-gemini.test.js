import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiAdapter } from '../coach/adapters/gemini.js';
import { adapterFor } from '../coach/adapters/index.js';
import { PROVIDERS } from '../coach/config.js';

test('Gemini Coach Adapter', async t => {
  await t.test('is registered in PROVIDERS and adapter registry', () => {
    assert.ok(PROVIDERS.gemini);
    assert.equal(PROVIDERS.gemini.runtime, 'Gemini API');
    assert.equal(PROVIDERS.gemini.apiKeyEnv, 'GEMINI_API_KEY');

    const adapter = adapterFor('gemini');
    assert.ok(adapter);
  });

  await t.test('check() requires GEMINI_API_KEY', async () => {
    const adapter = new GeminiAdapter();
    const withoutKey = await adapter.check({}, {});
    assert.equal(withoutKey.ok, false);
    assert.ok(withoutKey.error.includes('GEMINI_API_KEY'));

    const withKey = await adapter.check({}, { GEMINI_API_KEY: 'test-fake-key' });
    assert.equal(withKey.ok, true);
    assert.ok(withKey.version);
  });

  await t.test('invoke() handles successful structured JSON response from mocked fetch', async () => {
    const expectedJson = JSON.stringify({
      routines: [{ id: 'r1', name: 'Chest & Back', ex: [] }]
    });

    const mockFetch = async (url, options) => {
      assert.ok(url.includes('generateContent'));
      assert.ok(url.includes('key=test-key-abc'));
      const parsedBody = JSON.parse(options.body);
      assert.equal(parsedBody.generationConfig.responseMimeType, 'application/json');

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            candidates: [
              {
                content: {
                  parts: [{ text: expectedJson }]
                }
              }
            ]
          };
        }
      };
    };

    const adapter = new GeminiAdapter({ fetchFn: mockFetch });
    const res = await adapter.invoke({
      prompt: 'Create a 3-day workout plan',
      jobDir: '/tmp',
      env: { GEMINI_API_KEY: 'test-key-abc' }
    });

    assert.equal(res.code, 0);
    assert.equal(res.text, expectedJson);
    assert.equal(res.stderr, '');
    assert.equal(res.timedOut, false);
  });

  await t.test('invoke() surfaces API errors cleanly without crashing', async () => {
    const mockFetch = async () => {
      return {
        ok: false,
        status: 400,
        async text() {
          return 'API_KEY_INVALID: Key not found';
        }
      };
    };

    const adapter = new GeminiAdapter({ fetchFn: mockFetch });
    const res = await adapter.invoke({
      prompt: 'Review plan',
      jobDir: '/tmp',
      env: { GEMINI_API_KEY: 'bad-key' }
    });

    assert.equal(res.code, 400);
    assert.equal(res.text, '');
    assert.ok(res.stderr.includes('400'));
    assert.ok(res.stderr.includes('API_KEY_INVALID'));
  });
});
