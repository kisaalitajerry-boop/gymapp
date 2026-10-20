// Pure functions and schema helpers for water and nutrition tracking.
import { todayISO, uid } from './format.js';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const DEFAULT_TARGETS = {
  calories: 2400,
  protein: 160,
  carbs: 260,
  fat: 80,
  waterMl: 3000
};

/**
 * Calculates total water consumed on a given date (default today).
 */
export function dailyWater(waterLog = [], date = todayISO()) {
  return (waterLog || [])
    .filter(entry => entry.date === date)
    .reduce((sum, entry) => sum + (Number(entry.amountMl) || 0), 0);
}

/**
 * Appends a water log entry.
 */
export function addWater(waterLog = [], amountMl, date = todayISO(), now = Date.now()) {
  const entry = {
    id: uid(),
    date,
    amountMl: Math.round(Number(amountMl) || 0),
    timestamp: now
  };
  return [...(waterLog || []), entry];
}

/**
 * Removes a water log entry by id.
 */
export function removeWater(waterLog = [], id) {
  return (waterLog || []).filter(e => e.id !== id);
}

/**
 * Sums daily macronutrients and calories for a given date.
 */
export function dailyMacros(foodLog = [], date = todayISO()) {
  const dayFoods = (foodLog || []).filter(entry => entry.date === date);
  return dayFoods.reduce(
    (acc, item) => {
      acc.calories += Math.round(Number(item.kcal) || 0);
      acc.protein += Math.round(Number(item.p) || 0);
      acc.carbs += Math.round(Number(item.c) || 0);
      acc.fat += Math.round(Number(item.f) || 0);
      acc.fiber += Math.round(Number(item.fiber) || 0);
      acc.sodiumMg += Math.round(Number(item.sodiumMg) || 0);
      acc.potassiumMg += Math.round(Number(item.potassiumMg) || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodiumMg: 0, potassiumMg: 0 }
  );
}

/**
 * Calculates a comprehensive Diet Quality Index (0-10) based on micronutrients and whole foods.
 */
export function computeDietQualityScore(dayMacros = {}, dayFoods = []) {
  if (!dayFoods.length || !dayMacros.calories) {
    return {
      score: 10,
      label: 'Optimal Baseline',
      color: '#10b981',
      fiberProgress: 0,
      insights: ['Log your first whole food meal of the day to compute your diet quality score.']
    };
  }

  // Fiber target: ~28-35g
  const fiberScore = Math.min(10, ((dayMacros.fiber || 0) / 30) * 10);

  // Protein calorie ratio: ideal 25-35%
  const proteinCals = (dayMacros.protein || 0) * 4;
  const proteinRatio = proteinCals / dayMacros.calories;
  const proteinScore = Math.min(10, (proteinRatio / 0.3) * 10);

  // Health scores from individual items
  const validScores = dayFoods.map(f => Number(f.healthScore)).filter(s => !isNaN(s) && s > 0);
  const avgHealth = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 8.5;

  const finalScore = Math.round((fiberScore * 0.3 + proteinScore * 0.35 + avgHealth * 0.35) * 10) / 10;
  const clamped = Math.max(1, Math.min(10, finalScore));

  let label = 'Clean & Balanced';
  let color = '#10b981';
  if (clamped >= 9.0) {
    label = 'Elite Whole Food Nutrition';
    color = '#10b981';
  } else if (clamped >= 7.5) {
    label = 'High Quality Diet';
    color = '#38bdf8';
  } else if (clamped >= 5.5) {
    label = 'Moderate Quality';
    color = '#f59e0b';
  } else {
    label = 'Needs More Whole Foods & Fiber';
    color = '#ef4444';
  }

  const insights = [];
  if ((dayMacros.fiber || 0) >= 25) {
    insights.push('Great fiber intake (>25g) supporting gut microbiome and glucose stability.');
  } else {
    insights.push(`Add ${Math.max(0, 28 - (dayMacros.fiber || 0))}g more fiber (berries, oats, broccoli) to reach gut health target.`);
  }

  if (proteinRatio >= 0.25) {
    insights.push('High protein density safeguarding muscle tissue.');
  }

  return {
    score: clamped,
    label,
    color,
    fiberProgress: Math.min(100, Math.round(((dayMacros.fiber || 0) / 30) * 100)),
    insights
  };
}

/**
 * Groups food logs by meal type for a specific date.
 */
export function foodByMeal(foodLog = [], date = todayISO()) {
  const grouped = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  };
  (foodLog || [])
    .filter(entry => entry.date === date)
    .forEach(item => {
      const meal = grouped[item.meal] ? item.meal : 'snacks';
      grouped[meal].push(item);
    });
  return grouped;
}

/**
 * Adds a food item entry into the food log.
 */
export function addFood(foodLog = [], item, date = todayISO(), now = Date.now()) {
  const entry = {
    id: uid(),
    date,
    meal: item.meal || 'snacks',
    name: item.name || 'Unnamed Food',
    grams: Math.round(Number(item.grams) || 100),
    kcal: Math.round(Number(item.kcal) || 0),
    p: Math.round(Number(item.p) || 0),
    c: Math.round(Number(item.c) || 0),
    f: Math.round(Number(item.f) || 0),
    fiber: Math.round(Number(item.fiber) || 0),
    sodiumMg: Math.round(Number(item.sodiumMg) || 0),
    potassiumMg: Math.round(Number(item.potassiumMg) || 0),
    healthScore: item.healthScore || null,
    tags: item.tags || [],
    timestamp: now
  };
  return [...(foodLog || []), entry];
}

/**
 * Removes a food log entry by id.
 */
export function removeFood(foodLog = [], id) {
  return (foodLog || []).filter(e => e.id !== id);
}

/**
 * Scales nutritional facts for a given serving size in grams.
 */
export function scaleNutrients(nutrientsPer100g, grams) {
  const ratio = (Number(grams) || 0) / 100;
  return {
    kcal: Math.round((Number(nutrientsPer100g.kcal) || 0) * ratio),
    p: Math.round((Number(nutrientsPer100g.p) || 0) * ratio * 10) / 10,
    c: Math.round((Number(nutrientsPer100g.c) || 0) * ratio * 10) / 10,
    f: Math.round((Number(nutrientsPer100g.f) || 0) * ratio * 10) / 10
  };
}
