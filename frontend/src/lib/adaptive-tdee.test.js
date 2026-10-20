import { describe, it, expect } from 'vitest';
import { ewmaWeight, estimateAdaptiveTdee, KCAL_PER_KG } from './adaptive-tdee.js';

describe('adaptive-tdee.js', () => {
  it('smooths weight series using EWMA', () => {
    const raw = [
      { date: '2026-10-01', weight: 80 },
      { date: '2026-10-02', weight: 82 },
      { date: '2026-10-03', weight: 79 }
    ];
    const smoothed = ewmaWeight(raw, 0.2);
    expect(smoothed.length).toBe(3);
    expect(smoothed[0].weight).toBe(80);
    expect(smoothed[1].weight).toBeCloseTo(80.4, 1);
    expect(smoothed[2].weight).toBeLessThan(80.4);
  });

  it('suggests no change with fewer than 10 days of data', () => {
    const weights = [{ date: '2026-10-01', weight: 80 }];
    const intakes = [{ date: '2026-10-01', calories: 2400 }];
    const res = estimateAdaptiveTdee(weights, intakes, 2400);

    expect(res.estimatedTdee).toBe(2400);
    expect(res.daysCount).toBe(1);
    expect(res.suggestedChange).toBe(0);
  });

  it('recovers true expenditure within +-5% on synthetic weight-stable data', () => {
    const TRUE_TDEE = 2500;
    const weights = [];
    const intakes = [];

    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      // Slight day-to-day noise around 80kg
      const noise = (Math.sin(day) * 0.2);
      weights.push({ date: dateStr, weight: 80 + noise });
      intakes.push({ date: dateStr, calories: TRUE_TDEE });
    }

    const res = estimateAdaptiveTdee(weights, intakes, 2200);
    expect(res.confidence).toBe(100);
    expect(res.estimatedTdee).toBeGreaterThanOrEqual(TRUE_TDEE * 0.95);
    expect(res.estimatedTdee).toBeLessThanOrEqual(TRUE_TDEE * 1.05);
  });

  it('recovers true expenditure within +-5% during a calorie surplus weight gain', () => {
    const TRUE_TDEE = 2400;
    const INTAKE = 2900; // +500 kcal surplus
    const weights = [];
    const intakes = [];

    let currentWeight = 80.0;
    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      currentWeight += 500 / KCAL_PER_KG; // daily mass gain
      weights.push({ date: dateStr, weight: currentWeight });
      intakes.push({ date: dateStr, calories: INTAKE });
    }

    const res = estimateAdaptiveTdee(weights, intakes, 2000);
    expect(res.estimatedTdee).toBeGreaterThanOrEqual(TRUE_TDEE * 0.95);
    expect(res.estimatedTdee).toBeLessThanOrEqual(TRUE_TDEE * 1.05);
  });
});
