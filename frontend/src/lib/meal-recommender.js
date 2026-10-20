// AI Meal Recommender based on Remaining Daily Macronutrients & Calories
import { uid } from './format.js';

export const RECIPE_POOL = [
  {
    name: '0% Greek Yogurt with Blueberries & Honey',
    meal: 'snacks',
    prepTime: '3 mins',
    grams: 220,
    kcal: 185,
    p: 22,
    c: 20,
    f: 1,
    tags: ['Quick Snack', 'High Protein', 'Probiotics'],
    description: 'Creamy non-fat Greek yogurt topped with wild antioxidant blueberries and a light honey drizzle.'
  },
  {
    name: 'Whey Protein Shake with Almond Butter',
    meal: 'snacks',
    prepTime: '2 mins',
    grams: 350,
    kcal: 260,
    p: 30,
    c: 7,
    f: 12,
    tags: ['Post-Workout', 'Rapid Digestion'],
    description: '1 scoop whey isolate blended with unsweetened almond milk and natural almond butter.'
  },
  {
    name: 'Grilled Herb Chicken with Steamed Broccoli',
    meal: 'dinner',
    prepTime: '15 mins',
    grams: 300,
    kcal: 340,
    p: 46,
    c: 12,
    f: 8,
    tags: ['Lean Muscle', 'Low Carb', 'Clean Eating'],
    description: 'Marinated skinless chicken breast grilled with rosemary, paired with tender steamed broccoli florets.'
  },
  {
    name: 'Seared Sirloin Steak with Asparagus & Garlic',
    meal: 'dinner',
    prepTime: '15 mins',
    grams: 280,
    kcal: 420,
    p: 44,
    c: 6,
    f: 22,
    tags: ['Creatine Rich', 'Iron & Zinc', 'Keto Friendly'],
    description: 'Lean top sirloin pan-seared in olive oil with tender grilled asparagus spears.'
  },
  {
    name: 'Cottage Cheese Bowl with Strawberries & Walnuts',
    meal: 'snacks',
    prepTime: '3 mins',
    grams: 240,
    kcal: 230,
    p: 28,
    c: 14,
    f: 7,
    tags: ['Slow Release Casein', 'Nighttime Snack'],
    description: 'Low-fat cottage cheese loaded with fresh strawberries and crushed omega-3 walnuts.'
  },
  {
    name: 'Tuna Salad Lettuce Boats with Avocado',
    meal: 'lunch',
    prepTime: '8 mins',
    grams: 260,
    kcal: 290,
    p: 36,
    c: 8,
    f: 13,
    tags: ['Omega-3', 'Zero Grain', 'High Protein'],
    description: 'Wild albacore tuna mixed with lemon Dijon, avocado chunks, served in crisp romaine cups.'
  },
  {
    name: 'Egg White Scramble with Spinach & Feta',
    meal: 'breakfast',
    prepTime: '7 mins',
    grams: 250,
    kcal: 210,
    p: 28,
    c: 6,
    f: 7,
    tags: ['Ultra Lean', 'Bioavailable'],
    description: 'Fluffy organic egg whites folded with baby spinach leaves and crumbled Mediterranean feta.'
  },
  {
    name: 'Overnight Protein Oats with Chia & Banana',
    meal: 'breakfast',
    prepTime: '5 mins (prep)',
    grams: 320,
    kcal: 410,
    p: 32,
    c: 54,
    f: 8,
    tags: ['Sustained Energy', 'Complex Carbs'],
    description: 'Rolled whole oats soaked in protein-enriched milk with chia seeds and sliced banana.'
  },
  {
    name: 'Tofu & Edamame Sauté with Teriyaki Quinoa',
    meal: 'dinner',
    prepTime: '12 mins',
    grams: 330,
    kcal: 380,
    p: 28,
    c: 44,
    f: 11,
    tags: ['Plant Powered', 'Complete Amino Acid'],
    description: 'Crispy firm tofu cubes sautéed with green edamame and fluffy organic quinoa.'
  }
];

/**
 * Recommends up to 3 best-fitting meals based on remaining daily calories and macros.
 */
export function recommendMealsForRemainingMacros({
  remainingCalories = 500,
  remainingProtein = 40,
  remainingCarbs = 50,
  remainingFat = 15,
  meal = 'dinner'
} = {}) {
  const scored = RECIPE_POOL.map(recipe => {
    // Calorie proximity (closer to or safely below remaining calories gets higher score)
    const calDiff = Math.abs(recipe.kcal - Math.max(150, remainingCalories));
    const calScore = Math.max(0, 100 - calDiff * 0.25);

    // Protein contribution (reward meals that supply the remaining protein needed)
    const proteinCoverage = remainingProtein > 0 ? Math.min(1.5, recipe.p / remainingProtein) : 1;
    const proteinScore = Math.max(0, 100 - Math.abs(1 - proteinCoverage) * 60);

    // Meal slot bonus
    const mealBonus = recipe.meal === meal ? 15 : 0;

    const totalScore = calScore * 0.45 + proteinScore * 0.45 + mealBonus;

    let fitReason = '';
    if (recipe.p >= remainingProtein && remainingProtein > 0) {
      fitReason = `Fulfills 100% of your remaining protein target (${recipe.p}g P).`;
    } else if (remainingCalories > 0 && Math.abs(recipe.kcal - remainingCalories) < 80) {
      fitReason = `Exact match for your remaining ${remainingCalories} kcal deficit budget.`;
    } else {
      fitReason = `Clean balance providing ${recipe.p}g protein and ${recipe.kcal} kcal.`;
    }

    return {
      ...recipe,
      id: uid(),
      score: Math.round(totalScore),
      fitReason
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

import { generateGeminiMealRecommendations } from './gemini.js';

/**
 * Generates dynamic Gemini AI-tailored meal recommendations with system prompt guidance,
 * gracefully falling back to local pool scoring if offline.
 */
export async function recommendAiMealsForRemainingMacros(options = {}) {
  try {
    const aiMeals = await generateGeminiMealRecommendations(options);
    if (Array.isArray(aiMeals) && aiMeals.length > 0) {
      return aiMeals.map(m => ({
        ...m,
        id: m.id || uid(),
        score: m.score || 95,
        fitReason: m.fitReason || `AI customized for your remaining ${options.remainingCalories || 500} kcal budget.`
      }));
    }
  } catch (err) {
    console.warn('Gemini Meal Recommender fallback to local pool:', err.message);
  }
  return recommendMealsForRemainingMacros(options);
}
