// Exercise substitution ranking logic (Task 14).
// Ranks candidate exercises by target muscle, secondary muscle overlap,
// movement pattern, and equipment similarity.

import { EXDB } from './exercises-data.js';
import { ALIAS } from './muscles.js';

export const EQUIPMENT_AFFINITY = {
  barbell: {
    dumbbell: 22,
    'leverage machine': 20,
    cable: 16,
    'smith machine': 18,
    barbell: 15
  },
  dumbbell: {
    barbell: 22,
    'leverage machine': 20,
    cable: 18,
    dumbbell: 15
  },
  'leverage machine': {
    cable: 22,
    dumbbell: 20,
    barbell: 18,
    'leverage machine': 15
  },
  cable: {
    'leverage machine': 22,
    dumbbell: 20,
    cable: 15
  },
  'body weight': {
    assisted: 22,
    weighted: 20,
    'body weight': 15
  }
};

const MOVEMENT_PATTERNS = [
  'bench press', 'chest press', 'incline press', 'decline press',
  'overhead press', 'shoulder press', 'military press',
  'squat', 'front squat', 'leg press', 'hack squat',
  'deadlift', 'romanian deadlift', 'stiff leg deadlift',
  'lat pulldown', 'pull-up', 'chin-up',
  'barbell row', 'dumbbell row', 'cable row', 'seated row',
  'biceps curl', 'hammer curl', 'preacher curl',
  'triceps extension', 'skull crusher', 'pushdown', 'dip',
  'lateral raise', 'front raise', 'reverse fly', 'fly',
  'leg curl', 'leg extension', 'calf raise', 'hip thrust'
];

const MOVEMENT_ROOTS = [
  'press', 'squat', 'deadlift', 'row', 'curl', 'extension', 'pulldown',
  'pull-up', 'chin-up', 'fly', 'thrust', 'raise', 'dip', 'shrug'
];

function normalizeSlug(muscle) {
  if (!muscle) return null;
  const raw = String(muscle).toLowerCase().trim();
  return ALIAS[raw] || raw;
}

function scoreExercise(orig, candidate) {
  let score = 0;

  const origTgSlug = normalizeSlug(orig.tg);
  const candTgSlug = normalizeSlug(candidate.tg);

  // 1. Target Muscle & Body Part Match
  if (orig.tg && candidate.tg && orig.tg.toLowerCase() === candidate.tg.toLowerCase()) {
    score += 100; // exact text match in dataset (e.g. 'pectorals')
  } else if (origTgSlug && candTgSlug && origTgSlug === candTgSlug) {
    score += 85;  // semantic slug match via ALIAS (e.g. 'pectorals' ~ 'chest')
  } else if (orig.bp && candidate.bp && orig.bp.toLowerCase() === candidate.bp.toLowerCase()) {
    score += 40;  // same body part
  } else {
    // If neither the muscle target nor body part matches, this is not a suitable substitute
    return -1;
  }

  // 2. Secondary Muscles Overlap
  const origSmSlugs = (orig.sm || []).map(normalizeSlug).filter(Boolean);
  const candSmSlugs = (candidate.sm || []).map(normalizeSlug).filter(Boolean);

  let smOverlapCount = 0;
  for (const slug of candSmSlugs) {
    if (origSmSlugs.includes(slug)) {
      smOverlapCount++;
    }
  }
  score += smOverlapCount * 15;

  // Cross-match: candidate secondary helps orig target, or vice versa
  if (candSmSlugs.includes(origTgSlug)) score += 10;
  if (origSmSlugs.includes(candTgSlug)) score += 10;

  // 3. Movement Pattern & Keyword Match
  const origName = String(orig.n || '').toLowerCase();
  const candName = String(candidate.n || '').toLowerCase();

  for (const pattern of MOVEMENT_PATTERNS) {
    if (origName.includes(pattern) && candName.includes(pattern)) {
      score += 35;
      break;
    }
  }

  // Cross-pattern synonyms (e.g., bench press and chest press)
  const isOrigBenchPress = origName.includes('bench press') || origName.includes('chest press');
  const isCandBenchPress = candName.includes('bench press') || candName.includes('chest press');
  if (isOrigBenchPress && isCandBenchPress) {
    score += 30;
  }

  for (const root of MOVEMENT_ROOTS) {
    if (origName.includes(root) && candName.includes(root)) {
      score += 15;
      break;
    }
  }

  // 4. Equipment Similarity & Preferred Substitutes
  const affinity = EQUIPMENT_AFFINITY[orig.eq]?.[candidate.eq];
  if (affinity) {
    score += affinity;
  } else if (orig.eq && candidate.eq && orig.eq === candidate.eq) {
    score += 12; // same equipment
  }

  return score;
}

/**
 * Finds and ranks exercise substitutes for an exercise.
 *
 * @param {string|object} exIdOrObj - Exercise ID or exercise object to find substitutes for
 * @param {object} [options]
 * @param {string[]|Set<string>} [options.equipmentAllowed] - Filter by allowed equipment types
 * @param {number} [options.limit=10] - Maximum number of substitutes to return
 * @param {Array} [options.customEx=[]] - Custom user exercises to include
 * @param {Array} [options.database=EXDB] - Exercise database
 * @returns {Array<object>} Ranked list of substitute exercises
 */
export function findSubstitutes(exIdOrObj, options = {}) {
  const {
    equipmentAllowed,
    limit = 10,
    customEx = [],
    database = EXDB
  } = options;

  const catalog = [...customEx, ...database];

  let orig = null;
  if (typeof exIdOrObj === 'object' && exIdOrObj !== null) {
    orig = exIdOrObj;
  } else {
    orig = catalog.find(e => e.id === exIdOrObj);
  }

  if (!orig) return [];

  const allowedEq = equipmentAllowed
    ? (equipmentAllowed instanceof Set
        ? new Set([...equipmentAllowed].map(s => String(s).toLowerCase().trim()))
        : new Set(equipmentAllowed.map(s => String(s).toLowerCase().trim())))
    : null;

  const candidates = [];

  for (const cand of catalog) {
    // 1. Never return the original exercise
    if (cand.id === orig.id) continue;

    // 2. Respect equipment filter if present
    if (allowedEq && allowedEq.size > 0) {
      const eq = String(cand.eq || '').toLowerCase().trim();
      if (!allowedEq.has(eq)) continue;
    }

    const score = scoreExercise(orig, cand);
    if (score > 0) {
      candidates.push({ exercise: cand, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.exercise.n.localeCompare(b.exercise.n));

  if (options.includeScores) {
    return candidates.slice(0, Math.max(1, limit));
  }

  return candidates.slice(0, Math.max(1, limit)).map(c => c.exercise);
}

export function rankSubstitutes(exIdOrObj, catalog, options = {}) {
  return findSubstitutes(exIdOrObj, { ...options, database: catalog || EXDB, includeScores: true });
}

import { generateGeminiExerciseSubstitutes } from './gemini.js';

/**
 * AI-powered exercise substitution with kinesiology system prompt and fallback
 */
export async function findAiSubstitutes(exIdOrObj, options = {}) {
  const localCandidates = findSubstitutes(exIdOrObj, options);
  const orig = resolveExercise(exIdOrObj, options.database || EXDB);
  if (!orig) return localCandidates;

  try {
    const aiSubs = await generateGeminiExerciseSubstitutes({
      exerciseName: orig.n || orig.name || String(exIdOrObj),
      targetMuscle: orig.t || 'target',
      equipmentAvailable: options.equipment || ['dumbbell', 'barbell', 'cable', 'machine', 'body weight'],
      reason: options.reason || 'alternative equipment or biomechanical variation'
    });

    if (Array.isArray(aiSubs) && aiSubs.length > 0) {
      return aiSubs;
    }
  } catch (err) {
    console.warn('Gemini Substitute Engine fallback to local ranking:', err.message);
  }
  return localCandidates;
}

