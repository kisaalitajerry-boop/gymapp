import { describe, it, expect } from 'vitest';
import { detectUserRegion, getRegionalMeals, REGIONS } from './location-diet.js';

describe('location-diet.js - Silent Location-Based Diet & Regional Meal Adaptation', () => {
  it('correctly detects East Africa from Kampala or Nairobi timezone / locale', () => {
    const regUganda = detectUserRegion('Africa/Kampala', 'en-UG');
    expect(regUganda.id).toBe('east_africa');
    expect(regUganda.country).toBe('Uganda');

    const regKenya = detectUserRegion('Africa/Nairobi', 'en-KE');
    expect(regKenya.id).toBe('east_africa');
  });

  it('correctly detects West Africa from Lagos or Accra timezone / locale', () => {
    const regNigeria = detectUserRegion('Africa/Lagos', 'en-NG');
    expect(regNigeria.id).toBe('west_africa');
    expect(regNigeria.country).toBe('Nigeria');

    const regGhana = detectUserRegion('Africa/Accra', 'en-GH');
    expect(regGhana.id).toBe('west_africa');
  });

  it('correctly detects South Asia from Kolkata or Karachi timezone / locale', () => {
    const regIndia = detectUserRegion('Asia/Kolkata', 'en-IN');
    expect(regIndia.id).toBe('south_asia');
    expect(regIndia.name).toContain('South Asia');
  });

  it('correctly detects Mediterranean from Athens or Madrid timezone', () => {
    const regMed = detectUserRegion('Europe/Athens', 'el-GR');
    expect(regMed.id).toBe('mediterranean');
  });

  it('correctly detects Latin America from Sao Paulo or Mexico City timezone', () => {
    const regLatAm = detectUserRegion('America/Sao_Paulo', 'pt-BR');
    expect(regLatAm.id).toBe('latin_america');
  });

  it('falls back gracefully to Global / Western for unrecognized timezones', () => {
    const fallback = detectUserRegion('Unknown/Place', 'en-US');
    expect(fallback.id).toBe('north_america_western');
  });

  it('returns populated regional meals with valid macronutrients', () => {
    const eastAfricanMeals = getRegionalMeals('east_africa');
    expect(eastAfricanMeals.length).toBeGreaterThan(0);

    const firstMeal = eastAfricanMeals[0];
    expect(firstMeal).toHaveProperty('name');
    expect(firstMeal).toHaveProperty('kcal');
    expect(firstMeal.p).toBeGreaterThan(15); // rich in protein
    expect(firstMeal).toHaveProperty('id');
    expect(firstMeal.regionId).toBe('east_africa');
  });

  it('verifies all regions in REGIONS have valid meal pools', () => {
    Object.keys(REGIONS).forEach(regionKey => {
      const region = REGIONS[regionKey];
      expect(region.meals).toBeDefined();
      expect(region.meals.length).toBeGreaterThan(1);
      region.meals.forEach(m => {
        expect(m.name).toBeTruthy();
        expect(m.kcal).toBeGreaterThan(0);
        expect(m.p).toBeGreaterThanOrEqual(0);
        expect(m.c).toBeGreaterThanOrEqual(0);
        expect(m.f).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
