// Open Food Facts API & Food Search Client Library
import { uid } from './format.js';

export function normalizeOffProduct(p) {
  if (!p) return null;
  const nuts = p.nutriments || {};
  const kcal100 = Math.round(Number(nuts['energy-kcal_100g'] ?? (nuts['energy_100g'] ? nuts['energy_100g'] / 4.184 : 0)) || 0);
  const p100 = Math.round(Number(nuts.proteins_100g || 0) * 10) / 10;
  const c100 = Math.round(Number(nuts.carbohydrates_100g || 0) * 10) / 10;
  const f100 = Math.round(Number(nuts.fat_100g || 0) * 10) / 10;

  const rawServing = p.serving_quantity ? Number(p.serving_quantity) : 100;
  const servingGrams = isNaN(rawServing) || rawServing <= 0 ? 100 : rawServing;

  return {
    id: p.code || p._id || uid(),
    name: p.product_name || p.generic_name || 'Food Product',
    brand: p.brands || '',
    servingGrams,
    per100g: {
      kcal: kcal100,
      p: p100,
      c: c100,
      f: f100
    },
    source: 'off'
  };
}

export function calculatePortion(food, grams) {
  const g = Math.max(0, Number(grams) || 0);
  const ratio = g / 100;
  const p100 = food.per100g || { kcal: 0, p: 0, c: 0, f: 0 };

  return {
    grams: g,
    kcal: Math.round(p100.kcal * ratio),
    p: Math.round(p100.p * ratio * 10) / 10,
    c: Math.round(p100.c * ratio * 10) / 10,
    f: Math.round(p100.f * ratio * 10) / 10
  };
}

export function addRecentFood(recentFoods = [], food, maxItems = 30) {
  if (!food || !food.id) return recentFoods;
  const filtered = (recentFoods || []).filter(item => item.id !== food.id);
  return [food, ...filtered].slice(0, maxItems);
}

export function createCustomFood({ name, brand = '', kcal = 0, p = 0, c = 0, f = 0, servingGrams = 100 }) {
  const ratio = 100 / Math.max(1, servingGrams);
  return {
    id: 'custom_' + uid(),
    name: name.trim(),
    brand: brand.trim(),
    servingGrams,
    per100g: {
      kcal: Math.round(kcal * ratio),
      p: Math.round(p * ratio * 10) / 10,
      c: Math.round(c * ratio * 10) / 10,
      f: Math.round(f * ratio * 10) / 10
    },
    source: 'custom',
    created: Date.now()
  };
}

export async function searchFoods(query, { customFoods = [], recentFoods = [], fetchFn = globalThis.fetch } = {}) {
  const q = (query || '').trim().toLowerCase();

  // Match local custom and recent foods first (instant offline availability)
  const localMatches = [];
  const seenIds = new Set();

  for (const f of [...customFoods, ...recentFoods]) {
    if (!f || !f.id || seenIds.has(f.id)) continue;
    const nameMatch = (f.name || '').toLowerCase().includes(q);
    const brandMatch = (f.brand || '').toLowerCase().includes(q);
    if (!q || nameMatch || brandMatch) {
      localMatches.push(f);
      seenIds.add(f.id);
    }
  }

  if (!q) {
    return localMatches;
  }

  // Fetch from Open Food Facts if online
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20`;
    const res = await fetchFn(url, { headers: { 'User-Agent': 'MuscleTrack - OpenGym Fork - Mobile App' } });
    if (res.ok) {
      const data = await res.json();
      const products = (data.products || [])
        .map(normalizeOffProduct)
        .filter(Boolean)
        .filter(p => !seenIds.has(p.id));

      return [...localMatches, ...products];
    }
  } catch (err) {
    // Return local results if offline or request failed
  }

  return localMatches;
}
