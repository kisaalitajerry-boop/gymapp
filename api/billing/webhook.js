import storage from '../storage/index.js';

export const PRO_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION'
]);

export const REVOKE_EVENTS = new Set([
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED'
]);

/**
 * Verifies and handles RevenueCat webhook event.
 * @param {object} payload - Webhook JSON body
 * @param {string} authHeader - Authorization header from request
 * @param {string} expectedAuth - Configured shared secret
 */
export async function handleRevenueCatWebhook(payload, authHeader, expectedAuth) {
  if (expectedAuth) {
    const bearer = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (bearer !== expectedAuth.trim()) {
      const err = new Error('Unauthorized webhook signature');
      err.statusCode = 401;
      throw err;
    }
  }

  const event = payload?.event;
  if (!event) {
    const err = new Error('Invalid payload: missing event');
    err.statusCode = 400;
    throw err;
  }

  const userId = event.app_user_id;
  if (!userId) {
    return { ok: true, ignored: 'no_app_user_id' };
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return { ok: true, ignored: 'user_not_found' };
  }

  const eventType = event.type;
  let entitlement = user.entitlement || 'free';
  let expiresAt = user.entitlementExpiresAt || null;

  if (PRO_EVENTS.has(eventType)) {
    entitlement = 'pro';
    expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  } else if (REVOKE_EVENTS.has(eventType)) {
    entitlement = 'free';
    expiresAt = null;
  }

  await storage.updateUser(userId, {
    entitlement,
    entitlementExpiresAt: expiresAt
  });

  return { ok: true, userId, entitlement, eventType };
}

/**
 * Checks if a user has an active Pro entitlement.
 */
export function isUserPro(user) {
  if (!user) return false;
  if (user.entitlement !== 'pro') return false;
  if (user.entitlementExpiresAt) {
    const exp = new Date(user.entitlementExpiresAt).getTime();
    if (!isNaN(exp) && exp < Date.now()) return false;
  }
  return true;
}
