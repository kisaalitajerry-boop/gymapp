// BMR, TDEE, macro split and hydration target calculator (Task 17).
// Uses Mifflin-St Jeor equation, physical activity levels, protein-first macros,
// and clinical hydration targets with safe minimum calorie clamping.

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,      // Desk job, little to no formal exercise
  light: 1.375,        // Light exercise 1–3 days/week
  moderate: 1.55,      // Moderate exercise 3–5 days/week
  active: 1.725,       // Hard exercise 6–7 days/week
  extra_active: 1.9    // Intense daily training or physical job
};

export const GOALS = {
  CUT: 'cut',
  MAINTAIN: 'maintain',
  BULK: 'bulk'
};

export const GOAL_CALORIE_DELTAS = {
  cut: -500,
  maintain: 0,
  bulk: 300
};

export const SAFE_MIN_CALORIES = {
  male: 1500,
  female: 1200,
  default: 1200
};

export const WATER_ML_PER_KG = 35;
export const MIN_WATER_ML = 2000;

/**
 * Calculates Basal Metabolic Rate (BMR) via Mifflin-St Jeor.
 *
 * @param {object} params
 * @param {number} params.weight - Weight in kg
 * @param {number} params.height - Height in cm
 * @param {number} params.age - Age in years
 * @param {'male'|'female'|string} [params.sex='male'] - Biological sex
 * @returns {number} BMR in kcal/day
 */
export function calculateBMR({ weight, height, age, sex = 'male' }) {
  const w = Number(weight) || 0;
  const h = Number(height) || 0;
  const a = Number(age) || 0;
  if (w <= 0 || h <= 0 || a <= 0) return 0;

  const base = 10 * w + 6.25 * h - 5 * a;
  const s = String(sex).toLowerCase();
  if (s === 'female') return base - 161;
  if (s === 'male') return base + 5;
  // neutral / average if sex not specified
  return base - 78;
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 *
 * @param {object} params
 * @param {number} params.bmr - Basal Metabolic Rate
 * @param {string|number} [params.activity='moderate'] - Activity level key or numeric factor
 * @returns {number} TDEE in kcal/day
 */
export function calculateTDEE({ bmr, activity = 'moderate' }) {
  const factor = typeof activity === 'number'
    ? activity
    : (ACTIVITY_FACTORS[activity] || ACTIVITY_FACTORS.moderate);

  return Math.round(bmr * factor);
}

/**
 * Calculates daily calorie target, clamping to safe minimums.
 */
export function calculateCalorieTarget({ tdee, goal = 'maintain', sex = 'male', customDelta = null }) {
  const delta = customDelta !== null && customDelta !== undefined
    ? Number(customDelta)
    : (GOAL_CALORIE_DELTAS[goal] ?? 0);

  const rawTarget = tdee + delta;
  const minSafe = SAFE_MIN_CALORIES[String(sex).toLowerCase()] || SAFE_MIN_CALORIES.default;

  return Math.max(minSafe, Math.round(rawTarget));
}

/**
 * Computes protein-first macronutrient split.
 * - Protein: ~2.0 g/kg (4 kcal/g)
 * - Fat: ~0.9 g/kg (9 kcal/g), minimum 20% of calories
 * - Carbs: Remaining calories (4 kcal/g)
 */
export function calculateMacros({ calories, weightKg }) {
  const cals = Math.max(0, Number(calories) || 0);
  const w = Math.max(1, Number(weightKg) || 70);

  // Protein: 2.0 g/kg, clamped between 15% and 40% of total calories
  let proteinGrams = Math.round(w * 2.0);
  let proteinCals = proteinGrams * 4;
  if (proteinCals > cals * 0.45) {
    proteinGrams = Math.round((cals * 0.35) / 4);
    proteinCals = proteinGrams * 4;
  }

  // Fat: 0.9 g/kg, ensuring at least 20% of calories
  let fatGrams = Math.round(w * 0.9);
  let fatCals = fatGrams * 9;
  if (fatCals < cals * 0.20) {
    fatGrams = Math.round((cals * 0.25) / 9);
    fatCals = fatGrams * 9;
  }

  // Carbs: Remainder of calories
  const remainingCals = Math.max(0, cals - proteinCals - fatCals);
  const carbsGrams = Math.round(remainingCals / 4);

  return {
    calories: cals,
    protein: proteinGrams,
    fat: fatGrams,
    carbs: carbsGrams
  };
}

/**
 * Computes daily hydration target in ml.
 */
export function calculateWaterTarget(weightKg) {
  const w = Math.max(0, Number(weightKg) || 0);
  if (w <= 0) return MIN_WATER_ML;
  const calculated = Math.round(w * WATER_ML_PER_KG);
  return Math.max(MIN_WATER_ML, calculated);
}

/**
 * Complete profile assessment: returns BMR, TDEE, calorie target, macros, and water target.
 */
export function assessNutritionProfile({ weight, height, age, sex = 'male', activity = 'moderate', goal = 'maintain', customDelta = null }) {
  const bmr = calculateBMR({ weight, height, age, sex });
  const tdee = calculateTDEE({ bmr, activity });
  const targetCalories = calculateCalorieTarget({ tdee, goal, sex, customDelta });
  const macros = calculateMacros({ calories: targetCalories, weightKg: weight });
  const waterMl = calculateWaterTarget(weight);

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    macros,
    waterMl
  };
}
