import { describe, it, expect, vi } from 'vitest';
import {
  signInWithGoogle,
  signInWithApple,
  authenticateWithEmailPassword,
  parseJwtPayload,
  initGoogleOAuthClient,
  isGoogleGsiAvailable,
  verifyGoogleTokenWithOAuthServer,
  GOOGLE_OAUTH_SERVER,
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKENINFO_URL,
  GOOGLE_OAUTH_USERINFO_URL,
  GOOGLE_CLIENT_ID
} from './google-auth.js';

describe('Google & Social Authentication', () => {
  it('exposes official Google OAuth 2.0 server configuration and endpoints', () => {
    expect(GOOGLE_OAUTH_SERVER).toBe('https://accounts.google.com');
    expect(GOOGLE_OAUTH_AUTH_URL).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(GOOGLE_OAUTH_TOKENINFO_URL).toBe('https://oauth2.googleapis.com/tokeninfo');
    expect(GOOGLE_OAUTH_USERINFO_URL).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    expect(GOOGLE_CLIENT_ID).toContain('googleusercontent.com');
  });

  it('signs in with Google and returns authenticated user object with OAuth 2.0 server attribution', async () => {
    const user = await signInWithGoogle({
      name: 'Alex Johnson',
      email: 'alex@gmail.com'
    });

    expect(user.id).toMatch(/^google_/);
    expect(user.name).toBe('Alex Johnson');
    expect(user.email).toBe('alex@gmail.com');
    expect(user.provider).toBe('google');
    expect(user.oauthServer).toBe('https://accounts.google.com');
    expect(user.authProvider).toContain('Google OAuth 2.0');
    expect(user.verified).toBe(true);
  });

  it('initializes Google OAuth 2.0 token client when GIS is present', () => {
    const mockInitTokenClient = vi.fn().mockReturnValue({ requestAccessToken: vi.fn() });
    const originalWindow = globalThis.window;
    globalThis.window = {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: mockInitTokenClient
          }
        }
      }
    };

    expect(isGoogleGsiAvailable()).toBe(true);

    const client = initGoogleOAuthClient(vi.fn());
    expect(mockInitTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile'
      })
    );
    expect(client).toBeDefined();

    // Clean up
    if (originalWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  });

  it('signs in with Apple and returns structured Apple user object', async () => {
    const user = await signInWithApple();
    expect(user.id).toMatch(/^apple_/);
    expect(user.provider).toBe('apple');
    expect(user.verified).toBe(true);
  });

  it('validates email and password length', async () => {
    await expect(authenticateWithEmailPassword('invalid-email', '123456')).rejects.toThrow('valid email');
    await expect(authenticateWithEmailPassword('test@example.com', '123')).rejects.toThrow('at least 6 characters');
  });

  it('successfully creates email authenticated user profile', async () => {
    const user = await authenticateWithEmailPassword('lifter@fitness.com', 'password123', true, 'Fitness Pro');
    expect(user.email).toBe('lifter@fitness.com');
    expect(user.name).toBe('Fitness Pro');
    expect(user.provider).toBe('email');
    expect(user.verified).toBe(true);
  });

  it('parses valid JWT token payloads', () => {
    const payload = { sub: '12345', name: 'Google Lifter', email: 'user@gmail.com' };
    const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const token = `header.${b64Payload}.signature`;

    const parsed = parseJwtPayload(token);
    expect(parsed).toEqual(payload);
  });
});
