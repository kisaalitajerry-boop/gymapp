import { describe, it, expect } from 'vitest';
import { TIERS, FEATURES, canUse, getActiveTier } from './entitlements.js';

describe('entitlements', () => {
  describe('getActiveTier', () => {
    it('defaults to free for null, undefined, or empty', () => {
      expect(getActiveTier(null)).toBe(TIERS.FREE);
      expect(getActiveTier(undefined)).toBe(TIERS.FREE);
      expect(getActiveTier('')).toBe(TIERS.FREE);
    });

    it('handles string tier representations', () => {
      expect(getActiveTier('pro')).toBe(TIERS.PRO);
      expect(getActiveTier('PRO')).toBe(TIERS.PRO);
      expect(getActiveTier('free')).toBe(TIERS.FREE);
      expect(getActiveTier('guest')).toBe(TIERS.FREE);
    });

    it('recognizes active object entitlement', () => {
      expect(getActiveTier({ tier: 'pro' })).toBe(TIERS.PRO);
      expect(getActiveTier({ isActive: true })).toBe(TIERS.PRO);
      expect(getActiveTier({ active: true, tier: 'pro' })).toBe(TIERS.PRO);
    });

    it('falls back to free when inactive or expired', () => {
      const now = 1700000000000;
      // explicitly inactive
      expect(getActiveTier({ tier: 'pro', active: false }, now)).toBe(TIERS.FREE);
      expect(getActiveTier({ tier: 'pro', isActive: false }, now)).toBe(TIERS.FREE);

      // expired timestamp
      expect(getActiveTier({ tier: 'pro', expiresAt: now - 1000 }, now)).toBe(TIERS.FREE);
      expect(getActiveTier({ tier: 'pro', expirationDate: new Date(now - 1000).toISOString() }, now)).toBe(TIERS.FREE);

      // valid future timestamp
      expect(getActiveTier({ tier: 'pro', expiresAt: now + 10000 }, now)).toBe(TIERS.PRO);
      expect(getActiveTier({ tier: 'pro', expirationDate: new Date(now + 10000).toISOString() }, now)).toBe(TIERS.PRO);
    });
  });

  describe('canUse', () => {
    it('allows free features for free users', () => {
      expect(canUse(FEATURES.WORKOUT_LOGGING, TIERS.FREE)).toBe(true);
      expect(canUse(FEATURES.MANUAL_WATER, null)).toBe(true);
      expect(canUse(FEATURES.PLATE_CALCULATOR, 'free')).toBe(true);
      expect(canUse(FEATURES.EXERCISE_SUBSTITUTION, undefined)).toBe(true);
    });

    it('blocks pro features for free users', () => {
      expect(canUse(FEATURES.SURVEY_PROGRAMS, TIERS.FREE)).toBe(false);
      expect(canUse(FEATURES.MEAL_PHOTO, null)).toBe(false);
      expect(canUse(FEATURES.AI_COACH, 'free')).toBe(false);
      expect(canUse(FEATURES.RECOVERY_MAP, undefined)).toBe(false);
      expect(canUse(FEATURES.HEALTH_SYNC, { tier: 'free' })).toBe(false);
    });

    it('allows pro features for active pro subscribers', () => {
      expect(canUse(FEATURES.SURVEY_PROGRAMS, TIERS.PRO)).toBe(true);
      expect(canUse(FEATURES.MEAL_PHOTO, { tier: 'pro' })).toBe(true);
      expect(canUse(FEATURES.AI_COACH, { isActive: true })).toBe(true);
      expect(canUse(FEATURES.RECOVERY_MAP, { tier: 'pro', expiresAt: Date.now() + 100000 })).toBe(true);
      expect(canUse(FEATURES.HEALTH_SYNC, 'pro')).toBe(true);
      expect(canUse(FEATURES.ADAPTIVE_TDEE, 'pro')).toBe(true);
    });

    it('blocks pro features when subscription is expired', () => {
      const now = 1700000000000;
      const expired = { tier: 'pro', expiresAt: now - 5000 };
      expect(canUse(FEATURES.SURVEY_PROGRAMS, expired, now)).toBe(false);
      expect(canUse(FEATURES.AI_COACH, expired, now)).toBe(false);
      // but free features still work!
      expect(canUse(FEATURES.WORKOUT_LOGGING, expired, now)).toBe(true);
    });

    it('fails closed for unknown features', () => {
      expect(canUse('non_existent_feature', TIERS.PRO)).toBe(false);
      expect(canUse('non_existent_feature', TIERS.FREE)).toBe(false);
    });
  });
});
