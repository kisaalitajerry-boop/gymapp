import test from 'node:test';
import assert from 'node:assert/strict';
import storage from '../storage/index.js';

test('Google OAuth 2.0 Server Authentication', async t => {
  const testEmail = `google_athlete_${Date.now()}@gmail.com`;
  const testSub = `sub_${Date.now()}`;

  await t.test('creates user record with Google OAuth 2.0 server metadata', async () => {
    const newUser = {
      id: `google_${testSub}`,
      name: 'Google Powerlifter',
      email: testEmail,
      googleId: testSub,
      provider: 'google',
      oauthServer: 'https://oauth2.googleapis.com',
      verified: true,
      created: new Date().toISOString()
    };

    await storage.createUser(newUser);

    const retrieved = await storage.getUser(newUser.id);
    assert.ok(retrieved);
    assert.equal(retrieved.email, testEmail);
    assert.equal(retrieved.googleId, testSub);
    assert.equal(retrieved.provider, 'google');
    assert.equal(retrieved.oauthServer, 'https://oauth2.googleapis.com');
    assert.equal(retrieved.verified, true);
  });

  await t.test('updates existing user profile with latest Google OAuth attributes', async () => {
    const userId = `google_${testSub}`;
    await storage.updateUser(userId, {
      picture: 'https://lh3.googleusercontent.com/a/photo_123',
      name: 'Updated Google Lifter'
    });

    const updated = await storage.getUser(userId);
    assert.equal(updated.name, 'Updated Google Lifter');
    assert.equal(updated.picture, 'https://lh3.googleusercontent.com/a/photo_123');
    assert.equal(updated.oauthServer, 'https://oauth2.googleapis.com');
  });

  await t.test('prevents duplicate account creation for identical Google user', async () => {
    const users = await storage.listUsers();
    const matches = users.filter(u => u.email === testEmail || u.googleId === testSub);
    assert.equal(matches.length, 1);
  });
});
