import { describe, it, expect } from 'vitest';
import { platesPerSide, DEFAULT_PLATES_LB, DEFAULT_PLATES_KG } from './plates.js';

describe('platesPerSide', () => {
  it('correctly calculates 225 lb on a 45 lb bar as [45, 45] per side', () => {
    const res = platesPerSide(225, 45, DEFAULT_PLATES_LB, 'lb');
    expect(res.plates).toEqual([45, 45]);
    expect(res.totalLoaded).toBe(225);
    expect(res.remainder).toBe(0);
  });

  it('correctly calculates 100 kg on a 20 kg bar as [25, 15] per side', () => {
    const res = platesPerSide(100, 20, DEFAULT_PLATES_KG, 'kg');
    expect(res.plates).toEqual([25, 15]);
    expect(res.totalLoaded).toBe(100);
    expect(res.remainder).toBe(0);
  });

  it('returns closest lower load + remainder for unreachable weights', () => {
    // 101 kg target with 20 kg bar -> needs 40.5 kg per side.
    // Plates available: 25, 20, 15, 10, 5, 2.5, 1.25
    // Greedy: 25 + 15 = 40 kg per side (leaves 0.5 kg per side, smallest plate is 1.25)
    // Total loaded: 20 + 80 = 100 kg. Remainder: 1 kg.
    const res = platesPerSide(101, 20, DEFAULT_PLATES_KG, 'kg');
    expect(res.plates).toEqual([25, 15]);
    expect(res.totalLoaded).toBe(100);
    expect(res.remainder).toBe(1);
  });

  it('handles target equal to or less than bar weight', () => {
    const exact = platesPerSide(45, 45, DEFAULT_PLATES_LB, 'lb');
    expect(exact.plates).toEqual([]);
    expect(exact.remainder).toBe(0);

    const under = platesPerSide(30, 45, DEFAULT_PLATES_LB, 'lb');
    expect(under.plates).toEqual([]);
    expect(under.totalLoaded).toBe(45);
    expect(under.remainder).toBe(15);
  });

  it('respects limited inventory counts', () => {
    // Only one pair of 45s available
    const inventory = [
      { weight: 45, pairs: 1 },
      { weight: 25, pairs: 4 },
      { weight: 10, pairs: 2 }
    ];
    // Target 225 needs 90 per side. If only one 45 is available: 45 + 25 + 10 + 10 = 90
    const res = platesPerSide(225, 45, inventory, 'lb');
    expect(res.plates).toEqual([45, 25, 10, 10]);
    expect(res.totalLoaded).toBe(225);
    expect(res.remainder).toBe(0);
  });

  it('uses default plates and bar weights when omitted', () => {
    const resKg = platesPerSide(60, null, null, 'kg');
    // Default bar = 20kg. Target 60kg -> needs 20kg per side -> [20]
    expect(resKg.barWeight).toBe(20);
    expect(resKg.plates).toEqual([20]);
    expect(resKg.totalLoaded).toBe(60);

    const resLb = platesPerSide(135, null, null, 'lb');
    // Default bar = 45lb. Target 135lb -> needs 45lb per side -> [45]
    expect(resLb.barWeight).toBe(45);
    expect(resLb.plates).toEqual([45]);
    expect(resLb.totalLoaded).toBe(135);
  });
});
