// Health Data Sync & Fusion Engine (Task 28)
// Merges HealthKit / Health Connect sensor data into local weight and adaptive TDEE.
// Manual user logs always take precedence over automated health sync on conflict.

import { canUse } from './entitlements.js';

/**
 * Merges automated health weigh-ins with existing manual weigh-ins.
 * Rule: Manual entries always win on conflict for the same calendar date.
 *
 * @param {Array<{d: string, w: number, t?: number, source?: string}>} existingLogs
 * @param {Array<{date: string, weightKg: number, timestamp?: number}>} healthRecords
 * @returns {Array<{d: string, w: number, t: number, source: string}>}
 */
export function mergeWeighIns(existingLogs = [], healthRecords = []) {
  const mergedMap = new Map();

  // 1. Add health records first as baseline
  for (const hr of healthRecords || []) {
    if (!hr || !hr.date || isNaN(hr.weightKg)) continue;
    const dateKey = hr.date.slice(0, 10);
    mergedMap.set(dateKey, {
      d: dateKey,
      w: Math.round(Number(hr.weightKg) * 10) / 10,
      t: hr.timestamp || new Date(dateKey).getTime(),
      source: 'health'
    });
  }

  // 2. Overlay existing logs — manual entries strictly overwrite health entries
  for (const ex of existingLogs || []) {
    if (!ex || !ex.d || isNaN(ex.w)) continue;
    const dateKey = ex.d.slice(0, 10);
    mergedMap.set(dateKey, {
      d: dateKey,
      w: Math.round(Number(ex.w) * 10) / 10,
      t: ex.t || new Date(dateKey).getTime(),
      source: ex.source || 'manual'
    });
  }

  // Sort chronologically
  return [...mergedMap.values()].sort((a, b) => a.d.localeCompare(b.d));
}

/**
 * Enriches daily expenditure calculations with device-measured active energy.
 * When sensor data exists, provides a hybrid estimate between formula and sensor.
 */
export function enrichDailyExpenditure(bmrKcal = 1800, activeEnergyKcal = 0, tefRatio = 0.1) {
  const bmr = Math.max(1000, Number(bmrKcal) || 1800);
  const active = Math.max(0, Number(activeEnergyKcal) || 0);
  // Total = BMR + Active Energy + Thermic Effect of Food (~10%)
  const subtotal = bmr + active;
  const totalWithTef = Math.round(subtotal * (1 + tefRatio));
  return totalWithTef;
}

/**
 * Pro-gated health sync handler that returns state patches.
 */
export function applyHealthSyncToState(currentState = {}, healthData = {}, entitlement = 'free') {
  if (!canUse('health_sync', entitlement)) {
    return {
      synced: false,
      reason: 'Pro subscription required for automated health sync'
    };
  }

  const updatedBodyweight = mergeWeighIns(currentState.bodyweight || [], healthData.weights || []);
  const newWeighInsCount = updatedBodyweight.length - (currentState.bodyweight || []).length;

  return {
    synced: true,
    newWeighInsCount: Math.max(0, newWeighInsCount),
    patch: {
      bodyweight: updatedBodyweight,
      lastHealthSyncAt: Date.now()
    }
  };
}
