// Platform-Agnostic Health Integration Adapter Interface (Task 25)
// Unifies Apple HealthKit and Android Health Connect behind a normalized, safe API.
// No-op / safe fallback on web and unsupported platforms.

import { todayISO } from './format.js';

export const HEALTH_DATA_TYPES = {
  WEIGHT: 'weight',
  ACTIVE_ENERGY: 'active_energy',
  STEPS: 'steps',
  SLEEP: 'sleep'
};

/**
 * Checks whether native health hardware/OS services are available.
 */
export function isHealthAvailable() {
  if (typeof window === 'undefined') return false;
  // If Capacitor Health plugin or HealthKit/HealthConnect is present in window
  return !!(window.Capacitor && (window.Capacitor.isPluginAvailable?.('Health') || window.Capacitor.isPluginAvailable?.('HealthConnect')));
}

/**
 * Requests read-only permissions for specified health metrics.
 */
export async function requestHealthPermissions(types = Object.values(HEALTH_DATA_TYPES)) {
  if (!isHealthAvailable()) {
    return { granted: false, reason: 'Health platform not available on this device' };
  }
  try {
    const plugin = window.Capacitor.Plugins.Health || window.Capacitor.Plugins.HealthConnect;
    const res = await plugin.requestAuthorization({
      read: types
    });
    return { granted: !!res?.granted, types };
  } catch (err) {
    return { granted: false, error: err.message };
  }
}

/**
 * Normalizes an array of raw weigh-in samples into standardized kg records deduped by date.
 */
export function normalizeHealthWeighIns(records = []) {
  const byDate = new Map();

  for (const rec of records) {
    if (!rec) continue;
    const dateStr = (rec.date || rec.startDate || todayISO()).slice(0, 10);
    let valKg = Number(rec.value ?? rec.weight ?? rec.weightKg);
    if (isNaN(valKg) || valKg <= 0) continue;

    // Convert pounds to kg if tagged
    if (rec.unit === 'lb' || rec.unit === 'lbs') {
      valKg = valKg * 0.45359237;
    }

    const roundedKg = Math.round(valKg * 10) / 10;
    const ts = rec.timestamp || (rec.date ? new Date(rec.date).getTime() : Date.now());

    // If duplicate on same date, keep the latest timestamp
    const existing = byDate.get(dateStr);
    if (!existing || ts > existing.timestamp) {
      byDate.set(dateStr, {
        date: dateStr,
        weightKg: roundedKg,
        timestamp: ts,
        source: 'health'
      });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Normalizes daily active energy expenditure samples (kcal) deduped and summed per day.
 */
export function normalizeActiveEnergy(records = []) {
  const byDate = new Map();

  for (const rec of records) {
    if (!rec) continue;
    const dateStr = (rec.date || rec.startDate || todayISO()).slice(0, 10);
    const kcal = Math.round(Number(rec.value ?? rec.kcal ?? rec.calories) || 0);
    if (kcal <= 0) continue;

    byDate.set(dateStr, (byDate.get(dateStr) || 0) + kcal);
  }

  return [...byDate.entries()]
    .map(([date, kcal]) => ({ date, kcal, source: 'health' }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Reads weight records over a given date range.
 */
export async function readWeights({ startDate, endDate = todayISO() } = {}) {
  if (!isHealthAvailable()) return [];
  try {
    const plugin = window.Capacitor.Plugins.Health || window.Capacitor.Plugins.HealthConnect;
    const raw = await plugin.queryAggregated({
      dataType: HEALTH_DATA_TYPES.WEIGHT,
      startDate,
      endDate
    });
    return normalizeHealthWeighIns(raw?.samples || []);
  } catch (err) {
    return [];
  }
}

/**
 * Reads active energy burned over a given date range.
 */
export async function readActiveEnergy({ startDate, endDate = todayISO() } = {}) {
  if (!isHealthAvailable()) return [];
  try {
    const plugin = window.Capacitor.Plugins.Health || window.Capacitor.Plugins.HealthConnect;
    const raw = await plugin.queryAggregated({
      dataType: HEALTH_DATA_TYPES.ACTIVE_ENERGY,
      startDate,
      endDate
    });
    return normalizeActiveEnergy(raw?.samples || []);
  } catch (err) {
    return [];
  }
}
