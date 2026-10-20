import { describe, it, expect, vi } from 'vitest';
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  SYSTEM_PROMPTS,
  extractCleanJson,
  callGemini,
  generateGeminiMealRecommendations,
  generateGeminiExerciseSubstitutes,
  generateGeminiRecoveryDiagnosis
} from './gemini.js';

describe('Unified Gemini AI Client', () => {
  it('has valid key and model configuration', () => {
    expect(typeof GEMINI_API_KEY).toBe('string');
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash');
  });

  it('defines disciplined system prompts for all AI capabilities', () => {
    expect(SYSTEM_PROMPTS.COACH).toContain('CRITICAL OPERATIONAL RULES');
    expect(SYSTEM_PROMPTS.COACH).toContain('OUTPUT ONLY JSON');
    expect(SYSTEM_PROMPTS.MEAL_VISION).toContain('Clinical Sports Dietitian');
    expect(SYSTEM_PROMPTS.MEAL_RECOMMENDER).toContain('Culinary Macro Balancing Chef');
    expect(SYSTEM_PROMPTS.EXERCISE_SUBSTITUTE).toContain('Biomechanics Consultant');
    expect(SYSTEM_PROMPTS.RECOVERY_ADVISOR).toContain('Fatigue Scientist');
  });

  it('extracts and cleans JSON from markdown fenced strings', () => {
    const raw = '```json\n{"items":[{"name":"Chicken", "p": 30}]}\n```';
    const parsed = extractCleanJson(raw);
    expect(parsed).toEqual({ items: [{ name: 'Chicken', p: 30 }] });

    const arrayRaw = 'Some prefix text: [1, 2, 3] some suffix';
    expect(extractCleanJson(arrayRaw)).toEqual([1, 2, 3]);
  });

  it('sends systemInstruction and returns parsed JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ ok: true, result: 'test' }) }]
            }
          }
        ]
      })
    });

    const res = await callGemini({
      systemPrompt: SYSTEM_PROMPTS.COACH,
      prompt: 'Hello coach',
      fetchFn: mockFetch
    });

    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ ok: true, result: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, req] = mockFetch.mock.calls[0];
    expect(url).toContain('gemini-2.5-flash:generateContent');
    expect(url).toContain(GEMINI_API_KEY);
    const body = JSON.parse(req.body);
    expect(body.systemInstruction.parts[0].text).toContain('AI Strength & Hypertrophy Coach');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('generates meal recommendations using structured system prompt', async () => {
    const mockMeals = [
      {
        name: 'Turkey Breast Bowl',
        meal: 'dinner',
        kcal: 400,
        p: 45,
        c: 30,
        f: 10,
        fitReason: 'Direct protein match'
      }
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockMeals) }] } }]
      })
    });

    const recommendations = await generateGeminiMealRecommendations({
      remainingCalories: 450,
      remainingProtein: 40,
      fetchFn: mockFetch
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].name).toBe('Turkey Breast Bowl');
  });

  it('generates exercise substitutes using kinesiology system prompt', async () => {
    const mockSubs = [
      {
        id: 'dumbbell-bench-press',
        name: 'Dumbbell Bench Press',
        score: 95,
        why: 'Equal pectoral recruitment'
      }
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockSubs) }] } }]
      })
    });

    const substitutes = await generateGeminiExerciseSubstitutes({
      exerciseName: 'Barbell Bench Press',
      targetMuscle: 'chest',
      fetchFn: mockFetch
    });

    expect(substitutes).toHaveLength(1);
    expect(substitutes[0].name).toBe('Dumbbell Bench Press');
  });

  it('generates recovery readiness diagnosis using physiology system prompt', async () => {
    const mockDiagnosis = {
      readinessScore: 85,
      readinessState: 'Optimal',
      recommendation: 'Train Upper Hypertrophy',
      physiologyInsight: 'Type-I muscle fibers recovered'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockDiagnosis) }] } }]
      })
    });

    const diag = await generateGeminiRecoveryDiagnosis({
      musclesTrained: ['chest', 'triceps'],
      gender: 'female',
      fetchFn: mockFetch
    });

    expect(diag.readinessScore).toBe(85);
    expect(diag.physiologyInsight).toContain('Type-I');
  });

  it('formats survey into structured system prompt personalization directive', async () => {
    const { formatPersonalizationDirective } = await import('./gemini.js');
    const survey = {
      goal: 'Build Muscle',
      gender: 'female',
      experience: 'Intermediate',
      daysPerWeek: 4,
      equipment: 'Commercial Gym',
      limitations: 'Lower Back',
      diet: 'High Protein',
      coachingTone: 'Hypertrophy Scientist',
      weight: 65,
      targetWeight: 68
    };

    const directive = formatPersonalizationDirective(survey);
    expect(directive).toContain('INDIVIDUAL LIFTER PERSONALIZATION PROFILE');
    expect(directive).toContain('Primary Training Goal: Build Muscle');
    expect(directive).toContain('Biological Sex: female');
    expect(directive).toContain('Dedicated Training Frequency: 4 days per week');
    expect(directive).toContain('PHYSICAL LIMITATIONS & INJURIES: Lower Back');
    expect(directive).toContain('Coaching Feedback Persona: Hypertrophy Scientist');
  });

  it('injects survey directive into systemInstruction when calling Gemini', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ ok: true }) }] } }]
      })
    });

    const survey = {
      goal: 'Fat Loss',
      gender: 'male',
      limitations: 'Shoulders'
    };

    await callGemini({
      systemPrompt: SYSTEM_PROMPTS.COACH,
      prompt: 'Suggest chest exercise',
      survey,
      fetchFn: mockFetch
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const systemText = body.systemInstruction.parts[0].text;
    expect(systemText).toContain('Primary Training Goal: Fat Loss');
    expect(systemText).toContain('PHYSICAL LIMITATIONS & INJURIES: Shoulders');
  });
});
