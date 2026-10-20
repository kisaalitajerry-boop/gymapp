// Intermittent Fasting Engine for MuscleTrack / Cal AI

export const FASTING_PROTOCOLS = [
  { id: '16:8', label: '16:8 Lean Gains', fastHours: 16, eatHours: 8, desc: 'Most popular protocol for body composition & metabolic flexibility.' },
  { id: '18:6', label: '18:6 Fast Track', fastHours: 18, eatHours: 6, desc: 'Deeper fat oxidation & heightened insulin sensitivity.' },
  { id: '14:10', label: '14:10 Circadian', fastHours: 14, eatHours: 10, desc: 'Gentle daily circadian rhythm reset for healthy digestion.' },
  { id: '20:4', label: '20:4 Warrior', fastHours: 20, eatHours: 4, desc: 'Advanced intermittent fasting with single eating window.' }
];

export const DEFAULT_FASTING = {
  active: false,
  startTime: null,
  targetHours: 16,
  protocol: '16:8',
  history: []
};

/**
 * Returns metabolic stage based on elapsed fasting hours.
 */
export function getMetabolicStage(elapsedHours) {
  if (elapsedHours < 4) {
    return { name: 'Anabolic / Digestion', desc: 'Processing nutrients and glycogen storage', color: '#38bdf8' };
  } else if (elapsedHours < 12) {
    return { name: 'Blood Sugar Reset', desc: 'Insulin levels dropping, digestion rested', color: '#818cf8' };
  } else if (elapsedHours < 16) {
    return { name: 'Fat Oxidation Active', desc: 'Accelerated adipose fatty acid mobilization', color: '#10b981' };
  } else {
    return { name: 'Autophagy & Peak Ketones', desc: 'Cellular cleanup and sustained mental clarity', color: '#f59e0b' };
  }
}

/**
 * Computes live elapsed time, percentage, countdown, and stage.
 */
export function calculateFastingProgress(fasting = DEFAULT_FASTING, now = Date.now()) {
  if (!fasting || !fasting.active || !fasting.startTime) {
    return {
      active: false,
      elapsedHours: 0,
      elapsedMinutes: 0,
      percent: 0,
      isCompleted: false,
      targetHours: fasting?.targetHours || 16,
      stage: getMetabolicStage(0)
    };
  }

  const elapsedMs = Math.max(0, now - Number(fasting.startTime));
  const targetMs = (fasting.targetHours || 16) * 3600 * 1000;
  const elapsedHours = Math.floor(elapsedMs / (3600 * 1000));
  const elapsedMinutes = Math.floor((elapsedMs % (3600 * 1000)) / (60 * 1000));

  const remainingMs = Math.max(0, targetMs - elapsedMs);
  const remainingHours = Math.floor(remainingMs / (3600 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));

  const percent = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
  const isCompleted = elapsedMs >= targetMs;
  const stage = getMetabolicStage(elapsedMs / (3600 * 1000));

  return {
    active: true,
    elapsedMs,
    elapsedHours,
    elapsedMinutes,
    remainingMs,
    remainingHours,
    remainingMinutes,
    percent,
    isCompleted,
    targetHours: fasting.targetHours || 16,
    stage
  };
}
