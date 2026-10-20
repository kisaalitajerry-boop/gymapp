// Unified Google Gemini AI Client for openGym
// Powers all AI features with a single API configuration and disciplined system prompts.

export const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || '';
export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Disciplined System Prompts for each specific AI capability in openGym.
 * Guarantees each feature follows strict operational constraints, structured schemas,
 * and domain-expert behavior without hallucinations or wandering off-task.
 */
export const SYSTEM_PROMPTS = {
  COACH: `You are the elite AI Strength & Hypertrophy Coach inside openGym.
You specialize in science-backed progressive resistance training, periodization, and fatigue management.

CRITICAL OPERATIONAL RULES:
1. OUTPUT ONLY JSON: Respond exclusively with a valid JSON object matching the requested schema. No conversation, no markdown codeblocks, no preamble.
2. EXERCISE INTEGRITY: Every exercise ID must strictly match the provided library. Never fabricate exercise IDs.
3. EMPIRICAL PROGRESSION: Ground every recommendation on logged training volume, consecutive stalls, and RIR/RPE effort signals.
4. SAFETY FIRST: Never program high spinal or joint loading through user-reported joint pain.
5. CITE EVIDENCE: Always give a clear, succinct biomechanical rationale for every proposed change.`,

  MEAL_VISION: `You are a Board-Certified Clinical Sports Dietitian and Computer Vision Nutrition Analyst for openGym.
Your objective is to identify plate items accurately and compute realistic portion weights, calories, and macronutrients.

CRITICAL OPERATIONAL RULES:
1. STRICT JSON ONLY: Return ONLY a valid JSON object matching the requested schema. No markdown formatting, backticks, or conversational preamble.
2. RIGOROUS NUTRITION MATHEMATICS: Total calories must match item sums and macro math (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g).
3. VISUAL GRANULARITY: Segment individual ingredients and provide realistic portion weights in grams.
4. ATHLETE CALIBRATION: Avoid undercounting hidden cooking fats or overestimating lean meat portions.
5. REALISTIC CONFIDENCE: Rate item confidence between 0.1 and 1.0 based on visual clarity and occlusion.
6. DIET QUALITY SCORE: Rate overall nutritional density from 1.0 to 10.0 based on whole-food micronutrient richness.`,

  MEAL_RECOMMENDER: `You are an Elite Sports Nutritionist and Culinary Macro Balancing Chef for openGym.
Your task is to recommend high-protein, delicious, realistic meals that specifically target the lifter's remaining daily calorie and macro deficits.

CRITICAL OPERATIONAL RULES:
1. OUTPUT ONLY JSON: Return an array of recommended meal objects matching the schema:
[
  {
    "name": "Meal Name",
    "meal": "breakfast" | "lunch" | "dinner" | "snacks",
    "prepTime": "10 mins",
    "grams": 300,
    "kcal": 420,
    "p": 45,
    "c": 30,
    "f": 12,
    "tags": ["High Protein", "Quick Prep"],
    "description": "Short culinary summary",
    "fitReason": "Exact explanation of why this fills the user's deficit"
  }
]
2. PRECISE DEFICIT TARGETING: Match remaining calories and protein needs closely without blowing past the caloric allowance.
3. WHOLE FOOD NUTRITION: Recommend accessible, appetizing meals with simple preparation steps and real ingredients.
4. RATIONALE: State explicitly how each meal satisfies the lifter's remaining nutritional budget.`,

  EXERCISE_SUBSTITUTE: `You are an Advanced Kinesiology Specialist and Biomechanics Consultant for openGym.
Your goal is to provide the top 3-5 biomechanically equivalent exercise substitutions based on movement patterns, equipment, and anatomical muscle focus.

CRITICAL OPERATIONAL RULES:
1. OUTPUT ONLY JSON: Return a JSON array of validated substitution objects matching the schema:
[
  {
    "id": "exercise-id",
    "name": "Exercise Name",
    "score": 95,
    "equipment": "dumbbell",
    "target": "chest",
    "why": "Biomechanical rationale explaining why this replacement preserves stimulus and joint angle."
  }
]
2. BIOMECHANICAL MATCHING: Prioritize identical primary muscle recruitment, resistance curves (shortened vs lengthened position), and joint angles.
3. EQUIPMENT COMPATIBILITY: Restrict recommendations to equipment the user actually has.
4. SAFETY & EXECUTION CUES: Provide precise setup and execution cues to minimize joint stress while maximizing mechanical tension.`,

  RECOVERY_ADVISOR: `You are a Sports Recovery Physiologist and Fatigue Scientist for openGym.
Your role is to analyze muscular recovery status, systemic fatigue, sleep, hydration, and gender-specific physiology to provide today's readiness diagnosis.

CRITICAL OPERATIONAL RULES:
1. OUTPUT ONLY JSON: Return structured recovery analysis matching this schema:
{
  "readinessScore": 88,
  "readinessState": "Optimal" | "Moderate" | "Fatigued" | "Deload",
  "recommendation": "Today's main training recommendation",
  "physiologyInsight": "Insight tailored to lifter gender and metabolic recovery profile",
  "activeRecoveryPrescription": "Actionable mobility, hydration, or warm-up advice"
}
2. EVIDENCE-BASED PHYSIOLOGY: Consider biological sex recovery characteristics (e.g. female intra-set substrate efficiency vs male mechanical tension recovery needs).
3. DIRECT PRESCRIPTIONS: Prescribe clear, practical advice for training today.`
};

/**
 * Extracts and cleans JSON from a model response, removing any backticks or extraneous text.
 */
export function extractCleanJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/i, '');
  }

  // Find the first { or [ and last } or ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const isArray = text[startIdx] === '[';
    const endChar = isArray ? ']' : '}';
    const endIdx = text.lastIndexOf(endChar);
    if (endIdx > startIdx) {
      text = text.substring(startIdx, endIdx + 1);
    }
  }

  return JSON.parse(text);
}

import { useStore } from '../store/useStore.js';

/**
 * Formats the detailed lifter survey into a mandatory system personalization directive.
 */
export function formatPersonalizationDirective(survey = null) {
  let s = survey;
  if (!s) {
    try {
      s = useStore.getState().S?.survey || null;
    } catch {
      s = null;
    }
  }

  if (!s || typeof s !== 'object' || Object.keys(s).length === 0) {
    return '';
  }

  const lines = ['\n\nINDIVIDUAL LIFTER PERSONALIZATION PROFILE (MANDATORY GROUND TRUTH):'];

  if (s.goal) lines.push(`- Primary Training Goal: ${s.goal}`);
  if (s.gender) {
    lines.push(`- Biological Sex: ${s.gender} (${s.gender === 'female' ? 'Estrogen-mediated oxidative endurance, rapid intra-set metabolic clearance, lower-body glute/hamstring focus' : 'Higher mechanical tension, high central nervous system fatigue demands'})`);
  }
  if (s.experience) lines.push(`- Training Experience Level: ${s.experience}`);
  if (s.daysPerWeek) lines.push(`- Dedicated Training Frequency: ${s.daysPerWeek} days per week`);
  if (s.equipment) lines.push(`- Available Equipment Environment: ${s.equipment}`);
  if (s.limitations && s.limitations !== 'none' && s.limitations !== 'None') {
    lines.push(`- PHYSICAL LIMITATIONS & INJURIES: ${s.limitations} (CRITICAL: Do NOT load these areas with axial/joint shearing; prescribe biomechanically friendly alternatives)`);
  }
  if (s.diet) lines.push(`- Nutrition Style / Diet: ${s.diet}`);
  if (s.coachingTone) lines.push(`- Coaching Feedback Persona: ${s.coachingTone}`);
  if (s.weight && s.targetWeight) {
    lines.push(`- Body Metrics: Current ${s.weight}kg -> Target ${s.targetWeight}kg`);
  }

  lines.push('You MUST strictly personalize all advice, volume, rest times, and meal suggestions around this individual athlete.');
  return lines.join('\n');
}

/**
 * Returns a personalized system prompt for any AI feature.
 */
export function getPersonalizedSystemPrompt(featureKey, survey = null) {
  const base = SYSTEM_PROMPTS[featureKey] || SYSTEM_PROMPTS.COACH;
  const directive = formatPersonalizationDirective(survey);
  return base + directive;
}

/**
 * Unified caller for Google Gemini 2.5 Flash.
 *
 * @param {Object} options
 * @param {string} options.systemPrompt - Disciplined system instruction controlling model persona & rules
 * @param {string} options.prompt - User instruction or payload
 * @param {Object} [options.survey] - Optional survey override for personalization
 * @param {string} [options.imageDataUrl] - Optional base64/data URL image for multimodal analysis
 * @param {string} [options.apiKey] - Optional override key (defaults to global unified key)
 * @param {string} [options.model] - Optional override model (defaults to gemini-2.5-flash)
 * @param {number} [options.temperature] - Generation temperature (default 0.2 for deterministic precision)
 * @param {Function} [options.fetchFn] - Custom fetch function for tests
 * @returns {Promise<{ ok: boolean, data: any, rawText: string }>}
 */
export async function callGemini({
  systemPrompt = SYSTEM_PROMPTS.COACH,
  prompt,
  survey = null,
  imageDataUrl = null,
  apiKey = GEMINI_API_KEY,
  model = GEMINI_MODEL,
  temperature = 0.2,
  fetchFn = globalThis.fetch
} = {}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const userParts = [{ text: prompt }];

  if (imageDataUrl && typeof imageDataUrl === 'string') {
    let mimeType = 'image/jpeg';
    let base64Data = imageDataUrl;
    if (imageDataUrl.startsWith('data:')) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }
    userParts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: userParts
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature
    }
  };

  if (systemPrompt) {
    let finalPrompt = systemPrompt;
    const directive = formatPersonalizationDirective(survey);
    if (directive && !finalPrompt.includes('INDIVIDUAL LIFTER PERSONALIZATION PROFILE')) {
      finalPrompt += directive;
    }
    requestBody.systemInstruction = {
      parts: [{ text: finalPrompt }]
    };
  }

  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsedData = extractCleanJson(rawText);

  return {
    ok: true,
    data: parsedData,
    rawText
  };
}

/**
 * AI Meal Recommendation Generator powered by Gemini
 */
export async function generateGeminiMealRecommendations({
  remainingCalories = 500,
  remainingProtein = 40,
  remainingCarbs = 50,
  remainingFat = 15,
  meal = 'dinner',
  userGoal = 'hypertrophy',
  fetchFn = globalThis.fetch
} = {}) {
  const prompt = `Generate 3 high-protein meals specifically designed for an athlete with:
- Remaining Calorie Budget: ${remainingCalories} kcal
- Remaining Protein Need: ${remainingProtein}g
- Remaining Carbohydrates: ${remainingCarbs}g
- Remaining Dietary Fat: ${remainingFat}g
- Target Meal: ${meal}
- Training Goal: ${userGoal}

Ensure each meal's calories and macros directly fill this deficit with minimal spillover.`;

  const { data } = await callGemini({
    systemPrompt: SYSTEM_PROMPTS.MEAL_RECOMMENDER,
    prompt,
    fetchFn
  });

  return Array.isArray(data) ? data : data?.meals || [];
}

/**
 * AI Exercise Substitute Engine powered by Gemini
 */
export async function generateGeminiExerciseSubstitutes({
  exerciseName = 'Barbell Bench Press',
  targetMuscle = 'chest',
  equipmentAvailable = ['dumbbell', 'cable', 'body weight'],
  reason = 'equipment unavailable',
  fetchFn = globalThis.fetch
} = {}) {
  const prompt = `Recommend 3 biomechanically superior exercise substitutes for:
- Exercise to replace: ${exerciseName}
- Target Muscle: ${targetMuscle}
- Available Equipment: ${equipmentAvailable.join(', ')}
- Reason for replacement: ${reason}

Rank them by biomechanical equivalence and mechanical tension.`;

  const { data } = await callGemini({
    systemPrompt: SYSTEM_PROMPTS.EXERCISE_SUBSTITUTE,
    prompt,
    fetchFn
  });

  return Array.isArray(data) ? data : data?.substitutes || [];
}

/**
 * AI Recovery & Readiness Diagnosis powered by Gemini
 */
export async function generateGeminiRecoveryDiagnosis({
  musclesTrained = [],
  hoursSinceLastSession = 24,
  gender = 'female',
  sleepQuality = 'good',
  waterLoggedLiters = 2.5,
  fetchFn = globalThis.fetch
} = {}) {
  const prompt = `Analyze readiness and recovery for a ${gender} lifter:
- Muscles recently trained: ${musclesTrained.join(', ') || 'Rest day yesterday'}
- Hours since last workout: ${hoursSinceLastSession}
- Sleep quality: ${sleepQuality}
- Hydration: ${waterLoggedLiters} Liters
- Lifter biological sex: ${gender}

Provide actionable guidance incorporating gender recovery dynamics.`;

  const { data } = await callGemini({
    systemPrompt: SYSTEM_PROMPTS.RECOVERY_ADVISOR,
    prompt,
    fetchFn
  });

  return data;
}
