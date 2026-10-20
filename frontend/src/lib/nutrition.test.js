import { describe, it, expect } from 'vitest';
import {
  dailyWater,
  addWater,
  removeWater,
  dailyMacros,
  addFood,
  removeFood,
  foodByMeal,
  scaleNutrients
} from './nutrition.js';

describe('nutrition.js', () => {
  const today = '2026-10-19';

  it('calculates daily water and manages logs', () => {
    let logs = [];
    expect(dailyWater(logs, today)).toBe(0);

    logs = addWater(logs, 250, today);
    logs = addWater(logs, 500, today);
    logs = addWater(logs, 300, '2026-10-18'); // different day

    expect(dailyWater(logs, today)).toBe(750);
    expect(logs.length).toBe(3);

    const firstId = logs[0].id;
    logs = removeWater(logs, firstId);
    expect(dailyWater(logs, today)).toBe(500);
  });

  it('manages food logs and sums daily macros', () => {
    let foods = [];
    expect(dailyMacros(foods, today)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodiumMg: 0, potassiumMg: 0 });

    foods = addFood(foods, {
      meal: 'breakfast',
      name: 'Oatmeal & Whey',
      grams: 200,
      kcal: 450,
      p: 35,
      c: 60,
      f: 8,
      fiber: 6,
      sodiumMg: 120,
      potassiumMg: 240,
      healthScore: 9.5
    }, today);

    foods = addFood(foods, {
      meal: 'lunch',
      name: 'Chicken Rice Bowl',
      grams: 350,
      kcal: 650,
      p: 55,
      c: 75,
      f: 12,
      fiber: 4,
      sodiumMg: 350,
      potassiumMg: 450,
      healthScore: 9.2
    }, today);

    const totals = dailyMacros(foods, today);
    expect(totals.calories).toBe(1100);
    expect(totals.protein).toBe(90);
    expect(totals.carbs).toBe(135);
    expect(totals.fat).toBe(20);
    expect(totals.fiber).toBe(10);
    expect(totals.sodiumMg).toBe(470);
    expect(totals.potassiumMg).toBe(690);

    const grouped = foodByMeal(foods, today);
    expect(grouped.breakfast.length).toBe(1);
    expect(grouped.lunch.length).toBe(1);
    expect(grouped.dinner.length).toBe(0);

    foods = removeFood(foods, foods[0].id);
    expect(foods.length).toBe(1);
  });

  it('scales nutrients per 100g to target grams', () => {
    const facts100g = { kcal: 200, p: 20, c: 10, f: 5 };
    const scaled = scaleNutrients(facts100g, 150);
    expect(scaled.kcal).toBe(300);
    expect(scaled.p).toBe(30);
    expect(scaled.c).toBe(15);
    expect(scaled.f).toBe(7.5);
  });
});
