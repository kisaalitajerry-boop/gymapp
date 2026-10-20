import { describe, it, expect } from 'vitest';
import { recommendMealsForRemainingMacros, RECIPE_POOL } from './meal-recommender.js';

describe('meal recommender based on remaining macros', () => {
  it('returns 3 top recommendations sorted by fit', () => {
    const recs = recommendMealsForRemainingMacros({
      remainingCalories: 350,
      remainingProtein: 40,
      meal: 'dinner'
    });
    expect(recs.length).toBe(3);
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
    expect(recs[0].p).toBeGreaterThan(0);
    expect(recs[0].kcal).toBeGreaterThan(0);
    expect(recs[0].fitReason).toBeDefined();
  });

  it('favors high-protein meals when protein target is large', () => {
    const recs = recommendMealsForRemainingMacros({
      remainingCalories: 400,
      remainingProtein: 45,
      meal: 'dinner'
    });
    expect(recs.some(r => r.p >= 40)).toBe(true);
  });

  it('handles low remaining calories safely without crash', () => {
    const recs = recommendMealsForRemainingMacros({
      remainingCalories: 150,
      remainingProtein: 15,
      meal: 'snacks'
    });
    expect(recs.length).toBe(3);
  });
});
