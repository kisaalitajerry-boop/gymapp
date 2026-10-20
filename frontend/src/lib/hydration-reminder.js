// Smart Hydration Reminder Engine for MuscleTrack & Cal AI
import { todayISO } from './format.js';
import { dailyWater } from './nutrition.js';

/**
 * Evaluates whether an in-app or push alert should be triggered for water intake.
 */
export function checkHydrationAlert(waterLog = [], targetMl = 3000, now = Date.now(), wakeHour = 8) {
  const today = todayISO();
  const currentTotal = dailyWater(waterLog, today);

  // If already reached daily target, no alert needed
  if (currentTotal >= targetMl) {
    return { shouldAlert: false, reason: 'goal_reached', currentTotal, targetMl };
  }

  // Find most recent intake today
  const todayEntries = (waterLog || [])
    .filter(e => e.date === today && e.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp);

  const nowDate = new Date(now);
  const currentHour = nowDate.getHours();

  // Don't alert during sleeping hours (e.g., before 8 AM or after 10 PM)
  if (currentHour < wakeHour || currentHour >= 22) {
    return { shouldAlert: false, reason: 'quiet_hours', currentTotal, targetMl };
  }

  let lastIntakeTime;
  if (todayEntries.length > 0) {
    lastIntakeTime = Number(todayEntries[0].timestamp);
  } else {
    // If no intake yet, count from 8 AM this morning
    const morning = new Date(now);
    morning.setHours(wakeHour, 0, 0, 0);
    lastIntakeTime = morning.getTime();
  }

  const elapsedMs = Math.max(0, now - lastIntakeTime);
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
  const elapsedHours = Math.floor(elapsedMinutes / 60);

  // Alert if more than 2 hours (120 minutes) have elapsed since last intake
  const shouldAlert = elapsedMinutes >= 120;

  return {
    shouldAlert,
    currentTotal,
    targetMl,
    remainingMl: Math.max(0, targetMl - currentTotal),
    elapsedMinutes,
    elapsedHours,
    title: 'Hydration Check',
    message: elapsedHours >= 2
      ? `It has been ${elapsedHours} hours since your last drink. Stay hydrated with a glass of water (250 ml)!`
      : 'Keep your hydration on track toward your 3.0L daily goal.'
  };
}

/**
 * Triggers a browser native notification if permitted.
 */
export async function triggerHydrationNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png'
    });
    return true;
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192.png'
      });
      return true;
    }
  }
  return false;
}
