import { describe, it, expect } from 'vitest';
import {
  isHealthAvailable,
  requestHealthPermissions,
  normalizeHealthWeighIns,
  normalizeActiveEnergy,
  HEALTH_DATA_TYPES
} from './health.js';

describe('health.js - Platform-Agnostic Health Adapter Interface (Task 25)', () => {
  it('reports unavailable on desktop/web environment without crashing', () => {
    expect(isHealthAvailable()).toBe(false);
  });

  it('safely handles requestHealthPermissions when plugin is unavailable', async () => {
    const res = await requestHealthPermissions();
    expect(res.granted).toBe(false);
    expect(res.reason).toBeDefined();
  });

  it('normalizes weigh-ins, converts lb to kg, and dedupes multiple entries on the same day', () => {
    const raw = [
      { date: '2026-10-18T08:00:00Z', weightKg: 82.2, timestamp: 1000 },
      // Duplicate date later in day:
      { date: '2026-10-18T19:00:00Z', weightKg: 82.5, timestamp: 2000 },
      // Lb entry that needs conversion (176.37 lb ≈ 80 kg):
      { date: '2026-10-19T08:00:00Z', weight: 176.37, unit: 'lb', timestamp: 3000 },
      // Invalid entry that should be filtered out:
      { date: '2026-10-20', weightKg: -5 }
    ];

    const normalized = normalizeHealthWeighIns(raw);
    expect(normalized.length).toBe(2);

    // 2026-10-18 should keep the latest timestamp (82.5 kg)
    expect(normalized[0].date).toBe('2026-10-18');
    expect(normalized[0].weightKg).toBe(82.5);
    expect(normalized[0].source).toBe('health');

    // 2026-10-19 should be converted to ~80 kg
    expect(normalized[1].date).toBe('2026-10-19');
    expect(normalized[1].weightKg).toBe(80);
  });

  it('normalizes and sums active energy burned per day', () => {
    const raw = [
      { date: '2026-10-19T10:00:00Z', kcal: 250 },
      { date: '2026-10-19T16:00:00Z', kcal: 350 },
      { date: '2026-10-18T12:00:00Z', kcal: 500 }
    ];

    const normalized = normalizeActiveEnergy(raw);
    expect(normalized.length).toBe(2);

    const oct19 = normalized.find(n => n.date === '2026-10-19');
    expect(oct19.kcal).toBe(600); // 250 + 350
  });
});
