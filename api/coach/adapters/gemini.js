/* Google Gemini API adapter for openGym / MuscleTrack AI Coach.
 *
 * Direct REST invocation against Google Generative Language API.
 * Uses structured JSON output mode (responseMimeType: "application/json")
 * and Flash model for rapid, cost-effective inference.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';

export const COACH_SYSTEM_PROMPT = `You are the elite AI Strength & Hypertrophy Coach inside openGym.
You specialize in science-backed progressive resistance training, periodization, and fatigue management.

CRITICAL OPERATIONAL RULES:
1. OUTPUT ONLY JSON: Respond exclusively with a valid JSON object matching the requested schema. No conversation, no markdown codeblocks, no preamble.
2. EXERCISE INTEGRITY: Every exercise ID must strictly match the provided library. Never fabricate exercise IDs.
3. EMPIRICAL PROGRESSION: Ground every recommendation on logged training volume, consecutive stalls, and RIR/RPE effort signals.
4. SAFETY FIRST: Never program high spinal or joint loading through user-reported joint pain.
5. CITE EVIDENCE: Always give a clear, succinct biomechanical rationale for every proposed change.`;

export class GeminiAdapter {
  constructor(options = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  async check(cfg, env = {}) {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'GEMINI_API_KEY is not configured' };
    }
    return { ok: true, version: 'Gemini 2.5 Flash API' };
  }

  async invoke({ prompt, jobDir, env = {}, model = DEFAULT_MODEL, timeoutMs = 60000 }) {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        code: 1,
        text: '',
        stderr: 'GEMINI_API_KEY is missing from environment',
        timedOut: false,
        spawnError: false
      };
    }

    const abortController = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, timeoutMs);

    const targetModel = model || env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: {
        parts: [{ text: COACH_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          code: response.status,
          text: '',
          stderr: `Gemini API error (${response.status}): ${errText.slice(0, 300)}`,
          timedOut: false,
          spawnError: false
        };
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        code: 0,
        text: rawText.trim(),
        stderr: '',
        timedOut: false,
        spawnError: false
      };
    } catch (err) {
      if (timedOut) {
        return {
          code: -1,
          text: '',
          stderr: 'Gemini request timed out',
          timedOut: true,
          spawnError: false
        };
      }
      return {
        code: 1,
        text: '',
        stderr: err.message || 'Gemini invocation error',
        timedOut: false,
        spawnError: false
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

const defaultInstance = new GeminiAdapter();
export default defaultInstance;
