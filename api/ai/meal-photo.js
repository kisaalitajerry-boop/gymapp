import { MealPhotoResponseSchema } from './schema.js';
import { isUserPro } from '../billing/webhook.js';

// In-memory quota tracker: Map<"userId:YYYY-MM-DD", count>
const quotaTracker = new Map();

export const DAILY_LIMIT = 20;

export function getTodayKey(userId) {
  const d = new Date().toISOString().slice(0, 10);
  return `${userId}:${d}`;
}

export function checkAndIncrementQuota(userId, limit = DAILY_LIMIT, customStore = null) {
  const store = customStore || quotaTracker;
  const key = getTodayKey(userId);
  const current = store.get(key) || 0;
  if (current >= limit) {
    return { allowed: false, current, limit };
  }
  store.set(key, current + 1);
  return { allowed: true, current: current + 1, limit };
}

export async function handleMealPhoto({
  user,
  body,
  env = process.env,
  fetchFn = globalThis.fetch,
  customQuotaStore = null
}) {
  // 1. Pro check
  if (!isUserPro(user)) {
    return {
      status: 402,
      error: 'Pro subscription required for AI meal photo scanning'
    };
  }

  // 2. Validate input
  if (!body || !body.image) {
    return {
      status: 400,
      error: 'Missing image payload'
    };
  }

  // 3. Quota check
  const quota = checkAndIncrementQuota(user.id, Number(env.MEAL_PHOTO_DAILY_LIMIT) || DAILY_LIMIT, customQuotaStore);
  if (!quota.allowed) {
    return {
      status: 429,
      error: `Daily meal photo scan limit reached (${quota.limit}/day)`
    };
  }

  // 4. Parse image mime and base64
  let mimeType = 'image/jpeg';
  let base64Data = body.image;
  if (typeof body.image === 'string' && body.image.startsWith('data:')) {
    const match = body.image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      error: 'GEMINI_API_KEY is not configured on server'
    };
  }

  // 5. Call Gemini 2.5 Flash
  const targetModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const promptText = `You are an expert sports nutrition analysis AI.
Analyze the meal in the image and estimate the portion size and nutritional macronutrients.
Return a single JSON object strictly matching this schema:
{
  "items": [
    {
      "name": "Food item name",
      "grams": 150,
      "kcal": 220,
      "p": 25,
      "c": 10,
      "f": 8,
      "confidence": 0.92
    }
  ]
}
Be realistic with serving sizes and macronutrients. Only output valid JSON without markdown wrapping.`;

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `You are a Board-Certified Clinical Sports Dietitian and Computer Vision Nutrition Analyst for openGym.
Your objective is to identify plate items accurately and compute realistic portion weights, calories, and macronutrients.

CRITICAL OPERATIONAL RULES:
1. STRICT JSON ONLY: Return ONLY a valid JSON object matching the requested schema. No markdown formatting, backticks, or conversational preamble.
2. RIGOROUS NUTRITION MATHEMATICS: Total calories must match item sums and macro math (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g).
3. VISUAL GRANULARITY: Segment individual ingredients and provide realistic portion weights in grams.
4. ATHLETE CALIBRATION: Avoid undercounting hidden cooking fats or overestimating lean meat portions.
5. REALISTIC CONFIDENCE: Rate item confidence between 0.1 and 1.0 based on visual clarity and occlusion.`
        }
      ]
    },
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        status: 502,
        error: `Vision AI service error (${res.status}): ${errText.slice(0, 100)}`
      };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        status: 502,
        error: 'AI service returned empty response'
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      return {
        status: 502,
        error: 'Malformed AI response format'
      };
    }

    const validation = MealPhotoResponseSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        status: 502,
        error: 'AI response did not match expected nutritional schema',
        details: validation.error.issues
      };
    }

    return {
      status: 200,
      data: validation.data
    };
  } catch (err) {
    return {
      status: 502,
      error: `Failed to analyze meal photo: ${err.message}`
    };
  }
}
