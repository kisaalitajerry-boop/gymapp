import { describe, it, expect } from 'vitest';
import {
  normalizeOffProduct,
  calculatePortion,
  addRecentFood,
  createCustomFood,
  searchFoods
} from './foods.js';

describe('Food Search and Open Food Facts Library', () => {
  it('normalizes Open Food Facts product structure correctly', () => {
    const raw = {
      code: '3017620422003',
      product_name: 'Nutella',
      brands: 'Ferrero',
      serving_quantity: '15',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9
      }
    };

    const norm = normalizeOffProduct(raw);
    expect(norm.id).toBe('3017620422003');
    expect(norm.name).toBe('Nutella');
    expect(norm.brand).toBe('Ferrero');
    expect(norm.servingGrams).toBe(15);
    expect(norm.per100g.kcal).toBe(539);
    expect(norm.per100g.p).toBe(6.3);
    expect(norm.per100g.c).toBe(57.5);
    expect(norm.per100g.f).toBe(30.9);
  });

  it('calculates portion nutrition correctly for arbitrary weights', () => {
    const food = {
      per100g: { kcal: 200, p: 20, c: 10, f: 5 }
    };

    const portion50 = calculatePortion(food, 50);
    expect(portion50.grams).toBe(50);
    expect(portion50.kcal).toBe(100);
    expect(portion50.p).toBe(10);
    expect(portion50.c).toBe(5);
    expect(portion50.f).toBe(2.5);

    const portion200 = calculatePortion(food, 200);
    expect(portion200.kcal).toBe(400);
    expect(portion200.p).toBe(40);
  });

  it('adds and deduplicates recent foods', () => {
    const f1 = { id: '1', name: 'Eggs' };
    const f2 = { id: '2', name: 'Oats' };
    const initial = [f1];

    const updated = addRecentFood(initial, f2);
    expect(updated.length).toBe(2);
    expect(updated[0].id).toBe('2');

    // Adding existing moves to front
    const readded = addRecentFood(updated, f1);
    expect(readded.length).toBe(2);
    expect(readded[0].id).toBe('1');
    expect(readded[1].id).toBe('2');
  });

  it('creates custom foods scaled to 100g reference', () => {
    // Custom protein bar: 60g bar with 210 kcal, 20g protein, 22g carbs, 7g fat
    const custom = createCustomFood({
      name: 'Custom Whey Bar',
      brand: 'MyBrand',
      kcal: 210,
      p: 20,
      c: 22,
      f: 7,
      servingGrams: 60
    });

    expect(custom.name).toBe('Custom Whey Bar');
    expect(custom.servingGrams).toBe(60);
    // 210 * (100 / 60) = 350 kcal/100g
    expect(custom.per100g.kcal).toBe(350);
    // 20 * (100 / 60) = 33.3 g/100g
    expect(custom.per100g.p).toBe(33.3);
  });

  it('searches local custom foods offline and calls fetch for remote products', async () => {
    const custom = { id: 'c1', name: 'Grandma Greek Yogurt', brand: 'Farm', per100g: { kcal: 60, p: 10, c: 4, f: 0 } };
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        products: [
          {
            code: '999',
            product_name: 'Greek Yogurt Chobani',
            brands: 'Chobani',
            nutriments: { 'energy-kcal_100g': 90, proteins_100g: 15, carbohydrates_100g: 6, fat_100g: 0 }
          }
        ]
      })
    });

    const results = await searchFoods('greek', {
      customFoods: [custom],
      fetchFn: mockFetch
    });

    expect(results.length).toBe(2);
    expect(results[0].name).toBe('Grandma Greek Yogurt');
    expect(results[1].name).toBe('Greek Yogurt Chobani');
  });
});
