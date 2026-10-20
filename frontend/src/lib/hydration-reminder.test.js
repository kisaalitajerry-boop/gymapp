import { describe, it, expect } from 'vitest';
import { checkHydrationAlert } from './hydration-reminder.js';
import { todayISO } from './format.js';

describe('hydration-reminder.js', () => {
  const today = todayISO();

  it('does not alert if daily water goal has already been reached', () => {
    const logs = [{ date: today, amountMl: 3200, timestamp: Date.now() - 3600000 }];
    const alert = checkHydrationAlert(logs, 3000);
    expect(alert.shouldAlert).toBe(false);
    expect(alert.reason).toBe('goal_reached');
  });

  it('alerts when more than 2 hours have passed since last drink', () => {
    // 2.5 hours ago at 2 PM
    const midAfternoon = new Date();
    midAfternoon.setHours(14, 30, 0, 0);
    const twoAndHalfHoursAgo = midAfternoon.getTime() - 150 * 60 * 1000;

    const logs = [{ date: today, amountMl: 500, timestamp: twoAndHalfHoursAgo }];
    const alert = checkHydrationAlert(logs, 3000, midAfternoon.getTime());

    expect(alert.shouldAlert).toBe(true);
    expect(alert.elapsedHours).toBeGreaterThanOrEqual(2);
    expect(alert.message).toContain('hours since your last drink');
  });

  it('does not alert if user just drank water 30 minutes ago', () => {
    const midAfternoon = new Date();
    midAfternoon.setHours(14, 30, 0, 0);
    const thirtyMinsAgo = midAfternoon.getTime() - 30 * 60 * 1000;

    const logs = [{ date: today, amountMl: 500, timestamp: thirtyMinsAgo }];
    const alert = checkHydrationAlert(logs, 3000, midAfternoon.getTime());

    expect(alert.shouldAlert).toBe(false);
  });
});
