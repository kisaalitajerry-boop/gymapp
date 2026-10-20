import { describe, it, expect } from 'vitest';
import { calculateFastingProgress, getMetabolicStage, FASTING_PROTOCOLS } from './fasting.js';

describe('intermittent fasting engine', () => {
  it('handles inactive fast state gracefully', () => {
    const res = calculateFastingProgress({ active: false });
    expect(res.active).toBe(false);
    expect(res.percent).toBe(0);
    expect(res.isCompleted).toBe(false);
  });

  it('calculates elapsed time and percentage accurately', () => {
    const now = 1700000000000;
    const eightHoursAgo = now - 8 * 3600 * 1000;
    const res = calculateFastingProgress({
      active: true,
      startTime: eightHoursAgo,
      targetHours: 16
    }, now);

    expect(res.active).toBe(true);
    expect(res.elapsedHours).toBe(8);
    expect(res.remainingHours).toBe(8);
    expect(res.percent).toBe(50);
    expect(res.isCompleted).toBe(false);
  });

  it('marks fast as completed when target hours are reached', () => {
    const now = 1700000000000;
    const seventeenHoursAgo = now - 17 * 3600 * 1000;
    const res = calculateFastingProgress({
      active: true,
      startTime: seventeenHoursAgo,
      targetHours: 16
    }, now);

    expect(res.isCompleted).toBe(true);
    expect(res.percent).toBe(100);
    expect(res.remainingHours).toBe(0);
    expect(res.stage.name).toContain('Autophagy');
  });

  it('provides metabolic stages based on hours elapsed', () => {
    expect(getMetabolicStage(2).name).toContain('Digestion');
    expect(getMetabolicStage(8).name).toContain('Reset');
    expect(getMetabolicStage(14).name).toContain('Fat Oxidation');
    expect(getMetabolicStage(18).name).toContain('Autophagy');
  });
});
