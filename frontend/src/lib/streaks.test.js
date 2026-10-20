import { describe, it, expect } from 'vitest';
import { computeWorkoutStreak, computeWaterStreak, computeMacroStreak, isScheduledDay } from './streaks.js';

describe('streaks.js', () => {
  // Plan: Monday (1), Wednesday (3), Friday (5)
  const weekPlan = {
    1: 'routine_push',
    3: 'routine_pull',
    5: 'routine_legs'
  };

  it('correctly identifies scheduled days vs rest days', () => {
    // 2026-10-19 is Monday (1)
    expect(isScheduledDay('2026-10-19', weekPlan)).toBe(true);
    // 2026-10-20 is Tuesday (2) - rest day
    expect(isScheduledDay('2026-10-20', weekPlan)).toBe(false);
    // 2026-10-21 is Wednesday (3)
    expect(isScheduledDay('2026-10-21', weekPlan)).toBe(true);
  });

  it('does not break workout streaks on rest days', () => {
    // Lifter worked out on Friday 2026-10-16, rested Sat 17 & Sun 18, and worked out Mon 2026-10-19
    const history = [
      { d: '2026-10-16T18:00:00Z' }, // Friday
      { d: '2026-10-19T18:00:00Z' }  // Monday
    ];

    const streak = computeWorkoutStreak(history, weekPlan, '2026-10-19');
    expect(streak.current).toBe(2);
  });

  it('breaks streak when a scheduled workout is missed', () => {
    // Lifter missed Friday 2026-10-16, only worked out Monday 2026-10-19
    const history = [
      { d: '2026-10-14T18:00:00Z' }, // Wed - completed
      // Fri 16 missed!
      { d: '2026-10-19T18:00:00Z' }  // Mon - completed
    ];

    const streak = computeWorkoutStreak(history, weekPlan, '2026-10-19');
    expect(streak.current).toBe(1);
  });

  it('computes water intake streak', () => {
    const waterLog = [
      { date: '2026-10-19', amountMl: 2600 },
      { date: '2026-10-18', amountMl: 3000 },
      { date: '2026-10-17', amountMl: 2500 }
    ];

    const streak = computeWaterStreak(waterLog, 2500, '2026-10-19');
    expect(streak.current).toBe(3);
  });

  it('computes macro compliance streak', () => {
    const targets = { calories: 2000, protein: 150 };
    const foodLog = [
      { date: '2026-10-19', kcal: 1950, p: 155, c: 200, f: 50 },
      { date: '2026-10-18', kcal: 2100, p: 140, c: 220, f: 55 },
      { date: '2026-10-17', kcal: 1900, p: 160, c: 180, f: 45 }
    ];

    const streak = computeMacroStreak(foodLog, targets, '2026-10-19');
    expect(streak.current).toBe(3);
  });
});
