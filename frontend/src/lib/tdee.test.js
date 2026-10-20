import { describe, it, expect } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  calculateWaterTarget,
  assessNutritionProfile,
  SAFE_MIN_CALORIES
} from './tdee.js';

describe('tdee & nutrition calculator', () => {
  describe('Persona 1: Young active male maintenance', () => {
    // 25yo, 80kg, 180cm, male, moderate (1.55)
    // BMR = 10(80) + 6.25(180) - 5(25) + 5 = 800 + 1125 - 125 + 5 = 1805
    it('matches exact Mifflin-St Jeor reference values', () => {
      const bmr = calculateBMR({ weight: 80, height: 180, age: 25, sex: 'male' });
      expect(bmr).toBe(1805);

      const tdee = calculateTDEE({ bmr, activity: 'moderate' });
      // 1805 * 1.55 = 2797.75 -> 2798
      expect(tdee).toBe(2798);

      const profile = assessNutritionProfile({
        weight: 80, height: 180, age: 25, sex: 'male', activity: 'moderate', goal: 'maintain'
      });
      expect(profile.bmr).toBe(1805);
      expect(profile.tdee).toBe(2798);
      expect(profile.targetCalories).toBe(2798);
      expect(profile.macros.protein).toBe(160); // 80kg * 2.0g
      expect(profile.waterMl).toBe(2800); // 80 * 35ml
    });
  });

  describe('Persona 2: Female deficit cut', () => {
    // 30yo, 60kg, 165cm, female, light (1.375)
    // BMR = 10(60) + 6.25(165) - 5(30) - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
    it('calculates proper deficit and water target', () => {
      const bmr = calculateBMR({ weight: 60, height: 165, age: 30, sex: 'female' });
      expect(Math.round(bmr)).toBe(1320);

      const tdee = calculateTDEE({ bmr, activity: 'light' });
      // 1320.25 * 1.375 = 1815.34 -> 1815
      expect(tdee).toBe(1815);

      const target = calculateCalorieTarget({ tdee, goal: 'cut', sex: 'female' });
      // 1815 - 500 = 1315
      expect(target).toBe(1315);

      const macros = calculateMacros({ calories: target, weightKg: 60 });
      expect(macros.protein).toBe(120); // 60 * 2.0
      expect(macros.fat).toBe(54);      // 60 * 0.9
      expect(macros.carbs).toBe(87);    // (1315 - 480 - 486) / 4 = 349 / 4 = 87
    });
  });

  describe('Persona 3: Small sedentary female, safe minimum clamp', () => {
    // 45yo, 48kg, 150cm, female, sedentary (1.2)
    // BMR = 10(48) + 6.25(150) - 5(45) - 161 = 480 + 937.5 - 225 - 161 = 1031.5
    // TDEE = 1031.5 * 1.2 = 1237.8 -> 1238
    // Cut - 500 would be 738 kcal -> MUST CLAMP to 1200 kcal!
    it('clamps to safe female minimum of 1200 kcal', () => {
      const profile = assessNutritionProfile({
        weight: 48, height: 150, age: 45, sex: 'female', activity: 'sedentary', goal: 'cut'
      });
      expect(profile.targetCalories).toBe(SAFE_MIN_CALORIES.female);
      expect(profile.targetCalories).toBe(1200);
      expect(profile.macros.calories).toBe(1200);
      expect(profile.macros.protein).toBeGreaterThan(0);
      expect(profile.macros.fat).toBeGreaterThan(0);
      expect(profile.macros.carbs).toBeGreaterThan(0);
    });

    it('clamps to safe male minimum of 1500 kcal', () => {
      const target = calculateCalorieTarget({ tdee: 1600, goal: 'cut', sex: 'male' });
      // 1600 - 500 = 1100 -> clamped to 1500
      expect(target).toBe(SAFE_MIN_CALORIES.male);
    });
  });

  describe('Water hydration calculation', () => {
    it('enforces minimum water floor of 2000 ml', () => {
      expect(calculateWaterTarget(40)).toBe(2000); // 40 * 35 = 1400 -> clamped to 2000
      expect(calculateWaterTarget(70)).toBe(2450); // 70 * 35 = 2450
      expect(calculateWaterTarget(100)).toBe(3500); // 100 * 35 = 3500
    });
  });
});
