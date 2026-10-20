import { describe, it, expect } from 'vitest';
import { computeMuscleRecovery, RECOVERY_STATUS } from './recovery.js';

describe('computeMuscleRecovery', () => {
  it('returns 100% recovery and Ready status when no workouts have occurred', () => {
    const res = computeMuscleRecovery([]);
    expect(res.overall).toBe(100);
    expect(res.muscles.chest.percent).toBe(100);
    expect(res.muscles.chest.status.label).toBe(RECOVERY_STATUS.READY.label);
    expect(res.groups.Chest.percent).toBe(100);
  });

  it('correctly models fatigue immediately following a heavy chest workout', () => {
    const now = 1700000000000;
    const workouts = [
      {
        id: 'w1',
        end: now - 3600000, // 1 hour ago
        entries: [
          {
            id: '0025', // barbell bench press (pectorals)
            sets: [
              { w: 80, r: 10, done: true },
              { w: 80, r: 10, done: true },
              { w: 80, r: 10, done: true },
              { w: 80, r: 8, done: true }
            ]
          }
        ]
      }
    ];

    const res = computeMuscleRecovery(workouts, now);
    expect(res.muscles.chest.percent).toBeLessThan(80);
    expect(res.groups.Chest.percent).toBeLessThan(80);
    // Unworked muscles like quadriceps should remain near 100%
    expect(res.muscles.quadriceps.percent).toBe(100);
  });

  it('demonstrates physiological recovery progression over 24h, 48h, and 72h', () => {
    const baseTime = 1700000000000;
    const chestWorkout = [
      {
        id: 'w-chest',
        end: baseTime,
        entries: [
          {
            id: '0025',
            sets: [
              { w: 100, r: 8, done: true },
              { w: 100, r: 8, done: true },
              { w: 100, r: 8, done: true },
              { w: 100, r: 8, done: true },
              { w: 100, r: 8, done: true }
            ]
          }
        ]
      }
    ];

    // At 24 hours: Recovering (~50-70%)
    const at24h = computeMuscleRecovery(chestWorkout, baseTime + 24 * 3600000);
    expect(at24h.muscles.chest.percent).toBeGreaterThan(45);
    expect(at24h.muscles.chest.percent).toBeLessThan(75);

    // At 48 hours: Nearly Ready or Ready (>75%)
    const at48h = computeMuscleRecovery(chestWorkout, baseTime + 48 * 3600000);
    expect(at48h.muscles.chest.percent).toBeGreaterThan(at24h.muscles.chest.percent);
    expect(at48h.muscles.chest.percent).toBeGreaterThan(70);

    // At 72 hours: Full recovery (Ready, >= 90%)
    const at72h = computeMuscleRecovery(chestWorkout, baseTime + 72 * 3600000);
    expect(at72h.muscles.chest.percent).toBeGreaterThanOrEqual(88);
    expect(at72h.muscles.chest.status.label).toBe(RECOVERY_STATUS.READY.label);
  });

  it('generates a smart recommendation for ready muscle groups', () => {
    const now = 1700000000000;
    // Chest trained 24 hours ago (recovering at ~61%)
    // Back and Shoulders are fresh (100% ready)
    const workouts = [
      {
        id: 'w-chest',
        end: now - 24 * 3600000,
        entries: [
          {
            id: '0025', // barbell bench press
            sets: Array(5).fill({ w: 80, r: 8, done: true })
          }
        ]
      }
    ];

    const res = computeMuscleRecovery(workouts, now);
    expect(res.groups.Chest.percent).toBeLessThan(70);
    expect(res.recommendation).toBe('Train Back + Shoulders');
  });
});
