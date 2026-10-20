// Muscle recovery and fatigue model (Task 29).
// Computes per-muscle fatigue from recent workout volume and effort,
// modeling physiological recovery decay over time (24h - 72h).

import { MUSCLES, musclesOf } from './muscles.js';
import { EXIDX } from './exercises.js';

export const RECOVERY_STATUS = {
  READY: { label: 'Ready', color: '#10b981', min: 70 },
  NEARLY_READY: { label: 'Ready', color: '#10b981', min: 70 },
  RECOVERING: { label: 'Recovering', color: '#f59e0b', min: 40 },
  REST: { label: 'Rest', color: '#ef4444', min: 0 }
};

export const BODY_GROUPS = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Arms: ['biceps', 'triceps', 'forearm'],
  Legs: ['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors']
};

export function getStatus(percent) {
  if (percent >= 70) return RECOVERY_STATUS.READY;
  if (percent >= 40) return RECOVERY_STATUS.RECOVERING;
  return RECOVERY_STATUS.REST;
}

/**
 * Calculates recovery percentage for each muscle based on completed workouts.
 *
 * @param {Array} workouts - Workout history array
 * @param {number} [nowMs=Date.now()] - Current timestamp
 * @param {object} [options]
 * @param {number} [options.fullRecoveryHours=72] - Hours for full baseline recovery
 * @returns {object} { muscles: { [slug]: { percent, status, lastTrainedHours, hoursUntilFull } }, groups: { [name]: { percent, status } }, overall: number }
 */
export function computeMuscleRecovery(workouts = [], nowMs = Date.now(), options = {}) {
  const fullRecoveryHours = options.fullRecoveryHours || 72;
  const HALF_LIFE_HOURS = 28; // Fatigue half-life in hours

  // Initialize fatigue per muscle
  const fatigue = {};
  const lastTrainedAt = {};
  for (const m of MUSCLES) {
    fatigue[m] = 0;
    lastTrainedAt[m] = 0;
  }

  // Look back up to 7 days
  const cutoff = nowMs - 7 * 86400000;
  const recentWorkouts = (workouts || []).filter(w => {
    const t = w.end || w.start || (w.d ? new Date(w.d).getTime() : 0);
    return t >= cutoff && t <= nowMs;
  });

  for (const w of recentWorkouts) {
    const workoutTime = w.end || w.start || new Date(w.d).getTime();
    const hoursAgo = Math.max(0, (nowMs - workoutTime) / 3600000);

    for (const entry of (w.entries || [])) {
      const ex = EXIDX[entry.id];
      if (!ex) continue;
      const mWeights = musclesOf(ex);

      // Count completed sets
      const doneSets = (entry.sets || []).filter(s => s.done).length;
      if (!doneSets) continue;

      for (const [slug, weight] of Object.entries(mWeights)) {
        if (fatigue[slug] === undefined) continue;

        // Record last trained
        if (workoutTime > lastTrainedAt[slug]) {
          lastTrainedAt[slug] = workoutTime;
        }

        // Base fatigue: ~12.5% per full-effort target set, decaying over ~30h half-life.
        // A 5-set session yields ~63% initial fatigue -> ~61% recovery at 24h.
        const addedFatigue = doneSets * weight * 12.5;
        const decayedFatigue = addedFatigue * Math.pow(0.5, hoursAgo / HALF_LIFE_HOURS);
        fatigue[slug] += decayedFatigue;
      }
    }
  }

  const muscles = {};
  for (const m of MUSCLES) {
    // Clamp fatigue to 0 - 100
    const currentFatigue = Math.min(100, fatigue[m]);
    const percent = Math.max(0, Math.min(100, Math.round(100 - currentFatigue)));
    const status = getStatus(percent);

    const lastTime = lastTrainedAt[m];
    const lastTrainedHours = lastTime ? Math.round((nowMs - lastTime) / 3600000) : null;

    // Remaining hours needed to reach 85% (Ready)
    let hoursUntilReady = 0;
    if (percent < 85) {
      const neededDecay = currentFatigue / 15; // reaches 85% recovery when fatigue falls to 15%
      if (neededDecay > 1) {
        hoursUntilReady = Math.round(HALF_LIFE_HOURS * Math.log2(neededDecay));
      }
    }

    muscles[m] = {
      percent,
      status,
      lastTrainedHours,
      hoursUntilReady
    };
  }

  // Calculate body groups (Chest, Back, Shoulders, Arms, Legs)
  // Uses prime-mover minimum weighted with average so one fatigued muscle flags the group
  const groups = {};
  for (const [groupName, groupSlugs] of Object.entries(BODY_GROUPS)) {
    const relevant = groupSlugs.map(s => muscles[s]?.percent).filter(p => p !== undefined);
    if (!relevant.length) {
      groups[groupName] = { percent: 100, status: RECOVERY_STATUS.READY };
      continue;
    }
    const minVal = Math.min(...relevant);
    const avgVal = relevant.reduce((a, b) => a + b, 0) / relevant.length;
    // Weighted 65% towards most fatigued component
    const score = Math.round(minVal * 0.65 + avgVal * 0.35);
    groups[groupName] = {
      percent: score,
      status: getStatus(score)
    };
  }

  // Overall recovery percentage
  const groupScores = Object.values(groups).map(g => g.percent);
  const overall = groupScores.length ? Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length) : 100;

  // Daily recommendation based on recovered groups
  const readyGroups = Object.entries(groups)
    .filter(([_, g]) => g.percent >= 85)
    .map(([name]) => name);

  let recommendation = 'Full Body or Light Cardio';
  if (readyGroups.length >= 2) {
    recommendation = `Train ${readyGroups[0]} + ${readyGroups[1]}`;
  } else if (readyGroups.length === 1) {
    recommendation = `Train ${readyGroups[0]}`;
  } else if (overall < 50) {
    recommendation = 'Rest & Active Recovery';
  }

  return {
    muscles,
    groups,
    overall,
    recommendation
  };
}
