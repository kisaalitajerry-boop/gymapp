import { describe, it, expect } from 'vitest';
import {
  mergeWeighIns,
  enrichDailyExpenditure,
  applyHealthSyncToState
} from './health-sync.js';

describe('health-sync.js - Health Data Fusion & Sync (Task 28)', () => {
  it('merges health weigh-ins with existing manual logs where manual entries win on conflict', () => {
    const existing = [
      { d: '2026-10-18', w: 82.0, source: 'manual' },
      { d: '2026-10-19', w: 81.5, source: 'manual' }
    ];

    const healthRecords = [
      // Conflict on 18th: health recorded 82.7, but manual user entry 82.0 should win!
      { date: '2026-10-18', weightKg: 82.7 },
      // New date 20th: health recorded 81.2, should be added!
      { date: '2026-10-20', weightKg: 81.2 }
    ];

    const merged = mergeWeighIns(existing, healthRecords);
    expect(merged.length).toBe(3);

    // 18th keeps manual 82.0
    const oct18 = merged.find(m => m.d === '2026-10-18');
    expect(oct18.w).toBe(82.0);
    expect(oct18.source).toBe('manual');

    // 19th keeps manual 81.5
    const oct19 = merged.find(m => m.d === '2026-10-19');
    expect(oct19.w).toBe(81.5);

    // 20th adds health record 81.2
    const oct20 = merged.find(m => m.d === '2026-10-20');
    expect(oct20.w).toBe(81.2);
    expect(oct20.source).toBe('health');
  });

  it('enriches daily expenditure using BMR and active energy', () => {
    // 1800 BMR + 500 active energy = 2300 * 1.1 TEF = 2530 kcal
    const total = enrichDailyExpenditure(1800, 500, 0.1);
    expect(total).toBe(2530);
  });

  it('gates automated health sync behind Pro entitlement', () => {
    const state = { bodyweight: [{ d: '2026-10-19', w: 80 }] };
    const healthData = { weights: [{ date: '2026-10-20', weightKg: 79.8 }] };

    // Free user
    const freeRes = applyHealthSyncToState(state, healthData, 'free');
    expect(freeRes.synced).toBe(false);
    expect(freeRes.reason).toContain('Pro');

    // Pro user
    const proRes = applyHealthSyncToState(state, healthData, 'pro');
    expect(proRes.synced).toBe(true);
    expect(proRes.patch.bodyweight.length).toBe(2);
    expect(proRes.patch.lastHealthSyncAt).toBeGreaterThan(0);
  });
});
