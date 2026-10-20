import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import {
  coachAvailable, hasConsent, CONSENT_VERSION, emptyCoach,
  canRevert, revertLast, changeTitle
} from '../lib/coach.js'
import {
  useCoachStatus, requestReview, resolvePending, forgetCoach, disclosure
} from '../lib/coach-api.js'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, Button, TextArea, SelectRow } from '../components/ui.jsx'
import { computeMuscleRecovery } from '../lib/recovery.js'
import {
  dailyMacros, dailyWater, addFood, removeFood, addWater,
  foodByMeal, DEFAULT_TARGETS, computeDietQualityScore
} from '../lib/nutrition.js'
import {
  analyzeFoodImage, evaluateGoalProgress, POPULAR_MEALS
} from '../lib/food-ai.js'

import {
  recommendMealsForRemainingMacros
} from '../lib/meal-recommender.js'
import {
  calculateFastingProgress, FASTING_PROTOCOLS, DEFAULT_FASTING
} from '../lib/fasting.js'
import {
  checkHydrationAlert, triggerHydrationNotification
} from '../lib/hydration-reminder.js'

const CATEGORY_TEXT = {
  plan: ['Your plan', 'Routines, exercises, sets and reps, your weekly schedule and progression settings.'],
  training: ['Your logged training', 'Sets you logged in the review window — weights, reps, times, effort ratings and how long sessions took.'],
  bodyweight: ['Body weight', 'Weigh-ins from the same window, and your goal weight if you set one.'],
  profile: ['What you tell the Coach', 'Your intake answers, including any limitations or injuries you describe.'],
  prefs: ['A few preferences', 'Your unit, your language and which effort scale you log.']
}

/* ============================================================================
   Cal AI Nutrition Scanner View
   ========================================================================== */

function CalNutritionView({ nav }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const fileInputRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(1)
  const [activeImage, setActiveImage] = useState(null)
  const [scannedMeal, setScannedMeal] = useState(null)
  const [mealCategory, setMealCategory] = useState('lunch')
  const [showTargetsSheet, setShowTargetsSheet] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)

  // Today's Date & Metrics
  const today = todayISO()
  const macros = dailyMacros(S.foodLog, today)
  const waterConsumed = dailyWater(S.waterLog, today)
  const targets = S.nutritionTargets || DEFAULT_TARGETS
  const waterTarget = targets.waterMl || 3000
  const groupedMeals = foodByMeal(S.foodLog, today)
  const totalMealsCount = (S.foodLog || []).filter(e => e.date === today).length
  const todayFoodList = (S.foodLog || []).filter(e => e.date === today)

  // Goal evaluation
  const goalProgress = evaluateGoalProgress(macros.calories, targets.calories, S.userGoal || 'build_muscle')
  const caloriesLeft = Math.max(0, targets.calories - macros.calories)
  const waterPercent = Math.min(100, Math.round((waterConsumed / waterTarget) * 100))
  const waterReached = waterConsumed >= waterTarget

  // Extended Features: Fasting, Hydration Alert, Micronutrients, AI Meal Recommendations
  const fasting = S.fasting || DEFAULT_FASTING
  const fastingProgress = calculateFastingProgress(fasting)
  const hydrationAlert = S.hydrationAlerts !== false ? checkHydrationAlert(S.waterLog, waterTarget) : { shouldAlert: false }
  const dietQuality = computeDietQualityScore(macros, todayFoodList)
  const mealRecs = recommendMealsForRemainingMacros({
    remainingCalories: caloriesLeft,
    remainingProtein: Math.max(0, targets.protein - macros.protein),
    remainingCarbs: Math.max(0, targets.carbs - macros.carbs),
    remainingFat: Math.max(0, targets.fat - macros.fat),
    meal: 'dinner'
  })

  // Handle Photo File Upload
  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target.result
      await startScanningFlow(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // Handle Quick Sample Preset Selection
  const handleSampleMeal = async sample => {
    const sampleImg = sample.imagePreview || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
    await startScanningFlow(sampleImg, sample)
  }



  // Execute Scanning Animation and AI Recognition
  const startScanningFlow = async (imgUrl, presetData = null) => {
    setActiveImage(imgUrl)
    setScannedMeal(null)
    setScanning(true)
    setScanStep(1)

    // Animated multi-step Cal AI analyzer sequence
    const t1 = setTimeout(() => setScanStep(2), 600)
    const t2 = setTimeout(() => setScanStep(3), 1200)

    try {
      let result = presetData
      if (!result) {
        result = await analyzeFoodImage(imgUrl)
      } else {
        await new Promise(r => setTimeout(r, 1600))
      }
      setScannedMeal(result)
      setMealCategory(result.meal || 'lunch')
      setScanning(false)
    } catch (err) {
      toast(t('Could not analyze meal photo. Please try again.'))
      setScanning(false)
      setActiveImage(null)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  // Commit Scanned Meal to Food Log
  const handleSaveScannedMeal = () => {
    if (!scannedMeal) return
    const itemToLog = {
      name: scannedMeal.name,
      meal: mealCategory,
      grams: scannedMeal.grams,
      kcal: scannedMeal.kcal,
      p: scannedMeal.p,
      c: scannedMeal.c,
      f: scannedMeal.f,
      fiber: scannedMeal.fiber || 0,
      sodiumMg: scannedMeal.sodiumMg || 0,
      potassiumMg: scannedMeal.potassiumMg || 0,
      healthScore: scannedMeal.healthScore || 9.0,
      tags: scannedMeal.tags || []
    }
    update(s => {
      s.foodLog = addFood(s.foodLog, itemToLog, today)
    })
    toast(t('Logged {0} ({1} kcal)', scannedMeal.name, scannedMeal.kcal))
    setScannedMeal(null)
    setActiveImage(null)
  }

  // Log Recommended Meal
  const handleLogRecommendedMeal = (rec) => {
    const itemToLog = {
      name: rec.name,
      meal: rec.meal || 'dinner',
      grams: rec.grams,
      kcal: rec.kcal,
      p: rec.p,
      c: rec.c,
      f: rec.f,
      healthScore: 9.5,
      tags: rec.tags || []
    }
    update(s => {
      s.foodLog = addFood(s.foodLog, itemToLog, today)
    })
    toast(t('Logged meal: {0} ({1} kcal)', rec.name, rec.kcal))
  }

  // Intermittent Fasting Actions
  const handleToggleFast = () => {
    update(s => {
      const cur = s.fasting || DEFAULT_FASTING
      if (cur.active) {
        s.fasting = {
          ...cur,
          active: false,
          history: [
            ...(cur.history || []),
            { start: cur.startTime, end: Date.now(), hours: fastingProgress.elapsedHours }
          ]
        }
        toast(t('Fast completed! Eating window is now open.'))
      } else {
        s.fasting = {
          ...cur,
          active: true,
          startTime: Date.now()
        }
        toast(t('Fast started! Countdown timer is running.'))
      }
    })
  }

  const handleChangeProtocol = (protoId) => {
    const proto = FASTING_PROTOCOLS.find(p => p.id === protoId)
    if (!proto) return
    update(s => {
      s.fasting = {
        ...(s.fasting || DEFAULT_FASTING),
        protocol: proto.id,
        targetHours: proto.fastHours
      }
    })
    toast(t('Fasting target set to {0}', proto.label))
  }

  // Water Actions
  const handleAddWater = ml => {
    update(s => {
      s.waterLog = addWater(s.waterLog, ml, today)
    })
    toast(t('+{0} ml water logged', ml))
  }

  const handleResetWater = () => {
    update(s => {
      s.waterLog = (s.waterLog || []).filter(e => e.date !== today)
    })
    toast(t('Today’s water reset'))
  }

  const handleDeleteMeal = id => {
    update(s => {
      s.foodLog = removeFood(s.foodLog, id)
    })
    toast(t('Meal removed'))
  }

  // Notification Toggle
  const handleRequestPushNotification = async () => {
    const granted = await triggerHydrationNotification(
      'MuscleTrack Hydration',
      `Stay hydrated! You have logged ${waterConsumed} of ${waterTarget} ml today.`
    )
    if (granted) {
      toast(t('Hydration notifications enabled!'))
    } else {
      toast(t('Hydration alerts are active in-app.'))
    }
  }

  // Custom Targets Save
  const handleSaveTargets = (newCals, newP, newC, newF, newWater) => {
    update(s => {
      s.nutritionTargets = {
        calories: Number(newCals) || 2400,
        protein: Number(newP) || 160,
        carbs: Number(newC) || 240,
        fat: Number(newF) || 70,
        waterMl: Number(newWater) || 3000
      }
    })
    setShowTargetsSheet(false)
    toast(t('Nutrition goals updated!'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hidden Camera/File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Feature 4: Smart Hydration In-App Alert Banner */}
      {hydrationAlert.shouldAlert && (
        <div className="cal-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#38bdf8', fontSize: 22 }}><Icon name="droplet" /></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                {t('Hydration Check')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>
                {hydrationAlert.message}
              </div>
            </div>
          </div>
          <button
            className="btn xs primary pill"
            onClick={() => handleAddWater(250)}
            style={{ fontSize: 11, padding: '5px 12px', whiteSpace: 'nowrap' }}
          >
            +250 ml {t('Drink')}
          </button>
        </div>
      )}

      {/* 1. Cal AI Signature Daily Calorie & Macro Dashboard Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(180deg, rgba(19, 25, 34, 0.95) 0%, rgba(13, 18, 25, 1) 100%)',
          border: '1px solid var(--sep-op)',
          padding: '18px 16px'
        }}
      >
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {t('Today’s Calories')}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginTop: 2 }}>
              {macros.calories}{' '}
              <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--label-3)' }}>
                / {targets.calories} kcal
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                background: goalProgress.color === '#10b981' ? 'rgba(5, 242, 146, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                color: goalProgress.color,
                border: `1px solid ${goalProgress.color}40`
              }}
            >
              {goalProgress.label}
            </span>
            <button
              onClick={() => setShowTargetsSheet(true)}
              style={{ background: 'none', border: 'none', color: 'var(--acc)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {t('Edit Goals')}
            </button>
          </div>
        </div>

        {/* Calorie Progress Bar */}
        <div style={{ width: '100%', height: 7, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
          <div
            style={{
              width: `${Math.min(100, (macros.calories / targets.calories) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--acc) 0%, #00d982 100%)',
              borderRadius: 999,
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* 3 Macro Cards: Protein, Carbs, Fats */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Protein */}
          <div className="cal-macro-chip">
            <div className="row between">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-3)' }}>{t('Protein')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--acc)' }}>
                {macros.protein}g / {targets.protein}g
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
              <div
                className="cal-macro-bar-fill"
                style={{
                  width: `${Math.min(100, (macros.protein / targets.protein) * 100)}%`,
                  background: 'var(--acc)'
                }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="cal-macro-chip">
            <div className="row between">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-3)' }}>{t('Carbs')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>
                {macros.carbs}g / {targets.carbs}g
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
              <div
                className="cal-macro-bar-fill"
                style={{
                  width: `${Math.min(100, (macros.carbs / targets.carbs) * 100)}%`,
                  background: 'var(--orange)'
                }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="cal-macro-chip">
            <div className="row between">
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--label-3)' }}>{t('Fat')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e' }}>
                {macros.fat}g / {targets.fat}g
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
              <div
                className="cal-macro-bar-fill"
                style={{
                  width: `${Math.min(100, (macros.fat / targets.fat) * 100)}%`,
                  background: '#f43f5e'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature 2: AI Meal Recommendations Based on Remaining Macros ("What Should I Eat Next?") */}
      <div className="card" style={{ padding: '14px 14px' }}>
        <div className="row between" style={{ cursor: 'pointer' }} onClick={() => setShowRecommendations(prev => !prev)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--acc)', fontSize: 18 }}><Icon name="sparkles" /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                {t('What to Eat Next')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--label-3)' }}>
                {t('Fit your remaining {0} kcal & {1}g protein', caloriesLeft, Math.max(0, targets.protein - macros.protein))}
              </div>
            </div>
          </div>
          <button className="btn xs plain" style={{ fontSize: 11, color: 'var(--acc)', padding: '3px 8px' }}>
            {showRecommendations ? t('Hide') : t('View 3 Ideas')}
          </button>
        </div>

        {showRecommendations && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--sep-op)' }}>
            {mealRecs.map(rec => (
              <div
                key={rec.name}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--sep)',
                  borderRadius: 'var(--r-sm)',
                  padding: '10px 12px'
                }}
              >
                <div className="row between">
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>
                    {rec.name}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--acc)' }}>
                    {rec.kcal} kcal
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--label-2)', margin: '3px 0 6px' }}>
                  {rec.description}
                </div>
                <div className="row between" style={{ alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--label-3)' }}>
                    <span style={{ color: 'var(--acc)', fontWeight: 600 }}>{rec.p}g P</span> · {rec.c}g C · {rec.f}g F · {rec.prepTime}
                  </div>
                  <button
                    className="btn xs primary pill"
                    onClick={() => handleLogRecommendedMeal(rec)}
                    style={{ fontSize: 11, padding: '3px 10px' }}
                  >
                    + {t('Log Meal')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Cal AI Food Scanner Action Card */}
      {!scanning && !scannedMeal && (
        <div className="card" style={{ padding: '16px 14px' }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 3px', color: '#ffffff' }}>
              {t('Cal AI Vision Camera')}
            </h2>
            <div style={{ fontSize: 13, color: 'var(--label-2)' }}>
              {t('Snap a picture of your plate to auto-calculate calories & macros instantly with Gemini AI.')}
            </div>
          </div>

          {/* Big Prominent Camera Button */}
          <button
            className="cal-snap-btn"
            onClick={() => fileInputRef.current?.click()}
            style={{ marginBottom: 14 }}
          >
            <Icon name="camera" size={22} />
            <span>{t('Take Meal Photo / Scan')}</span>
          </button>

          {/* Preset Fast Sample Dishes */}
          <div style={{ borderTop: '1px solid var(--sep-op)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-3)', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('Or Try Quick Recognitions:')}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {POPULAR_MEALS.slice(0, 4).map(meal => (
                <button
                  key={meal.name}
                  onClick={() => handleSampleMeal(meal)}
                  className="chat-chip"
                  style={{
                    fontSize: 12,
                    padding: '5px 12px',
                    background: 'var(--surface-2)',
                    borderColor: 'var(--sep)',
                    color: 'var(--label)'
                  }}
                >
                  <Icon name="forkKnife" size={13} style={{ marginRight: 4, color: 'var(--acc)' }} />
                  {meal.name.split(' ')[0]} {meal.name.split(' ')[1]} ({meal.kcal} kcal)
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Real-Time Laser Scanning Animation Viewport */}
      {scanning && (
        <div className="card" style={{ padding: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--acc)' }}>
              {t('Cal AI Vision Analyzing…')}
            </h3>
            <div style={{ fontSize: 13, color: 'var(--label-2)', marginTop: 4 }}>
              {scanStep === 1 && t('Detecting ingredients on your plate…')}
              {scanStep === 2 && t('Estimating portion weights & volume…')}
              {scanStep === 3 && t('Calculating calories, protein & macros…')}
            </div>
          </div>

          <div className="cal-scan-viewport">
            {activeImage && <img src={activeImage} alt="Food analysis preview" />}
            <div className="cal-scan-laser" />
            <div className="cal-reticle-corner cal-reticle-tl" />
            <div className="cal-reticle-corner cal-reticle-tr" />
            <div className="cal-reticle-corner cal-reticle-bl" />
            <div className="cal-reticle-corner cal-reticle-br" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)', boxShadow: '0 0 10px var(--acc)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)' }}>
              {t('Neural Vision Model v2.4 Active')}
            </span>
          </div>
        </div>
      )}

      {/* 4. Cal AI Recognition Result Card */}
      {scannedMeal && !scanning && (
        <div className="card" style={{ border: '1.5px solid var(--acc)', padding: '16px 14px' }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--acc)',
                background: 'rgba(5, 242, 146, 0.15)',
                padding: '3px 10px',
                borderRadius: 999
              }}
            >
              {scannedMeal.confidence}% {t('AI Vision Match')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--label-3)' }}>
              {t('Health Score:')}{' '}
              <strong style={{ color: 'var(--acc)' }}>{scannedMeal.healthScore}/10</strong>
            </span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: '#ffffff' }}>
            {scannedMeal.name}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--label-2)', marginBottom: 14 }}>
            {scannedMeal.servingSize || `${scannedMeal.grams}g estimated portion`}
          </div>

          {/* Macro Breakdown Big Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-sm)',
              padding: '12px 8px',
              textAlign: 'center',
              marginBottom: 14
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>{scannedMeal.kcal}</div>
              <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 2 }}>{t('Calories')}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--acc)' }}>{scannedMeal.p}g</div>
              <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 2 }}>{t('Protein')}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>{scannedMeal.c}g</div>
              <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 2 }}>{t('Carbs')}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f43f5e' }}>{scannedMeal.f}g</div>
              <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 2 }}>{t('Fat')}</div>
            </div>
          </div>

          {/* Micronutrient Details */}
          {(scannedMeal.fiber || scannedMeal.sodiumMg || scannedMeal.potassiumMg) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {scannedMeal.fiber !== undefined && (
                <div className="cal-micronutrient-pill">
                  <span style={{ fontSize: 10, color: 'var(--label-3)' }}>{t('Fiber')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{scannedMeal.fiber}g</span>
                </div>
              )}
              {scannedMeal.sodiumMg !== undefined && (
                <div className="cal-micronutrient-pill">
                  <span style={{ fontSize: 10, color: 'var(--label-3)' }}>{t('Sodium')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>{scannedMeal.sodiumMg}mg</span>
                </div>
              )}
              {scannedMeal.potassiumMg !== undefined && (
                <div className="cal-micronutrient-pill">
                  <span style={{ fontSize: 10, color: 'var(--label-3)' }}>{t('Potassium')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{scannedMeal.potassiumMg}mg</span>
                </div>
              )}
            </div>
          )}

          {/* Ingredient items breakdown */}
          {scannedMeal.items?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-3)', marginBottom: 6, textTransform: 'uppercase' }}>
                {t('Detected Ingredients')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {scannedMeal.items.map((it, idx) => (
                  <div key={idx} className="row between" style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--sep-op)' }}>
                    <span style={{ color: 'var(--label-2)' }}>{it.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--label)' }}>{it.kcal} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal Type Picker */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-3)', marginBottom: 6, textTransform: 'uppercase' }}>
              {t('Log Under Meal Slot')}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['breakfast', 'lunch', 'dinner', 'snacks'].map(m => (
                <button
                  key={m}
                  onClick={() => setMealCategory(m)}
                  className={'chip' + (mealCategory === m ? ' on' : '')}
                  style={{ textTransform: 'capitalize', fontSize: 12, flex: 1, padding: '6px 4px' }}
                >
                  {t(m)}
                </button>
              ))}
            </div>
          </div>

          {/* AI Coach Diet Insight */}
          <div
            style={{
              background: 'rgba(5, 242, 146, 0.08)',
              border: '1px solid rgba(5, 242, 146, 0.25)',
              borderRadius: 'var(--r-sm)',
              padding: '10px 12px',
              fontSize: 12.5,
              color: 'var(--label-2)',
              lineHeight: 1.45,
              marginBottom: 16
            }}
          >
            <strong style={{ color: 'var(--acc)' }}>{t('Cal AI Verdict:')}</strong> {scannedMeal.advice}
          </div>

          {/* Confirm or Retake Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn plain"
              onClick={() => {
                setScannedMeal(null)
                setActiveImage(null)
              }}
              style={{ flex: 1, borderRadius: 9999 }}
            >
              {t('Retake')}
            </button>
            <button
              className="btn primary pill"
              onClick={handleSaveScannedMeal}
              style={{ flex: 2 }}
            >
              <Icon name="check" size={18} />
              <span>{t('Add to Daily Log')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Feature 5: Micronutrient & Diet Quality Score */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#ffffff' }}>
              {t('Diet Quality & Micronutrients')}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--label-3)' }}>
              {t('Gut microbiome, fiber and electrolyte balance')}
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(5, 242, 146, 0.16)',
              color: dietQuality.color,
              border: `1px solid ${dietQuality.color}40`
            }}
          >
            {dietQuality.score} / 10
          </span>
        </div>

        {/* Fiber Progress Bar */}
        <div style={{ marginBottom: 12 }}>
          <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--label-2)', fontWeight: 600 }}>{t('Dietary Fiber')}</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>
              {macros.fiber || 0}g <span style={{ color: 'var(--label-3)', fontWeight: 400 }}>/ 30g goal</span>
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${dietQuality.fiberProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                borderRadius: 99
              }}
            />
          </div>
        </div>

        {/* Micronutrient Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div className="cal-micronutrient-pill">
            <span style={{ fontSize: 11, color: 'var(--label-3)' }}>{t('Sodium Intake')}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', marginTop: 2 }}>
              {macros.sodiumMg || 0} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--label-3)' }}>mg</span>
            </span>
          </div>
          <div className="cal-micronutrient-pill">
            <span style={{ fontSize: 11, color: 'var(--label-3)' }}>{t('Potassium Intake')}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
              {macros.potassiumMg || 0} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--label-3)' }}>mg</span>
            </span>
          </div>
        </div>

        {/* Insights list */}
        <div style={{ fontSize: 12, color: 'var(--label-3)', borderTop: '1px solid var(--sep-op)', paddingTop: 8 }}>
          {dietQuality.insights[0]}
        </div>
      </div>

      {/* Feature 3: Intermittent Fasting Timer Widget */}
      <div className="cal-fasting-card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#f59e0b', fontSize: 20 }}><Icon name="clock" /></span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                {t('Intermittent Fasting')}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--label-3)' }}>
                {fasting.protocol} ({fastingProgress.targetHours}h {t('target')})
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: fastingProgress.active ? 'rgba(245, 158, 11, 0.16)' : 'rgba(56, 189, 248, 0.16)',
              color: fastingProgress.active ? '#f59e0b' : '#38bdf8',
              border: `1px solid ${fastingProgress.active ? '#f59e0b' : '#38bdf8'}40`
            }}
          >
            {fastingProgress.active ? t('Fast in Progress') : t('Eating Window')}
          </span>
        </div>

        {/* Protocol Selector Chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {FASTING_PROTOCOLS.map(proto => (
            <button
              key={proto.id}
              onClick={() => handleChangeProtocol(proto.id)}
              className={'chip' + (fasting.protocol === proto.id ? ' on' : '')}
              style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
            >
              {proto.id}
            </button>
          ))}
        </div>

        {/* Fasting Progress Bar & Stage */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '12px 10px', marginBottom: 12 }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
              {fastingProgress.active ? `${fastingProgress.elapsedHours}h ${fastingProgress.elapsedMinutes}m` : '0h 0m'}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-3)', marginLeft: 4 }}>
                / {fastingProgress.targetHours}h
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: fastingProgress.stage.color }}>
              {fastingProgress.stage.name}
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
            <div
              style={{
                width: `${fastingProgress.percent}%`,
                height: '100%',
                background: `linear-gradient(90deg, #f59e0b 0%, ${fastingProgress.stage.color} 100%)`,
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--label-3)' }}>
            {fastingProgress.stage.desc}
          </div>
        </div>

        {/* Start / Stop Fast Button */}
        <button
          className={'btn pill ' + (fastingProgress.active ? 'plain' : 'primary')}
          onClick={handleToggleFast}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Icon name={fastingProgress.active ? 'check' : 'timer'} size={16} />
          <span>{fastingProgress.active ? t('End Fast & Open Eating Window') : t('Start Fasting Timer')}</span>
        </button>
      </div>

      {/* 5. Water Intake Tracker Module */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#38bdf8', fontSize: 20 }}><Icon name="droplet" /></span>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                {t('Water Intake')}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--label-3)' }}>
                {t('Daily Target: {0} ml', waterTarget)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="iconbtn"
              onClick={handleRequestPushNotification}
              title={t('Hydration Notifications')}
              style={{ width: 28, height: 28, color: '#38bdf8' }}
            >
              <Icon name="bolt" size={14} />
            </button>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999,
                background: waterReached ? 'rgba(5, 242, 146, 0.16)' : 'rgba(56, 189, 248, 0.16)',
                color: waterReached ? 'var(--acc)' : '#38bdf8',
                border: `1px solid ${waterReached ? 'var(--acc)' : '#38bdf8'}40`
              }}
            >
              {waterReached ? t('Goal Reached! 💧✓') : `${waterPercent}%`}
            </span>
          </div>
        </div>

        {/* Current Volume Counter */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#ffffff' }}>
            {waterConsumed}
          </span>
          <span style={{ fontSize: 14, color: 'var(--label-3)', fontWeight: 500 }}>
            / {waterTarget} ml ({Math.round(waterConsumed / 250)} glasses)
          </span>
        </div>

        {/* Glasses Visual Row (8 glasses) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 14, padding: '4px 0' }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = waterConsumed >= (i + 1) * (waterTarget / 8)
            return (
              <div
                key={i}
                className={'cal-water-glass' + (isFilled ? ' filled' : '')}
                onClick={() => handleAddWater(250)}
                title={t('Click to add 250ml')}
              >
                <div className="cal-water-fill" />
              </div>
            )
          })}
        </div>

        {/* Quick Log Water Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn sm"
            onClick={() => handleAddWater(250)}
            style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--sep-op)' }}
          >
            +250 ml
          </button>
          <button
            className="btn sm"
            onClick={() => handleAddWater(500)}
            style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--sep-op)' }}
          >
            +500 ml
          </button>
          <button
            className="btn sm"
            onClick={() => handleAddWater(1000)}
            style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--sep-op)' }}
          >
            +1.0 L
          </button>
          {waterConsumed > 0 && (
            <button
              className="btn sm"
              onClick={handleResetWater}
              style={{ width: 'auto', padding: '0 10px', color: 'var(--label-3)' }}
              title={t('Reset')}
            >
              <Icon name="reset" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 6. Today's Logged Meals Timeline */}
      <div className="card" style={{ padding: '16px 14px' }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#ffffff' }}>
            {t('Today’s Meals')} ({totalMealsCount})
          </h3>
          <span style={{ fontSize: 12, color: 'var(--label-3)' }}>
            {macros.calories} kcal total
          </span>
        </div>

        {totalMealsCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--label-3)', fontSize: 13 }}>
            <Icon name="forkKnife" size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>{t('No meals logged yet today.')}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--label-4)' }}>
              {t('Snap a picture of your food above to track calories automatically.')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(groupedMeals).map(([mealType, items]) => {
              if (!items.length) return null
              return (
                <div key={mealType} style={{ borderBottom: '1px solid var(--sep-op)', paddingBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--label-3)', marginBottom: 6 }}>
                    {t(mealType)}
                  </div>
                  {items.map(food => (
                    <div key={food.id} className="row between" style={{ padding: '6px 0' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--label)' }}>
                          {food.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--label-3)', marginTop: 1 }}>
                          {food.p}g P · {food.c}g C · {food.f}g F · {food.grams}g
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--acc)' }}>
                          {food.kcal} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--label-3)' }}>kcal</span>
                        </span>
                        <button
                          className="iconbtn"
                          onClick={() => handleDeleteMeal(food.id)}
                          style={{ width: 28, height: 28, color: 'var(--label-3)' }}
                          aria-label={t('Delete meal')}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Target Settings Modal / Sheet */}
      {showTargetsSheet && (
        <TargetsSheet
          targets={targets}
          onSave={handleSaveTargets}
          onClose={() => setShowTargetsSheet(false)}
        />
      )}
    </div>
  )
}

/* ============================================================================
   Targets Edit Sheet
   ========================================================================== */

function TargetsSheet({ targets, onSave, onClose }) {
  const [cals, setCals] = useState(targets.calories || 2400)
  const [p, setP] = useState(targets.protein || 160)
  const [c, setC] = useState(targets.carbs || 240)
  const [f, setF] = useState(targets.fat || 70)
  const [w, setW] = useState(targets.waterMl || 3000)

  const applyPreset = (kc, pr, cb, ft) => {
    setCals(kc)
    setP(pr)
    setC(cb)
    setF(ft)
  }

  return (
    <div className="mback" style={{ zIndex: 120, display: 'flex', alignItems: 'flex-end' }}>
      <div className="sheet" style={{ width: '100%', maxWidth: 440, margin: '0 auto', paddingBottom: 24 }}>
        <div className="grab" />
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('Daily Nutrition Goals')}</h3>
          <button className="iconbtn" onClick={onClose}><Icon name="xmark" /></button>
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button
            className="chip"
            onClick={() => applyPreset(1900, 165, 170, 55)}
            style={{ flex: 1, fontSize: 11 }}
          >
            {t('Cutting')}
          </button>
          <button
            className="chip"
            onClick={() => applyPreset(2350, 160, 240, 70)}
            style={{ flex: 1, fontSize: 11 }}
          >
            {t('Maintain')}
          </button>
          <button
            className="chip"
            onClick={() => applyPreset(2800, 180, 320, 80)}
            style={{ flex: 1, fontSize: 11 }}
          >
            {t('Bulking')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row between">
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t('Target Calories (kcal)')}</span>
            <input
              className="input"
              type="number"
              value={cals}
              onChange={e => setCals(e.target.value)}
              style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
            />
          </div>
          <div className="row between">
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--acc)' }}>{t('Protein (g)')}</span>
            <input
              className="input"
              type="number"
              value={p}
              onChange={e => setP(e.target.value)}
              style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
            />
          </div>
          <div className="row between">
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--orange)' }}>{t('Carbs (g)')}</span>
            <input
              className="input"
              type="number"
              value={c}
              onChange={e => setC(e.target.value)}
              style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
            />
          </div>
          <div className="row between">
            <span style={{ fontSize: 14, fontWeight: 500, color: '#f43f5e' }}>{t('Fat (g)')}</span>
            <input
              className="input"
              type="number"
              value={f}
              onChange={e => setF(e.target.value)}
              style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
            />
          </div>
          <div className="row between">
            <span style={{ fontSize: 14, fontWeight: 500, color: '#38bdf8' }}>{t('Water Goal (ml)')}</span>
            <input
              className="input"
              type="number"
              value={w}
              onChange={e => setW(e.target.value)}
              style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            className="btn primary pill"
            onClick={() => onSave(cals, p, c, f, w)}
          >
            {t('Save Targets')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================================
   Coach Chat Subview
   ========================================================================== */

function CoachChat({ recovery, nav }) {
  const S = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const chestPercent = recovery.groups.Chest?.percent ?? 100
  const backPercent = recovery.groups.Back?.percent ?? 100
  const shouldersPercent = recovery.groups.Shoulders?.percent ?? 100
  const isChestRecovering = chestPercent < 70

  const [messages, setMessages] = useState([
    { id: 1, sender: 'user', text: t('What should I train today?') },
    {
      id: 2,
      sender: 'ai',
      text: isChestRecovering
        ? t(
            'Your chest is still recovering ({0}%). Your back and shoulders are ready ({1}% and {2}%).\n\nI recommend a back + shoulders workout today. This will keep you progressing while allowing proper recovery.\n\nWould you like a workout plan for today?',
            chestPercent,
            backPercent,
            shouldersPercent
          )
        : t(
            'Your muscles are well-rested and primed for training (Chest: {0}%, Back: {1}%, Shoulders: {2}%).\n\nI recommend {3} today. This will maximize progressive overload.\n\nWould you like a workout plan for today?',
            chestPercent,
            backPercent,
            shouldersPercent,
            recovery.recommendation
          ),
      chips: [t('Yes, show me'), t('Snap meal photo'), t('Maybe later')]
    }
  ])
  const [input, setInput] = useState('')

  const handleChip = chip => {
    if (chip === t('Yes, show me')) {
      nav('/workout')
    } else if (chip === t('Snap meal photo')) {
      // Trigger camera directly
      const inputEl = document.querySelector('input[type="file"]')
      if (inputEl) inputEl.click()
    } else {
      setMessages(m => [
        ...m,
        { id: Date.now(), sender: 'user', text: chip },
        { id: Date.now() + 1, sender: 'ai', text: t('Sounds good! Let me know whenever you need recovery analysis, calorie estimates, or exercise substitutions.') }
      ])
    }
  }

  const handleSend = () => {
    const q = input.trim()
    if (!q) return
    const userMsg = { id: Date.now(), sender: 'user', text: q }
    setInput('')

    let answer = t('Focus on progressive overload and hitting your protein goal today.')
    const lower = q.toLowerCase()
    if (lower.includes('recover') || lower.includes('sore') || lower.includes('rest')) {
      answer = t(
        'Your overall recovery is {0}%. Give fatigued muscle groups 48–72 hours before hitting them again with high intensity.',
        recovery.overall
      )
    } else if (lower.includes('calorie') || lower.includes('food') || lower.includes('diet') || lower.includes('eat') || lower.includes('meal')) {
      answer = t('You can snap any meal photo directly on the Cal AI Nutrition tab to get instant calorie and macro breakdown!')
    } else if (lower.includes('water') || lower.includes('hydrat')) {
      answer = t('Aim for 35ml of water per kg of bodyweight daily. Hydration accelerates nutrient delivery into muscle cells.')
    } else if (lower.includes('train') || lower.includes('workout') || lower.includes('routine')) {
      answer = t(
        'Based on your recovery status, I suggest: {0}. Your back and shoulders are at peak readiness.',
        recovery.recommendation
      )
    }

    const aiMsg = { id: Date.now() + 1, sender: 'ai', text: answer }
    setMessages(m => [...m, userMsg, aiMsg])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '74vh' }}>
      <div className="chat-container" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              {msg.text.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: i > 0 ? '8px 0 0' : 0 }}>
                  {para}
                </p>
              ))}
            </div>
            {msg.chips && (
              <div className="chat-chips-row">
                {msg.chips.map(chip => (
                  <button
                    key={chip}
                    className="chat-chip"
                    onClick={() => handleChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-bar">
        <input
          placeholder={t('Ask anything about your nutrition, calories or training…')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send-btn" onClick={handleSend} aria-label="Send">
          <Icon name="arrowUp" size={18} />
        </button>
      </div>
    </div>
  )
}

/* ============================================================================
   Main Coach Container Component
   ========================================================================== */

export default function Coach() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const [viewTab, setViewTab] = useState('nutrition') // 'nutrition' | 'chat' | 'settings'
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { job, pending, cap, refresh } = useCoachStatus(true)

  const recovery = computeMuscleRecovery(S.workouts)
  const consented = hasConsent(S)
  const coach = S.coach || emptyCoach()

  const askReview = async () => {
    setBusy(true)
    try {
      await requestReview(note)
      setNote('')
      toast(t('The Coach is reading your training…'))
      refresh()
    } catch (e) { toast(e.message || t('Could not ask the Coach')) }
    setBusy(false)
  }

  const turnOff = () => confirmSheet({
    title: t('Turn the Coach off?'),
    message: t('Any pending suggestion is discarded and scheduled reviews stop. Your Coach history stays, and you can turn it back on anytime.'),
    confirmText: t('Turn off'), danger: true,
    onConfirm: async () => {
      try { await forgetCoach() } catch (e) { /* server-side copy goes on the next call */ }
      update(s => { s.coach = { ...(s.coach || emptyCoach()), consent: null, cadence: 'off' } })
      toast(t('The Coach is off'))
      nav('/home')
    }
  })

  const doRevert = () => confirmSheet({
    title: t('Undo the last Coach changes?'),
    message: t('Your plan goes back to how it was before you accepted them. Workouts you have logged since are untouched.'),
    confirmText: t('Undo'),
    onConfirm: () => {
      let ok = false
      update(s => { ok = revertLast(s) })
      toast(ok ? t('Plan restored') : t('Nothing to undo'))
    }
  })

  return (
    <div className="narrow">
      {/* Header with Title and Mode Switcher */}
      <div className="hdr" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 26, color: 'var(--acc)' }}>
            <Icon name={viewTab === 'nutrition' ? 'camera' : 'sparkles'} />
          </span>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
              {viewTab === 'nutrition' ? t('Cal AI Nutrition') : viewTab === 'chat' ? t('AI Coach Chat') : t('Coach Settings')}
            </h1>
          </div>
        </div>
        <button
          className="iconbtn"
          onClick={() => setViewTab(v => (v === 'settings' ? 'nutrition' : 'settings'))}
          style={{ color: viewTab === 'settings' ? 'var(--acc)' : 'inherit' }}
          aria-label="Settings"
        >
          <Icon name="gear" />
        </button>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="seg" style={{ marginBottom: 14 }}>
        <button
          className={viewTab === 'nutrition' ? 'on' : ''}
          onClick={() => setViewTab('nutrition')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <Icon name="camera" size={14} />
          <span>{t('Cal AI Food')}</span>
        </button>
        <button
          className={viewTab === 'chat' ? 'on' : ''}
          onClick={() => setViewTab('chat')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <Icon name="chat" size={14} />
          <span>{t('Coach Chat')}</span>
        </button>
        <button
          className={viewTab === 'settings' ? 'on' : ''}
          onClick={() => setViewTab('settings')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <Icon name="sparkles" size={14} />
          <span>{t('Plan Reviews')}</span>
        </button>
      </div>

      {/* Render Active View */}
      {viewTab === 'nutrition' ? (
        <CalNutritionView nav={nav} />
      ) : viewTab === 'chat' ? (
        <CoachChat recovery={recovery} nav={nav} />
      ) : (
        <>
          {!consented ? (
            <ConsentCard onDone={() => refresh()} />
          ) : (
            <>
              <StatusCard job={job} pending={pending} nav={nav} />

              {!job && !pending && (
                <div className="card">
                  <h2 style={{ margin: '0 0 6px' }}>{t('Ask for a review')}</h2>
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    {t('The Coach reads what you have actually logged since its last look and suggests changes to your plan — each one with its reason.')}
                  </div>
                  <TextArea
                    rows={2}
                    value={note}
                    maxLength={1000}
                    onChange={e => setNote(e.target.value)}
                    placeholder={t('Anything it should know? (optional) — e.g. “right shoulder pinches on overhead work”')}
                  />
                  <div style={{ height: 10 }} />
                  <Button variant="primary" icon="sparkles" disabled={busy} onClick={askReview}>
                    {t('Ask for a review')}
                  </Button>
                  {cap?.limit > 0 && (
                    <div className="dim small" style={{ marginTop: 8, textAlign: 'center' }}>
                      {t('{0} of {1} Coach runs used today', cap.used, cap.limit)}
                    </div>
                  )}
                </div>
              )}

              {!S.routines.length && (
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 10 }}>
                    {t('No plan yet — the Coach can build you one from a few questions.')}
                  </div>
                  <Button variant="primary" icon="sparkles" onClick={() => nav('/coach/intake')}>
                    {t('Let the Coach build my plan')}
                  </Button>
                </div>
              )}

              <CadenceCard coach={coach} update={update} />

              <Section title={t('Coach profile')} footer={t('Used by every proposal — keep limitations here up to date.')}>
                <Row
                  icon="clipboard"
                  iconTint="var(--indigo)"
                  title={t('Your answers')}
                  subtitle={coach.profile ? summarise(coach.profile) : t('Not set yet')}
                  accessory="chevron"
                  onClick={() => nav('/coach/intake?edit=1')}
                />
              </Section>

              <LogCard coach={coach} />

              <Section title={t('Controls')}>
                {canRevert(S) && (
                  <Row icon="reset" iconTint="var(--blue)" title={t('Undo the last Coach changes')} accessory="chevron" onClick={doRevert} />
                )}
                <Row icon="signOut" iconTint="var(--red)" title={t('Turn the Coach off')} danger onClick={turnOff} />
              </Section>
            </>
          )}
        </>
      )}
    </div>
  )
}

const summarise = p => [
  p.goal && t(p.goal),
  p.daysPerWeek && t('{0} days a week', p.daysPerWeek),
  p.sessionMin && t('{0} min', p.sessionMin)
].filter(Boolean).join(' · ')

/* ---------------------------------- consent ---------------------------------- */

function ConsentCard({ onDone }) {
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  const [info, setInfo] = useState(null)
  useEffect(() => { disclosure().then(setInfo).catch(() => {}) }, [])

  const agree = () => {
    update(s => { s.coach = { ...(s.coach || emptyCoach()), consent: { agreedAt: new Date().toISOString(), version: CONSENT_VERSION } } })
    toast(t('The Coach is on'))
    onDone()
  }

  const open = () => openSheet(close => <>
    <h3>{t('Before the Coach starts')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>
      {t('When you ask for a plan or a review, this instance sends the following to {0}, running on this server under the instance owner’s account.',
        info?.providerLabel || config?.coach?.providerLabel || t('the configured AI provider'))}
    </div>
    <div className="sect-b">
      {(info?.categories || Object.keys(CATEGORY_TEXT)).map(k => {
        const [title, sub] = CATEGORY_TEXT[k] || [k, '']
        return <div key={k} className="lrow">
          <span className="lrow-i" style={{ '--tint': 'var(--acc)' }}><Icon name="check" /></span>
          <span className="lrow-m"><span className="lrow-t">{t(title)}</span><span className="lrow-s">{t(sub)}</span></span>
        </div>
      })}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8, marginTop: 12 }}>
      <div>{t('Your name, your sign-in details and everything else about your account stay here. Other people’s data is never included.')}</div>
      <div>{t('Nothing the Coach suggests is applied on its own — you review every change and can undo it afterwards.')}</div>
      <div>{t('You can turn this off at any time, which also discards anything the Coach is holding for you.')}</div>
      <div style={{ color: 'var(--yellow)' }}>{t('The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={() => { close(); agree() }}>{t('I understand — turn the Coach on')}</Button>
    <div style={{ height: 8 }} />
    <Button onClick={close}>{t('Not now')}</Button>
  </>)

  return <div className="card">
    <div className="row" style={{ gap: 10, marginBottom: 6 }}>
      <span className="lrow-i" style={{ '--tint': 'var(--acc)' }}><Icon name="sparkles" /></span>
      <div className="big" style={{ fontSize: 20 }}>{t('Meet the Coach')}</div>
    </div>
    <div className="muted small" style={{ marginBottom: 12, lineHeight: 1.5 }}>
      {t('An AI coach that can design your plan and adjust it from what you actually log. It runs on this server, it never changes anything without your say-so, and it is off until you turn it on.')}
    </div>
    <Button variant="primary" icon="sparkles" onClick={open}>{t('See what it would use')}</Button>
  </div>
}

/* ---------------------------------- status ---------------------------------- */

function StatusCard({ job, pending, nav }) {
  if (job) return <div className="card">
    <div className="row" style={{ gap: 10 }}>
      <span className="lrow-i" style={{ background: 'var(--orange)' }}><Icon name="sparkles" /></span>
      <div>
        <div style={{ fontWeight: 600 }}>{t('The Coach is thinking…')}</div>
        <div className="muted small">{t('This takes a minute or two. You can leave this screen — it keeps going.')}</div>
      </div>
    </div>
  </div>

  if (pending) return <div className="card" style={{ borderColor: 'var(--acc)' }}>
    <div className="today-row" onClick={() => nav('/coach/proposal')}>
      <div className="row" style={{ gap: 9, minWidth: 0 }}>
        <span className="lrow-i" style={{ background: 'var(--acc)' }}><Icon name="clipboard" /></span>
        <div style={{ minWidth: 0 }}>
          <div className="lbl2">{pending.kind === 'create' ? t('Your plan is ready') : t('Suggestions ready')}</div>
          <div className="ttl">{pending.kind === 'create'
            ? t('{0} routines to look over', pending.bundle?.routines?.length || 0)
            : t(pending.changes?.length === 1 ? '{0} suggestion' : '{0} suggestions', pending.changes?.length || 0)}</div>
        </div>
      </div>
      <span className="tag acc">{t('Review')}</span>
    </div>
  </div>

  return null
}

/* ---------------------------------- cadence ---------------------------------- */

function CadenceCard({ coach, update }) {
  const cadence = coach.cadence && coach.cadence !== 'off' ? coach.cadence : null
  const mode = !cadence ? 'off' : cadence.weekly ? 'weekly' : 'every'
  const setMode = m => update(s => {
    const c = (s.coach = s.coach || emptyCoach())
    c.cadence = m === 'off' ? 'off' : m === 'weekly' ? { weekly: { day: 0, time: '18:00' } } : { everyWorkouts: 4 }
  })
  const patch = fn => update(s => { const c = (s.coach = s.coach || emptyCoach()); fn(c) })

  return <Section title={t('Automatic reviews')}
    footer={mode === 'off'
      ? t('Off — the Coach only looks when you ask it to.')
      : t('You are only notified when the Coach actually has something to suggest.')}>
    <SelectRow icon="clock" iconTint="var(--purple)" title={t('When')}
      value={mode} onChange={setMode}
      options={[
        { value: 'off', label: t('Off') },
        { value: 'weekly', label: t('Weekly'), subtitle: t('On a day and time you choose') },
        { value: 'every', label: t('After every few workouts'), subtitle: t('As soon as you have logged enough') }
      ]} />
    {mode === 'weekly' && <>
      <SelectRow icon="calendar" iconTint="var(--orange)" title={t('Day')}
        value={cadence.weekly.day}
        onChange={v => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, day: v } } })}
        options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => ({ value: i, label: t(d) }))} />
      <Row icon="clock" iconTint="var(--purple)" title={t('Time')}>
        <input type="time" className="timef" value={cadence.weekly.time || '18:00'}
          onChange={e => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, time: e.target.value } } })} />
      </Row>
    </>}
    {mode === 'every' && <SelectRow icon="dumbbell" iconTint="var(--teal)" title={t('After how many workouts')}
      value={cadence.everyWorkouts || 4}
      onChange={v => patch(c => { c.cadence = { everyWorkouts: v } })}
      options={[3, 4, 5, 6, 8, 10].map(n => ({ value: n, label: t('{0} workouts', n) }))} />}
  </Section>
}

/* ---------------------------------- log ---------------------------------- */

function LogCard({ coach }) {
  const openSheet = useUI(s => s.openSheet)
  const log = [...(coach.log || [])].reverse()
  if (!log.length) return null

  const detail = e => openSheet(close => <>
    <h3>{e.kind === 'create' ? t('Plan from the Coach') : e.kind === 'revert' ? t('Undo') : t('Coach review')}</h3>
    <div className="dim small" style={{ marginBottom: 10 }}>{fmtDate(new Date(e.at).toISOString().slice(0, 10), true)}</div>
    {e.summary && <div className="muted small" style={{ lineHeight: 1.5, marginBottom: 12 }}>{e.summary}</div>}
    {!!e.evidence?.sessions && <div className="dim small" style={{ marginBottom: 10 }}>
      {t('Based on {0} sessions', e.evidence.sessions)}{e.evidence.from ? ' · ' + fmtDate(e.evidence.from) + ' – ' + fmtDate(e.evidence.to) : ''}
    </div>}
    {(e.decisions || []).map(d => <div key={d.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--sep)', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div className="small" style={{ fontWeight: 600 }}>{changeTitle(d)}</div>
        {d.why && <div className="dim" style={{ fontSize: '.72rem', lineHeight: 1.4 }}>{d.why}</div>}
      </div>
      <span className="tag" style={d.status === 'accepted' ? { color: 'var(--acc)' } : { color: 'var(--label-3)' }}>
        {d.status === 'accepted' ? t('applied') : t('declined')}
      </span>
    </div>)}
    {(e.notes || []).map((n, i) => (
      <div key={i} className="muted small" style={{ marginTop: 10, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <Icon name="chat" size={14} style={{ flex: 'none', marginTop: 3, color: 'var(--acc)' }} />
        <span>{n}</span>
      </div>
    ))}
    <div style={{ height: 10 }} />
  </>)

  return <>
    <h4 className="sec">{t('Coach history')}</h4>
    <div className="list">
      {log.slice(0, 20).map(e => {
        const applied = (e.decisions || []).filter(d => d.status === 'accepted').length
        return <div key={e.id} className="item" onClick={() => detail(e)}>
          <div className="grow">
            <div className="tt">{e.kind === 'create' ? t('Built a plan') : e.kind === 'revert' ? t('Undid the last changes') : t('Reviewed your training')}</div>
            <div className="ss">{fmtDate(new Date(e.at).toISOString().slice(0, 10))}
              {e.kind === 'review' ? ' · ' + t('{0} applied', applied) : ''}</div>
          </div>
          <Icon name="chevronRight" className="chev" />
        </div>
      })}
    </div>
  </>
}
