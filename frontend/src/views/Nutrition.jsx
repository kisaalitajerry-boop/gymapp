import { useState, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import { t } from '../lib/i18n.js';
import { todayISO, fmtDate } from '../lib/format.js';
import {
  dailyMacros,
  dailyWater,
  addFood,
  removeFood,
  addWater,
  foodByMeal,
  DEFAULT_TARGETS
} from '../lib/nutrition.js';
import { analyzeFoodImage, POPULAR_MEALS } from '../lib/food-ai.js';
import { calculateFastingProgress, FASTING_PROTOCOLS, DEFAULT_FASTING } from '../lib/fasting.js';
import { checkHydrationAlert } from '../lib/hydration-reminder.js';
import { recommendMealsForRemainingMacros } from '../lib/meal-recommender.js';
import { detectUserRegion, getRegionalMeals, REGIONS } from '../lib/location-diet.js';
import Icon from '../components/Icon.jsx';
import FoodSearch from '../components/FoodSearch.jsx';
import CheckIn from '../components/CheckIn.jsx';
import ProGate from '../components/ProGate.jsx';

const MEAL_ICONS = {
  breakfast: 'sun',
  lunch: 'flame',
  dinner: 'moon',
  snacks: 'sparkles'
};

export default function Nutrition() {
  const S = useStore(s => s.S);
  const update = useStore(s => s.update);
  const toast = useUI(s => s.toast);
  const openSheet = useUI(s => s.openSheet);
  const fileInputRef = useRef(null);

  const [date, setDate] = useState(() => todayISO());
  const [showAdaptiveCheckIn, setShowAdaptiveCheckIn] = useState(true);
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [photoStep, setPhotoStep] = useState(1);

  const isToday = date === todayISO();
  const targets = S.nutritionTargets || DEFAULT_TARGETS;
  const waterTarget = targets.waterMl || 3000;

  const macros = dailyMacros(S.foodLog, date);
  const water = dailyWater(S.waterLog, date);
  const meals = foodByMeal(S.foodLog, date);

  const caloriesLeft = Math.max(0, targets.calories - macros.calories);
  const caloriePercent = Math.min(100, Math.round((macros.calories / Math.max(1, targets.calories)) * 100));
  const waterPercent = Math.min(100, Math.round((water / Math.max(1, waterTarget)) * 100));

  // Fasting
  const fasting = S.fasting || DEFAULT_FASTING;
  const fastingProgress = calculateFastingProgress(fasting);

  // Regional Diet & Meal Adaptation (Silent background detection)
  const detectedRegion = detectUserRegion();
  const [selectedRegionId, setSelectedRegionId] = useState(detectedRegion.id);
  const regionalMeals = getRegionalMeals(selectedRegionId);

  // Recommendations for remaining macros
  const mealRecs = recommendMealsForRemainingMacros({
    remainingCalories: caloriesLeft,
    remainingProtein: Math.max(0, targets.protein - macros.protein),
    remainingCarbs: Math.max(0, targets.carbs - macros.carbs),
    remainingFat: Math.max(0, targets.fat - macros.fat),
    meal: 'dinner'
  });

  // Hydration Alert
  const hydrationAlert = isToday ? checkHydrationAlert(S.waterLog, waterTarget) : { shouldAlert: false };

  const handleLogSuggestedMeal = (item, mealSlot = 'dinner') => {
    update(s => {
      s.foodLog = addFood(
        s.foodLog,
        {
          name: item.name,
          kcal: item.kcal,
          p: item.p,
          c: item.c,
          f: item.f,
          grams: item.grams || 300,
          meal: mealSlot
        },
        date
      );
    });
    toast(t('Logged {0} to {1}', item.name, t(mealSlot)));
  };

  // Actions
  const handleAddWater = ml => {
    update(s => {
      s.waterLog = addWater(s.waterLog, ml, date);
    });
    toast(t('+{0} ml water logged', ml));
  };

  const handleUndoWater = () => {
    update(s => {
      const logs = s.waterLog || [];
      const idx = logs.findLastIndex(l => l.date === date);
      if (idx !== -1) {
        s.waterLog = logs.filter((_, i) => i !== idx);
        toast(t('Last water entry removed'));
      }
    });
  };

  const handleRemoveFood = id => {
    update(s => {
      s.foodLog = removeFood(s.foodLog, id);
    });
    toast(t('Food removed'));
  };

  const openFoodSearchModal = (meal = 'lunch') => {
    openSheet(close => (
      <FoodSearch
        initialMeal={meal}
        close={close}
      />
    ));
  };

  // AI Meal Photo Upload Handling
  const handlePhotoSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningPhoto(true);
    setPhotoStep(1);

    const t1 = setTimeout(() => setPhotoStep(2), 600);
    const t2 = setTimeout(() => setPhotoStep(3), 1200);

    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      try {
        const analyzed = await analyzeFoodImage(dataUrl);
        clearTimeout(t1);
        clearTimeout(t2);
        setScanningPhoto(false);

        // Open confirm sheet
        openSheet(close => (
          <div>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('AI Recognized Meal')}</h3>
              <button className="iconbtn" onClick={close}><Icon name="xmark" /></button>
            </div>
            <div className="card" style={{ padding: '16px 14px', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{analyzed.name}</div>
              <div className="dim small" style={{ marginTop: 2 }}>{analyzed.advice}</div>

              <div style={{ display: 'flex', justifyContent: 'space-around', margin: '14px 0 8px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)' }}>{analyzed.kcal}</div>
                  <div className="dim small">{t('Calories')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>{analyzed.p}g</div>
                  <div className="dim small">{t('Protein')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>{analyzed.c}g</div>
                  <div className="dim small">{t('Carbs')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f43f5e' }}>{analyzed.f}g</div>
                  <div className="dim small">{t('Fat')}</div>
                </div>
              </div>
            </div>

            <button
              className="btn primary pill"
              style={{ width: '100%', marginTop: 14 }}
              onClick={() => {
                update(s => {
                  s.foodLog = addFood(s.foodLog, analyzed, date);
                });
                toast(t('Logged {0} ({1} kcal)', analyzed.name, analyzed.kcal));
                close();
              }}
            >
              {t('Confirm & Log Meal')}
            </button>
          </div>
        ));
      } catch (err) {
        setScanningPhoto(false);
        toast(t('Could not analyze photo. Please try manual search.'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleFast = () => {
    update(s => {
      const cur = s.fasting || DEFAULT_FASTING;
      if (cur.active) {
        s.fasting = {
          ...cur,
          active: false,
          history: [...(cur.history || []), { start: cur.startTime, end: Date.now(), hours: fastingProgress.elapsedHours }]
        };
        toast(t('Fast completed! Eating window is now open.'));
      } else {
        s.fasting = {
          ...cur,
          active: true,
          startTime: Date.now()
        };
        toast(t('Fast started! Countdown timer is running.'));
      }
    });
  };

  return (
    <div className="narrow" style={{ paddingBottom: 80 }}>
      {/* Hidden file input for camera snap */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelect}
      />

      {/* Date Navigation Bar */}
      <div className="row between" style={{ margin: '8px 0 14px' }}>
        <button
          className="iconbtn"
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() - 1);
            setDate(d.toISOString().slice(0, 10));
          }}
          aria-label="Previous day"
        >
          <Icon name="chevronLeft" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {isToday ? t('Today') : fmtDate(date, true)}
          </h1>
          <div className="dim small" style={{ fontSize: 12 }}>
            {t('{0} of {1} kcal', macros.calories, targets.calories)}
          </div>
        </div>

        <button
          className="iconbtn"
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            setDate(d.toISOString().slice(0, 10));
          }}
          aria-label="Next day"
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      {/* Weekly Adaptive Check-In Prompt (if available) */}
      {showAdaptiveCheckIn && S.bodyweight?.length >= 5 && (
        <CheckIn onDismiss={() => setShowAdaptiveCheckIn(false)} />
      )}

      {/* Main Calorie & Macronutrient Summary Card */}
      <div className="card" style={{ padding: '18px 16px', background: 'var(--surface-2)', position: 'relative' }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff' }}>
              {caloriesLeft}{' '}
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-2)' }}>
                {t('kcal left')}
              </span>
            </div>
            <div className="dim small" style={{ marginTop: 2 }}>
              {t('Goal: {0} kcal · Food: {1} kcal', targets.calories, macros.calories)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              className="badge-status badge-ready"
              style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}
            >
              {caloriePercent}%
            </span>
          </div>
        </div>

        {/* Calorie Progress Bar */}
        <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
          <div
            style={{
              height: '100%',
              width: `${caloriePercent}%`,
              background: 'linear-gradient(90deg, var(--acc), #0284c7)',
              borderRadius: 999,
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* 3 Macro Progress Columns */}
        <div className="grid3" style={{ gap: 8, textAlign: 'center' }}>
          {/* Protein */}
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '10px 8px' }}>
            <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>{t('Protein')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '4px 0' }}>
              {macros.protein} / {targets.protein}g
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((macros.protein / Math.max(1, targets.protein)) * 100))}%`,
                  background: '#38bdf8'
                }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '10px 8px' }}>
            <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{t('Carbs')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '4px 0' }}>
              {macros.carbs} / {targets.carbs}g
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((macros.carbs / Math.max(1, targets.carbs)) * 100))}%`,
                  background: '#fbbf24'
                }}
              />
            </div>
          </div>

          {/* Fat */}
          <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: '10px 8px' }}>
            <div style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>{t('Fat')}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '4px 0' }}>
              {macros.fat} / {targets.fat}g
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((macros.fat / Math.max(1, targets.fat)) * 100))}%`,
                  background: '#f43f5e'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Logging Buttons */}
      <div className="grid2" style={{ gap: 10, margin: '14px 0' }}>
        <button
          className="btn"
          style={{ height: 48, fontSize: 14, fontWeight: 600, background: 'var(--surface-2)', gap: 8 }}
          onClick={() => openFoodSearchModal('lunch')}
        >
          <Icon name="magnifier" size={17} />
          <span>{t('Search Food')}</span>
        </button>

        <button
          className="btn"
          style={{ height: 48, fontSize: 14, fontWeight: 600, background: 'var(--surface-2)', gap: 8 }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="sparkles" size={17} style={{ color: 'var(--acc)' }} />
          <span>{t('AI Photo Scanner')}</span>
        </button>
      </div>

      {/* Water Hydration Card (Task 18) */}
      <div className="card" style={{ padding: '16px 14px', background: 'var(--surface-2)' }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ color: '#38bdf8', fontSize: 20 }}>
              <Icon name="droplet" />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Hydration')}</div>
              <div className="dim small">
                {water} / {waterTarget} ml ({waterPercent}%)
              </div>
            </div>
          </div>

          <button
            className="btn plain"
            style={{ fontSize: 12, color: 'var(--label-3)', padding: 0 }}
            onClick={handleUndoWater}
          >
            {t('Undo')}
          </button>
        </div>

        {/* Water Ring / Progress Bar */}
        <div style={{ height: 10, background: 'rgba(56, 189, 248, 0.15)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
          <div
            style={{
              height: '100%',
              width: `${waterPercent}%`,
              background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
              borderRadius: 999,
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* Quick Add Buttons */}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" style={{ flex: 1, fontSize: 13 }} onClick={() => handleAddWater(250)}>
            +250 ml
          </button>
          <button className="btn" style={{ flex: 1, fontSize: 13 }} onClick={() => handleAddWater(500)}>
            +500 ml
          </button>
          <button className="btn" style={{ flex: 1, fontSize: 13 }} onClick={() => handleAddWater(750)}>
            +750 ml
          </button>
        </div>
      </div>

      {/* Meal Breakdown List */}
      <h3 style={{ margin: '18px 4px 10px', fontSize: 17, fontWeight: 700 }}>
        {t('Meals Logged')}
      </h3>

      {['breakfast', 'lunch', 'dinner', 'snacks'].map(mealKey => {
        const mealItems = meals[mealKey] || [];
        const mealKcal = mealItems.reduce((acc, i) => acc + (i.kcal || 0), 0);

        return (
          <div key={mealKey} className="card" style={{ padding: '14px 14px', marginBottom: 10 }}>
            <div className="row between" style={{ marginBottom: mealItems.length ? 10 : 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="lrow-i" style={{ background: 'var(--surface-3)', width: 32, height: 32 }}>
                  <Icon name={MEAL_ICONS[mealKey] || 'dumbbell'} size={16} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                    {t(mealKey)}
                  </div>
                  <div className="dim small">{mealKcal} kcal</div>
                </div>
              </div>

              <button
                className="btn plain"
                style={{ color: 'var(--acc)', fontSize: 13, fontWeight: 600, padding: 0 }}
                onClick={() => openFoodSearchModal(mealKey)}
              >
                + {t('Add')}
              </button>
            </div>

            {mealItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--sep)', paddingTop: 8 }}>
                {mealItems.map(item => (
                  <div key={item.id} className="row between" style={{ padding: '4px 0' }}>
                    <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                        {item.name}
                      </div>
                      <div className="dim small" style={{ fontSize: 11 }}>
                        {item.grams}g · {item.p}g P · {item.c}g C · {item.f}g F
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--acc)' }}>
                        {item.kcal} kcal
                      </span>
                      <button
                        className="iconbtn"
                        style={{ width: 26, height: 26, color: 'var(--red)', fontSize: 13 }}
                        onClick={() => handleRemoveFood(item.id)}
                        aria-label="Remove"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Smart Regional Diet & Meal Recommendations */}
      <div className="card" style={{ padding: '16px 14px', marginTop: 14, background: 'var(--surface-2)' }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ color: 'var(--acc)', fontSize: 20 }}>
              <Icon name="sparkles" />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Regional Diet Adaptation')}</div>
              <div className="dim small">
                {REGIONS[selectedRegionId]?.name || 'Regional Cuisine'} · {t('Culturally Native & Accessible')}
              </div>
            </div>
          </div>
          {detectedRegion.isAutoDetected && selectedRegionId === detectedRegion.id && (
            <span className="badge-status badge-ready" style={{ fontSize: 11, background: 'rgba(5, 242, 146, 0.1)', color: 'var(--acc)' }}>
              {t('Auto-Detected')}
            </span>
          )}
        </div>

        {/* Region Selector Pills */}
        <div className="row" style={{ gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
          {Object.keys(REGIONS).map(regKey => {
            const reg = REGIONS[regKey];
            const isSel = selectedRegionId === regKey;
            return (
              <button
                key={regKey}
                className={'chip ' + (isSel ? 'on' : '')}
                style={{
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  background: isSel ? 'var(--acc)' : 'var(--surface-3)',
                  color: isSel ? '#000' : '#fff',
                  fontWeight: isSel ? 700 : 500
                }}
                onClick={() => setSelectedRegionId(regKey)}
              >
                {reg.name.split(' (')[0]}
              </button>
            );
          })}
        </div>

        {/* Regional Meals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regionalMeals.slice(0, 3).map(m => (
            <div
              key={m.name}
              style={{
                background: 'var(--surface-3)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1, paddingRight: 8 }}>
                  {m.name}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: 'var(--acc)', fontSize: 15 }}>
                    {m.kcal} kcal
                  </div>
                  <div className="dim small" style={{ fontSize: 11 }}>
                    {m.prepTime}
                  </div>
                </div>
              </div>

              <div className="dim small" style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>
                {m.description}
              </div>

              <div className="row between" style={{ alignItems: 'center' }}>
                <div className="row" style={{ gap: 8, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#38bdf8' }}>{m.p}g P</span>
                  <span style={{ color: '#fbbf24' }}>{m.c}g C</span>
                  <span style={{ color: '#f43f5e' }}>{m.f}g F</span>
                </div>

                <div className="row" style={{ gap: 6 }}>
                  <button
                    className="btn pill-sm"
                    style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(5, 242, 146, 0.12)', color: 'var(--acc)' }}
                    onClick={() => handleLogSuggestedMeal(m, m.meal || 'lunch')}
                  >
                    + {t('Log to {0}', t(m.meal || 'lunch'))}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intermittent Fasting Protocol Tracker */}
      <div className="card" style={{ padding: '16px 14px', marginTop: 14, background: 'var(--surface-2)' }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ color: 'var(--purple)', fontSize: 20 }}>
              <Icon name="clock" />
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Intermittent Fasting')}</div>
              <div className="dim small">{fastingProgress.protocolLabel} Protocol</div>
            </div>
          </div>
          <span className="badge-status badge-ready" style={{ fontSize: 11 }}>
            {fasting.active ? t('Fasting Active') : t('Eating Window')}
          </span>
        </div>

        <div className="row between" style={{ margin: '10px 0' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>
              {fastingProgress.elapsedFormatted}
            </div>
            <div className="dim small">{t('Elapsed')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--acc)' }}>
              {fastingProgress.remainingFormatted}
            </div>
            <div className="dim small">{t('Remaining')}</div>
          </div>
        </div>

        <button
          className={'btn pill ' + (fasting.active ? 'danger' : 'primary')}
          style={{ width: '100%' }}
          onClick={handleToggleFast}
        >
          {fasting.active ? t('End Fast / Open Window') : t('Start Fast')}
        </button>
      </div>


      {/* Scanning Photo Overlay animation */}
      {scanningPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--acc)', fontSize: 48, marginBottom: 16, animation: 'pulse 1.2s infinite' }}>
            <Icon name="sparkles" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
            {photoStep === 1
              ? t('Detecting meal items…')
              : photoStep === 2
              ? t('Estimating portion weights & density…')
              : t('Calculating calories & macros…')}
          </h2>
          <p className="dim small">
            {t('Gemini Vision AI is analyzing your food photo.')}
          </p>
        </div>
      )}
    </div>
  );
}
