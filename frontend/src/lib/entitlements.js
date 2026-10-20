// Pure entitlements matrix and gating functions.
// Keeps Free vs Pro rules in one testable module.

export const TIERS = {
  FREE: 'free',
  PRO: 'pro'
};

export const FEATURES = {
  // Free features
  WORKOUT_LOGGING: 'workout_logging',
  DEFAULT_PLANS: 'default_plans',
  MANUAL_WATER: 'manual_water',
  MANUAL_FOOD: 'manual_food',
  EXERCISE_SEARCH: 'exercise_search',
  PLATE_CALCULATOR: 'plate_calculator',
  EXERCISE_SUBSTITUTION: 'exercise_substitution',

  // Pro features
  SURVEY_PROGRAMS: 'survey_programs',
  MEAL_PHOTO: 'meal_photo',
  ADAPTIVE_TDEE: 'adaptive_tdee',
  WEEKLY_CHECKIN: 'weekly_checkin',
  HEALTH_SYNC: 'health_sync',
  RECOVERY_MAP: 'recovery_map',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AI_COACH: 'ai_coach'
};

export const FEATURE_TIERS = {
  [FEATURES.WORKOUT_LOGGING]: TIERS.FREE,
  [FEATURES.DEFAULT_PLANS]: TIERS.FREE,
  [FEATURES.MANUAL_WATER]: TIERS.FREE,
  [FEATURES.MANUAL_FOOD]: TIERS.FREE,
  [FEATURES.EXERCISE_SEARCH]: TIERS.FREE,
  [FEATURES.PLATE_CALCULATOR]: TIERS.FREE,
  [FEATURES.EXERCISE_SUBSTITUTION]: TIERS.FREE,

  [FEATURES.SURVEY_PROGRAMS]: TIERS.PRO,
  [FEATURES.MEAL_PHOTO]: TIERS.PRO,
  [FEATURES.ADAPTIVE_TDEE]: TIERS.PRO,
  [FEATURES.WEEKLY_CHECKIN]: TIERS.PRO,
  [FEATURES.HEALTH_SYNC]: TIERS.PRO,
  [FEATURES.RECOVERY_MAP]: TIERS.PRO,
  [FEATURES.ADVANCED_ANALYTICS]: TIERS.PRO,
  [FEATURES.AI_COACH]: TIERS.PRO
};

/**
 * Resolves effective tier given an entitlement string or object.
 * Handles RevenueCat customer info shapes, expiry dates, and invalid states.
 */
export function getActiveTier(entitlement, now = Date.now()) {
  if (!entitlement) return TIERS.FREE;

  if (typeof entitlement === 'string') {
    return entitlement.toLowerCase() === TIERS.PRO ? TIERS.PRO : TIERS.FREE;
  }

  // Boolean flag explicitly false
  if (entitlement.isActive === false || entitlement.active === false) {
    return TIERS.FREE;
  }

  // Check expiration if present
  const exp = entitlement.expiresAt ?? entitlement.expirationDate;
  if (exp !== undefined && exp !== null) {
    const expTime = typeof exp === 'string' ? new Date(exp).getTime() : Number(exp);
    if (!isNaN(expTime) && expTime <= now) {
      return TIERS.FREE;
    }
  }

  const tier = String(entitlement.tier || (entitlement.isActive ? TIERS.PRO : TIERS.FREE)).toLowerCase();
  return tier === TIERS.PRO ? TIERS.PRO : TIERS.FREE;
}

/**
 * Evaluates whether a user with given entitlement has access to a feature.
 */
export function canUse(feature, entitlement, now = Date.now()) {
  const required = FEATURE_TIERS[feature];
  if (!required) return false; // unknown features fail closed
  if (required === TIERS.FREE) return true;
  return getActiveTier(entitlement, now) === TIERS.PRO;
}
