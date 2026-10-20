// Adaptive TDEE (Total Daily Energy Expenditure) estimation using EWMA weight smoothing
// and energy balance mechanics (~7700 kcal per 1 kg of body mass change).

export const KCAL_PER_KG = 7700;
export const MIN_DAYS_REQUIRED = 10;

/**
 * Calculates exponentially weighted moving average (EWMA).
 * @param {Array<{date: string, weight: number}>} weighIns - Sorted chronologically
 * @param {number} alpha - Smoothing factor (default 0.1 for ~10-day half-life)
 */
export function ewmaWeight(weighIns, alpha = 0.1) {
  if (!weighIns || weighIns.length === 0) return [];
  const res = [];
  let prev = weighIns[0].weight;
  for (let i = 0; i < weighIns.length; i++) {
    const curr = weighIns[i].weight;
    const smoothed = i === 0 ? curr : alpha * curr + (1 - alpha) * prev;
    res.push({ date: weighIns[i].date, weight: smoothed, raw: curr });
    prev = smoothed;
  }
  return res;
}

/**
 * Estimates true metabolic expenditure from weight and intake series.
 * @param {Array<{date: string, weight: number}>} weights - Daily weigh-ins
 * @param {Array<{date: string, calories: number}>} intakes - Daily caloric intake
 * @param {number} baselineTdee - Starting formula TDEE (fallback)
 * @returns {{
 *   estimatedTdee: number,
 *   confidence: number,
 *   daysCount: number,
 *   weightDeltaKg: number,
 *   avgDailyIntake: number,
 *   suggestedChange: number
 * }}
 */
export function estimateAdaptiveTdee(weights = [], intakes = [], baselineTdee = 2400) {
  // Map and align by date
  const weightMap = new Map();
  (weights || []).forEach(w => {
    if (w.weight && !isNaN(w.weight)) weightMap.set(w.date, Number(w.weight));
  });

  const intakeMap = new Map();
  (intakes || []).forEach(i => {
    if (i.calories && !isNaN(i.calories)) intakeMap.set(i.date, Number(i.calories));
  });

  // Find all dates with both weight and intake or valid chronological window
  const dates = [...new Set([...weightMap.keys(), ...intakeMap.keys()])].sort();

  if (dates.length < MIN_DAYS_REQUIRED) {
    return {
      estimatedTdee: Math.round(baselineTdee),
      confidence: Math.round((dates.length / MIN_DAYS_REQUIRED) * 50),
      daysCount: dates.length,
      weightDeltaKg: 0,
      avgDailyIntake: 0,
      suggestedChange: 0
    };
  }

  // Smooth weights
  const validWeights = dates
    .filter(d => weightMap.has(d))
    .map(d => ({ date: d, weight: weightMap.get(d) }));

  if (validWeights.length < 5) {
    return {
      estimatedTdee: Math.round(baselineTdee),
      confidence: 20,
      daysCount: dates.length,
      weightDeltaKg: 0,
      avgDailyIntake: 0,
      suggestedChange: 0
    };
  }

  const smoothed = ewmaWeight(validWeights, 0.15);
  const startWeight = smoothed[0].weight;
  const endWeight = smoothed[smoothed.length - 1].weight;
  const weightDeltaKg = endWeight - startWeight;

  const validIntakes = dates
    .filter(d => intakeMap.has(d))
    .map(d => intakeMap.get(d));

  if (validIntakes.length === 0) {
    return {
      estimatedTdee: Math.round(baselineTdee),
      confidence: 20,
      daysCount: dates.length,
      weightDeltaKg,
      avgDailyIntake: 0,
      suggestedChange: 0
    };
  }

  const totalIntake = validIntakes.reduce((a, b) => a + b, 0);
  const avgDailyIntake = totalIntake / validIntakes.length;

  const daysSpan = Math.max(1, (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000);
  const dailyWeightChange = weightDeltaKg / daysSpan;
  const dailyEnergySurplusKcal = dailyWeightChange * KCAL_PER_KG;

  // Adaptive expenditure = average intake - energy stored/lost as tissue
  const rawExpenditure = avgDailyIntake - dailyEnergySurplusKcal;

  // Blend confidence: scale from 0 to 1 as days approach 28
  const confidenceFactor = Math.min(1, Math.max(0, (dates.length - MIN_DAYS_REQUIRED) / 18));
  const estimatedTdee = Math.round(confidenceFactor * rawExpenditure + (1 - confidenceFactor) * baselineTdee);

  return {
    estimatedTdee,
    confidence: Math.round(confidenceFactor * 100),
    daysCount: dates.length,
    weightDeltaKg: Math.round(weightDeltaKg * 100) / 100,
    avgDailyIntake: Math.round(avgDailyIntake),
    suggestedChange: Math.round(estimatedTdee - baselineTdee)
  };
}
