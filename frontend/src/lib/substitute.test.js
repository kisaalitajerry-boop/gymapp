import { describe, it, expect } from 'vitest';
import { findSubstitutes } from './substitute.js';
import { EXDB } from './exercises-data.js';

describe('findSubstitutes', () => {
  const BENCH_PRESS_ID = '0025'; // 'barbell bench press', bp: 'chest', tg: 'pectorals', eq: 'barbell'

  it('never returns the original exercise in the results', () => {
    const results = findSubstitutes(BENCH_PRESS_ID, { limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(e => e.id === BENCH_PRESS_ID)).toBe(false);
  });

  it('ranks chest exercises with dumbbell/machine options near the top for barbell bench press', () => {
    const results = findSubstitutes(BENCH_PRESS_ID, { limit: 10 });
    expect(results.length).toBe(10);

    // All top substitutes must be chest/pectorals exercises
    for (const ex of results) {
      expect(ex.bp === 'chest' || ex.tg === 'pectorals').toBe(true);
    }

    // Top results should feature dumbbell and machine variations
    const topEqs = results.slice(0, 5).map(e => e.eq);
    const hasDumbbellOrMachine = topEqs.some(eq => eq === 'dumbbell' || eq === 'leverage machine' || eq === 'cable');
    expect(hasDumbbellOrMachine).toBe(true);

    // dumbbell bench press specifically should be in the top recommendations
    const hasDbBench = results.slice(0, 5).some(e => e.n.includes('dumbbell bench press'));
    expect(hasDbBench).toBe(true);
  });

  it('strictly respects the equipmentAllowed filter', () => {
    const dumbbellOnly = findSubstitutes(BENCH_PRESS_ID, { equipmentAllowed: ['dumbbell'], limit: 10 });
    expect(dumbbellOnly.length).toBeGreaterThan(0);
    for (const ex of dumbbellOnly) {
      expect(ex.eq).toBe('dumbbell');
    }

    const bodyweightOnly = findSubstitutes(BENCH_PRESS_ID, { equipmentAllowed: ['body weight'], limit: 10 });
    expect(bodyweightOnly.length).toBeGreaterThan(0);
    for (const ex of bodyweightOnly) {
      expect(ex.eq).toBe('body weight');
      expect(ex.bp === 'chest' || ex.tg === 'pectorals').toBe(true);
    }
  });

  it('handles custom exercises passed in options', () => {
    const customEx = [
      {
        id: 'cust-1',
        n: 'custom dumbbell bench press',
        bp: 'chest',
        tg: 'pectorals',
        eq: 'dumbbell',
        sm: ['triceps', 'shoulders']
      }
    ];

    const results = findSubstitutes(BENCH_PRESS_ID, { customEx, limit: 5 });
    expect(results.some(e => e.id === 'cust-1')).toBe(true);
  });

  it('returns empty array when exercise ID does not exist', () => {
    const results = findSubstitutes('non-existent-id');
    expect(results).toEqual([]);
  });
});
