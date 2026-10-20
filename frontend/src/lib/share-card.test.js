import { describe, it, expect } from 'vitest';
import { renderPrCardCanvas, generatePrCardDataUrl } from './share-card.js';

describe('PR Share Card Generator', () => {
  it('renders a 1080x1920 canvas with all personal record statistics', () => {
    const canvas = renderPrCardCanvas({
      exerciseName: 'Barbell Bench Press',
      weight: 120,
      reps: 3,
      e1rm: 132,
      unit: 'kg',
      userName: 'Alex'
    });

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1920);
  });

  it('generates a valid data URL image', () => {
    const url = generatePrCardDataUrl({
      exerciseName: 'Deadlift',
      weight: 200,
      reps: 1,
      e1rm: 200,
      unit: 'kg'
    });

    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});
