import { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import { t } from '../lib/i18n.js';
import { todayISO } from '../lib/format.js';
import { estimateAdaptiveTdee } from '../lib/adaptive-tdee.js';
import Icon from './Icon.jsx';

export default function CheckIn({ onDismiss }) {
  const S = useStore(s => s.S);
  const update = useStore(s => s.update);
  const toast = useUI(s => s.toast);

  // Derive weights from S.bodyweight: [{ d: 'YYYY-MM-DD', w: number }]
  const weights = (S.bodyweight || []).map(b => ({ date: b.d, weight: b.w }));

  // Derive daily calorie intakes from S.foodLog: [{ date: 'YYYY-MM-DD', kcal: number }]
  const intakeAgg = {};
  (S.foodLog || []).forEach(f => {
    if (f.date && f.kcal) {
      intakeAgg[f.date] = (intakeAgg[f.date] || 0) + Number(f.kcal);
    }
  });
  const intakes = Object.entries(intakeAgg).map(([date, calories]) => ({ date, calories }));

  const currentTargets = S.nutritionTargets || { calories: 2400, protein: 160, carbs: 260, fat: 80 };
  const baselineTdee = currentTargets.calories || 2400;

  const adaptive = estimateAdaptiveTdee(weights, intakes, baselineTdee);

  // Proposed calories adjusted for user goal (surplus/deficit)
  const goal = S.userGoal || 'build_muscle';
  const goalAdjustment = goal === 'build_muscle' ? 250 : goal === 'lose_fat' ? -400 : 0;
  const proposedCalories = Math.max(1200, Math.round(adaptive.estimatedTdee + goalAdjustment));

  // Scale macros proportionally
  const calRatio = proposedCalories / Math.max(1000, currentTargets.calories);
  const proposedProtein = Math.round(currentTargets.protein * (calRatio > 1 ? 1.05 : 1)); // protect protein
  const proposedFat = Math.round(currentTargets.fat * calRatio);
  const proposedCarbs = Math.max(50, Math.round((proposedCalories - (proposedProtein * 4 + proposedFat * 9)) / 4));

  const handleAccept = () => {
    const today = todayISO();
    const updatedTargets = {
      ...currentTargets,
      calories: proposedCalories,
      protein: proposedProtein,
      carbs: proposedCarbs,
      fat: proposedFat
    };

    const checkInRecord = {
      date: today,
      estimatedTdee: adaptive.estimatedTdee,
      proposedCalories,
      acceptedAt: Date.now()
    };

    update(s => {
      s.nutritionTargets = updatedTargets;
      s.checkInHistory = [checkInRecord, ...(s.checkInHistory || [])];
      s.lastCheckInDate = today;
    });

    toast(t('New nutrition targets applied: {0} kcal', proposedCalories));
    if (onDismiss) onDismiss();
  };

  return (
    <div
      className="card"
      style={{
        padding: '18px 16px',
        border: '1px solid var(--acc)',
        background: 'linear-gradient(180deg, rgba(5, 242, 146, 0.08) 0%, rgba(9, 13, 18, 0.95) 100%)',
        position: 'relative',
        margin: '12px 0 16px'
      }}
    >
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ color: 'var(--acc)', fontSize: 20 }}>
            <Icon name="sparkles" />
          </span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {t('Weekly Adaptive Check-In')}
          </h3>
        </div>
        <span className="badge-status badge-ready" style={{ fontSize: 11, padding: '3px 8px' }}>
          {adaptive.daysCount} {t('days data')}
        </span>
      </div>

      <p style={{ color: 'var(--label-2)', fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
        {t('Based on your real weight trend and logged meals, the adaptive engine estimated your metabolic expenditure.')}
      </p>

      {/* Metrics Grid */}
      <div className="grid2" style={{ gap: 8, marginBottom: 14 }}>
        <div className="card" style={{ padding: '10px 12px', margin: 0, background: 'var(--surface-2)' }}>
          <div className="dim small">{t('Current Target')}</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {currentTargets.calories} <span style={{ fontSize: 12, color: 'var(--label-3)' }}>kcal</span>
          </div>
        </div>

        <div className="card" style={{ padding: '10px 12px', margin: 0, background: 'var(--surface-2)' }}>
          <div className="dim small">{t('Estimated TDEE')}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--acc)', marginTop: 2 }}>
            {adaptive.estimatedTdee} <span style={{ fontSize: 12, color: 'var(--label-3)' }}>kcal</span>
          </div>
        </div>
      </div>

      {/* Proposed Targets Comparison */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 'var(--r-card)',
          padding: '12px 14px',
          marginBottom: 16
        }}
      >
        <div className="row between" style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>
            {t('Proposed Adjustment')}
          </span>
          <span style={{ fontWeight: 700, color: proposedCalories >= currentTargets.calories ? 'var(--acc)' : 'var(--yellow)' }}>
            {proposedCalories >= currentTargets.calories ? '+' : ''}
            {proposedCalories - currentTargets.calories} kcal/day
          </span>
        </div>

        <div className="row between" style={{ fontSize: 13, color: 'var(--label-2)' }}>
          <span>{proposedCalories} kcal</span>
          <span>
            {proposedProtein}g P · {proposedCarbs}g C · {proposedFat}g F
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onDismiss}>
          {t('Keep Current')}
        </button>
        <button className="btn primary pill" style={{ flex: 1 }} onClick={handleAccept}>
          {t('Apply Targets')}
        </button>
      </div>
    </div>
  );
}
