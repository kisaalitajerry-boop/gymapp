// Streaks computation: workout streaks (rest-day resilient), hydration and macro consistency.
import { todayISO } from './format.js';
import { dailyWater, dailyMacros } from './nutrition.js';

export function shiftDate(dateStr, daysDelta = 0) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysDelta));
  return dt.toISOString().slice(0, 10);
}

/**
 * Checks if a specific date string is a scheduled workout day according to the user's plan.
 * S.week maps 0 (Sun) ... 6 (Sat) -> routineId or null (rest).
 */
export function isScheduledDay(dateStr, weekPlan = {}) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay();
  return !!weekPlan[dayOfWeek];
}

/**
 * Computes current streak of completed workouts without penalizing rest days.
 */
export function computeWorkoutStreak(history = [], weekPlan = {}, today = todayISO()) {
  const workoutDates = new Set((history || []).map(h => (h.d || '').slice(0, 10)).filter(Boolean));

  let currentStreak = 0;
  let currentDate = today;

  // Check today: if today is a scheduled day and not done yet, don't penalize unless today is over.
  const todayScheduled = isScheduledDay(today, weekPlan);
  const todayDone = workoutDates.has(today);

  if (todayDone) {
    currentStreak++;
    currentDate = shiftDate(today, -1);
  } else if (!todayScheduled) {
    // Rest day today, step back to yesterday
    currentDate = shiftDate(today, -1);
  } else {
    // Today is scheduled but not done yet: check if previous days formed an active streak
    currentDate = shiftDate(today, -1);
  }

  // Walk backwards day by day
  for (let i = 0; i < 365; i++) {
    const scheduled = isScheduledDay(currentDate, weekPlan);
    const done = workoutDates.has(currentDate);

    if (done) {
      currentStreak++;
    } else if (scheduled) {
      // Missed a scheduled workout day -> streak ends
      break;
    }
    currentDate = shiftDate(currentDate, -1);
  }

  return { current: currentStreak };
}

/**
 * Computes consecutive days meeting the daily water intake target.
 */
export function computeWaterStreak(waterLog = [], targetMl = 2500, today = todayISO()) {
  let streak = 0;
  let currentDate = today;

  for (let i = 0; i < 365; i++) {
    const total = dailyWater(waterLog, currentDate);

    if (total >= targetMl) {
      streak++;
    } else if (i === 0) {
      // Today might still be in progress, check yesterday
    } else {
      break;
    }
    currentDate = shiftDate(currentDate, -1);
  }

  return { current: streak };
}

/**
 * Computes consecutive days meeting calorie or macro targets.
 * A day is compliant if calories are within 25% of target or protein is at least 90% of target.
 */
export function computeMacroStreak(foodLog = [], targets = {}, today = todayISO()) {
  const calTarget = targets.calories || 2000;
  const pTarget = targets.protein || 120;
  let streak = 0;
  let currentDate = today;

  for (let i = 0; i < 365; i++) {
    const m = dailyMacros(foodLog, currentDate);
    const metCalories = m.calories > 0 && Math.abs(m.calories - calTarget) / calTarget <= 0.25;
    const metProtein = m.protein > 0 && m.protein >= pTarget * 0.9;

    if (metCalories || metProtein) {
      streak++;
    } else if (i === 0) {
      // Today might still be in progress
    } else {
      break;
    }
    currentDate = shiftDate(currentDate, -1);
  }

  return { current: streak };
}

/**
 * Combined streak summaries across workouts, water and nutrition.
 */
export function computeStreaks(history = [], weekPlan = {}, nutrition = {}, today = todayISO()) {
  const targetWater = nutrition?.targets?.waterMl || 2500;
  return {
    workout: computeWorkoutStreak(history, weekPlan, today),
    water: computeWaterStreak(nutrition?.waterLog || [], targetWater, today),
    nutrition: computeMacroStreak(nutrition?.foodLog || [], nutrition?.targets || {}, today)
  };
}
