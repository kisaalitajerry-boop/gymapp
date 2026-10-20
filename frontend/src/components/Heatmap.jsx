import { useEffect, useRef, useState } from 'react';
import { fmtVol, isoOf, todayISO, MONTHS } from '../lib/format.js';
import { t } from '../lib/i18n.js';
import { computeWorkoutStreak, computeWaterStreak, computeMacroStreak } from '../lib/streaks.js';
import { dailyWater, dailyMacros, DEFAULT_TARGETS } from '../lib/nutrition.js';
import Icon from './Icon.jsx';

// Multi-metric GitHub-style activity heatmap (Task 35)
export default function Heatmap({ S, onDay, initialMetric = 'training', showSwitch = true }) {
  const wrapRef = useRef(null);
  const [metric, setMetric] = useState(initialMetric);

  useEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollLeft = wrapRef.current.scrollWidth;
  }, []);

  const targets = S.nutritionTargets || DEFAULT_TARGETS;
  const waterTarget = targets.waterMl || 3000;
  const calTarget = targets.calories || 2400;

  // Streaks
  const workoutStreak = computeWorkoutStreak(S.workouts, S.week || {});
  const waterStreak = computeWaterStreak(S.waterLog || [], waterTarget);
  const macroStreak = computeMacroStreak(S.foodLog || [], targets);

  // 1. Training Aggregation
  const trainAgg = {};
  (S.workouts || []).forEach(w => {
    const a = (trainAgg[w.d] = trainAgg[w.d] || { n: 0, vol: 0, min: 0 });
    a.n++;
    a.vol += w.vol || 0;
    a.min += Math.max(0, Math.round(((w.end || w.start) - w.start) / 60000));
  });
  const mins = Object.values(trainAgg).map(a => a.min).filter(v => v > 0).sort((a, b) => a - b);
  const q = p => (mins.length ? mins[Math.min(mins.length - 1, Math.floor(p * mins.length))] : 0);
  const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75);

  const trainLevel = a => (!a ? 0 : !a.min ? 1 : a.min >= t3 ? 4 : a.min >= t2 ? 3 : a.min >= t1 ? 2 : 1);

  // 2. Water Aggregation
  const waterLevel = key => {
    const ml = dailyWater(S.waterLog || [], key);
    if (!ml || ml <= 0) return 0;
    const ratio = ml / waterTarget;
    if (ratio >= 1.0) return 4;
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  };

  // 3. Nutrition Aggregation
  const nutritionLevel = key => {
    const m = dailyMacros(S.foodLog || [], key);
    if (!m || m.calories <= 0) return 0;
    const ratio = m.calories / calTarget;
    if (ratio >= 0.9 && ratio <= 1.1) return 4; // Right on target
    if (ratio >= 0.75 && ratio <= 1.25) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  };

  const getCellData = key => {
    if (metric === 'water') {
      const ml = dailyWater(S.waterLog || [], key);
      return {
        level: waterLevel(key),
        title: `${key} · ${ml} ml (${Math.round((ml / waterTarget) * 100)}% of goal)`
      };
    }
    if (metric === 'nutrition') {
      const m = dailyMacros(S.foodLog || [], key);
      return {
        level: nutritionLevel(key),
        title: `${key} · ${m.calories} kcal · ${m.protein}g P · ${m.carbs}g C · ${m.fat}g F`
      };
    }
    const a = trainAgg[key];
    return {
      level: trainLevel(a),
      title: key + (a ? ` · ${t(a.n === 1 ? '{0} workout' : '{0} workouts', a.n)} · ${a.min} min · ${fmtVol(a.vol, S.unit)}` : '')
    };
  };

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const start = new Date(end);
  start.setDate(end.getDate() - 52 * 7);

  const months = [];
  const cols = [];
  let lastMonth = -1;

  for (let wk = 0; wk <= 52; wk++) {
    const colStart = new Date(start);
    colStart.setDate(start.getDate() + wk * 7);
    const mo = colStart.getMonth();
    const showM = mo !== lastMonth && colStart.getDate() <= 7 && wk < 51;
    months.push(<span key={wk}>{showM ? t(MONTHS[mo]) : ''}</span>);
    if (colStart.getDate() <= 7) lastMonth = mo;

    const cells = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(colStart);
      day.setDate(colStart.getDate() + d);
      const key = isoOf(day);
      const data = getCellData(key);

      const cls =
        'hm-c l' +
        data.level +
        (key === todayISO() ? ' today' : '') +
        (day > today ? ' future' : '');

      cells.push(
        <div
          key={d}
          className={cls}
          title={data.title}
          onClick={metric === 'training' && trainAgg[key] ? () => onDay(key) : undefined}
        />
      );
    }
    cols.push(
      <div key={wk} className="hm-col">
        {cells}
      </div>
    );
  }

  return (
    <>
      {showSwitch && (
        <div className="row between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          {/* Metric Switch */}
          <div className="seg" style={{ width: 'auto', minWidth: 220, height: 32 }}>
            <button
              className={metric === 'training' ? 'on' : ''}
              onClick={() => setMetric('training')}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {t('Workouts')}
            </button>
            <button
              className={metric === 'water' ? 'on' : ''}
              onClick={() => setMetric('water')}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {t('Water')}
            </button>
            <button
              className={metric === 'nutrition' ? 'on' : ''}
              onClick={() => setMetric('nutrition')}
              style={{ fontSize: 12, padding: '4px 10px' }}
            >
              {t('Nutrition')}
            </button>
          </div>

          {/* Streak Badge (Task 35) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(5, 242, 146, 0.1)',
              border: '1px solid var(--acc)',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--acc)'
            }}
          >
            <Icon
              name={metric === 'water' ? 'droplet' : metric === 'nutrition' ? 'sparkles' : 'flame'}
              size={13}
              style={{
                color: metric === 'water' ? '#38bdf8' : metric === 'nutrition' ? '#a855f7' : 'var(--acc)'
              }}
            />
            <span>
              {metric === 'water'
                ? `${waterStreak.current} ${t('day streak')}`
                : metric === 'nutrition'
                ? `${macroStreak.current} ${t('day streak')}`
                : `${workoutStreak.current} ${t('day streak')}`}
            </span>
          </div>
        </div>
      )}

      <div className="hm-wrap" ref={wrapRef}>
        <div className="hm-months" style={{ marginLeft: 30 }}>
          {months}
        </div>
        <div className="hm-body">
          <div className="hm-days">
            <span>{t('Mon')}</span>
            <span />
            <span>{t('Wed')}</span>
            <span />
            <span>{t('Fri')}</span>
            <span />
            <span />
          </div>
          <div className="hm-grid">{cols}</div>
        </div>
      </div>

      <div className="hm-legend">
        {metric === 'water' ? t('Less water') : metric === 'nutrition' ? t('Low calories') : t('Less time')}
        <div className="hm-c l0" />
        <div className="hm-c l1" />
        <div className="hm-c l2" />
        <div className="hm-c l3" />
        <div className="hm-c l4" />
        {metric === 'water' ? t('Target reached') : metric === 'nutrition' ? t('On target') : t('More time')}
      </div>
    </>
  );
}
