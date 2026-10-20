import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW, setsDoneActive } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekKey, DAYS } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { bwSheet, goalSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { coachAvailable, hasConsent } from '../lib/coach.js'
import { useCoachStatus } from '../lib/coach-api.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { computeMuscleRecovery } from '../lib/recovery.js'
import BodyMap from '../components/BodyMap.jsx'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { dailyMacros, dailyWater, addWater, DEFAULT_TARGETS } from '../lib/nutrition.js'
import { evaluateGoalProgress } from '../lib/food-ai.js'
import { calculateFastingProgress, DEFAULT_FASTING } from '../lib/fasting.js'
import { checkHydrationAlert } from '../lib/hydration-reminder.js'

// A job in flight or a proposal waiting is the only reason the Coach interrupts Home. When it
// has nothing to say it renders nothing at all — and it only polls while Home is on screen.
function CoachCard({ nav }) {
  const S = useStore(s => s.S)
  const { job, pending } = useCoachStatus(hasConsent(S))
  if (!hasConsent(S) || (!job && !pending)) return null
  const ready = !!pending
  return <div className="card" style={ready ? { borderColor: 'var(--acc)' } : null}>
    <div className="today-row" onClick={() => nav(ready ? '/coach/proposal' : '/coach')}>
      <div className="row" style={{ gap: 9, minWidth: 0 }}>
        <span className="lrow-i" style={{ background: ready ? 'var(--acc)' : 'var(--orange)' }}><Icon name="sparkles" /></span>
        <div style={{ minWidth: 0 }}>
          <div className="lbl2">{t('Coach')}</div>
          <div className="ttl">{ready
            ? (pending.kind === 'create'
              ? t('Your plan is ready')
              : t(pending.changes?.length === 1 ? '{0} suggestion for you' : '{0} suggestions for you', pending.changes?.length || 0))
            : t('Reading your training…')}</div>
        </div>
      </div>
      {ready ? <span className="tag acc">{t('Review')}</span> : <Icon name="chevronRight" className="chev" />}
    </div>
  </div>
}

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const [weekOffset, setWeekOffset] = useState(0)
  const coachOn = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE })

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineId(S, iso), ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(<div key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} onClick={() => dayOverrideSheet(iso)}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></div>)
  }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(dateLocale(), { month: 'short' })}`

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))

  // today's session shown right under the week strip
  const onToday = () => { if (S.active) nav('/workout'); else if (routine) startFlow(routine.id); else dayOverrideSheet(todayISO()) }

  const [homeBodyView, setHomeBodyView] = useState('front')
  const [selectedMuscle, setSelectedMuscle] = useState('chest')

  const hour = today.getHours()
  const greeting = hour < 12 ? t('Good Morning') : hour < 18 ? t('Good Afternoon') : t('Good Evening')
  const recovery = computeMuscleRecovery(S.workouts)

  const muscleList = Object.values(recovery.muscles || {})
  const readyCount = muscleList.filter(m => m.percent >= 70).length
  const recoveringCount = muscleList.filter(m => m.percent >= 40 && m.percent < 70).length
  const restCount = muscleList.filter(m => m.percent < 40).length
  const activeMuscle = recovery.muscles?.[selectedMuscle] || { percent: 100, status: { label: 'Ready', color: '#10b981' } }
  const update = useStore(s => s.update)

  // Cal AI daily nutrition, fasting and water intake state
  const targets = S.nutritionTargets || DEFAULT_TARGETS
  const dayMacros = dailyMacros(S.foodLog, todayISO())
  const dayWater = dailyWater(S.waterLog, todayISO())
  const calGoalEval = evaluateGoalProgress(dayMacros.calories, targets.calories, S.goal || 'build_muscle')
  const waterGoal = targets.waterMl || 3000
  const waterProgress = Math.min(100, Math.round((dayWater / waterGoal) * 100))
  const waterReached = dayWater >= waterGoal
  const waterActive = dayWater > 0

  const fasting = S.fasting || DEFAULT_FASTING
  const fastingProgress = calculateFastingProgress(fasting)
  const hydrationAlert = S.hydrationAlerts !== false ? checkHydrationAlert(S.waterLog, waterGoal) : { shouldAlert: false }

  return <div className="narrow">
    {/* Screen 3 Header */}
    <div className="hdr" style={{ marginBottom: 12 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{greeting}</span>
          <span style={{ fontSize: 22 }} title={t((S.gender || S.body) === 'female' ? 'Female Lifter' : 'Male Lifter')}>
            {(S.gender || S.body) === 'female' ? '🏋️‍♀️' : '🏋️‍♂️'}
          </span>
        </h1>
        <div className="sub" style={{ fontSize: 14, color: 'var(--label-2)', marginTop: 2 }}>
          {t('Your body is ready for progress.')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="iconbtn" onClick={() => nav('/recovery')} aria-label={t('Recovery')}>
          <Icon name="recovery" />
        </button>
        <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}>
          <Icon name="gear" />
        </button>
      </div>
    </div>

    {/* Screen 3: Today's Recommendation Card */}
    <div className="card" style={{ padding: '18px 16px' }}>
      <div className="lbl2" style={{ color: 'var(--label-2)', fontSize: 13, marginBottom: 4 }}>
        {t("Today's Recommendation")}
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px', color: '#ffffff' }}>
        {recovery.recommendation}
      </h2>
      <div style={{ color: 'var(--label-3)', fontSize: 13, marginBottom: 16 }}>
        {t('Based on your recovery and recent activity.')}
      </div>
      <button
        className="btn primary pill"
        onClick={onToday}
        style={{ fontSize: 16, width: '100%', justifyContent: 'center', gap: 8 }}
      >
        <span>{S.active ? t('Resume Workout') : t('Start Workout')}</span>
        <Icon name="arrowRight" size={18} />
      </button>
    </div>

    {/* Screen 3: Cal AI Nutrition & Water Intake Widget */}
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="lrow-i"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(16,185,129,0.2))',
              color: 'var(--acc)',
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon name="sparkles" size={16} />
          </span>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--label)' }}>
              {t('Nutrition & Hydration')}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--label-3)', marginTop: 2 }}>
              {t('Cal AI tracking & daily goals')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            onClick={() => nav('/nutrition')}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
              background: fastingProgress.active ? 'rgba(245,158,11,0.16)' : 'rgba(56,189,248,0.16)',
              color: fastingProgress.active ? '#f59e0b' : '#38bdf8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Icon name="clock" size={11} />
            <span>{fastingProgress.active ? `${fastingProgress.elapsedHours}h ${fastingProgress.elapsedMinutes}m` : t('Eating')}</span>
          </span>
          <button
            className="btn plain sm"
            onClick={() => nav('/nutrition')}
            style={{ fontSize: 12, padding: '4px 10px', gap: 5, color: 'var(--acc)', borderColor: 'var(--sep)' }}
          >
            <Icon name="camera" size={14} />
            <span>{t('Scan Meal')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Left Tile: Calorie Goal */}
        <div
          onClick={() => nav('/nutrition')}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 14,
            padding: '12px 10px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div>
            <div className="row between" style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--label-2)', fontWeight: 600 }}>
                <span style={{ color: 'var(--acc)' }}><Icon name="forkKnife" size={13} /></span>
                <span>{t('Calories')}</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: calGoalEval.isGood ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: calGoalEval.color
                }}
              >
                {calGoalEval.status === 'on_track'
                  ? t('Deficit')
                  : calGoalEval.status === 'ideal_surplus'
                  ? t('Surplus')
                  : calGoalEval.status === 'balanced'
                  ? t('Balanced')
                  : t('Tracked')}
              </span>
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--label)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {dayMacros.calories}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-3)', marginLeft: 3 }}>
                / {targets.calories}
              </span>
            </div>

            <div style={{ fontSize: 11, color: calGoalEval.color, fontWeight: 600, marginTop: 4 }}>
              {calGoalEval.label}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((dayMacros.calories / (targets.calories || 2400)) * 100))}%`,
                  background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--label-3)', fontWeight: 500 }}>
              <span>P:{dayMacros.protein}g</span>
              <span>C:{dayMacros.carbs}g</span>
              <span>F:{dayMacros.fat}g</span>
              <span>Fib:{dayMacros.fiber || 0}g</span>
            </div>
          </div>
        </div>

        {/* Right Tile: Water Intake Goal & Icon */}
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 14,
            padding: '12px 10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div onClick={() => nav('/nutrition')} style={{ cursor: 'pointer' }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--label-2)', fontWeight: 600 }}>
                <span style={{ color: '#38bdf8' }}><Icon name="droplet" size={13} /></span>
                <span>{t('Hydration')}</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: waterReached
                    ? 'rgba(16,185,129,0.18)'
                    : waterActive
                    ? 'rgba(56,189,248,0.18)'
                    : 'rgba(245,158,11,0.18)',
                  color: waterReached ? '#10b981' : waterActive ? '#38bdf8' : '#f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                {waterReached ? (
                  <><span>✓</span> {t('Goal Met')}</>
                ) : waterActive ? (
                  <>{waterProgress}%</>
                ) : (
                  <>{t('No intake')}</>
                )}
              </span>
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--label)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {(dayWater / 1000).toFixed(1)}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--label-3)', marginLeft: 3 }}>
                / {(waterGoal / 1000).toFixed(1)} L
              </span>
            </div>

            <div style={{ fontSize: 11, color: waterReached ? '#10b981' : waterActive ? '#38bdf8' : 'var(--label-3)', fontWeight: 600, marginTop: 4 }}>
              {waterReached
                ? t('Daily goal completed!')
                : waterActive
                ? t('{0} ml remaining', Math.max(0, waterGoal - dayWater))
                : t('Not started today')}
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div
                style={{
                  height: '100%',
                  width: `${waterProgress}%`,
                  background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <button
              className="btn plain xs"
              onClick={(e) => {
                e.stopPropagation();
                update(draft => {
                  draft.waterLog = addWater(draft.waterLog, 250, todayISO());
                });
              }}
              style={{
                width: '100%',
                height: 26,
                fontSize: 11,
                fontWeight: 600,
                color: '#38bdf8',
                borderColor: 'rgba(56,189,248,0.3)',
                borderRadius: 8,
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Icon name="plus" size={11} />
              <span>+250 ml</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Screen 3: Your Body Today (Interactive Muscle Map with 3 Recovery States: Green, Orange, Red) */}
    <div className="card" style={{ padding: '16px 14px' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--label)' }}>
            {t('Your Body Today')}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--label-3)', marginTop: 2 }}>
            {t('Muscle fatigue & recovery map')}
          </div>
        </div>
        <div className="seg" style={{ width: 130, height: 32, padding: 2 }}>
          <button
            className={homeBodyView === 'front' ? 'on' : ''}
            onClick={() => setHomeBodyView('front')}
            style={{ fontSize: 12, padding: '3px 8px' }}
          >
            {t('Front')}
          </button>
          <button
            className={homeBodyView === 'back' ? 'on' : ''}
            onClick={() => setHomeBodyView('back')}
            style={{ fontSize: 12, padding: '3px 8px' }}
          >
            {t('Back')}
          </button>
        </div>
      </div>

      {/* Muscle Map Canvas Container */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(19, 25, 34, 0.75) 0%, rgba(9, 13, 18, 0.95) 100%)',
          borderRadius: 'var(--r-card)',
          border: '1px solid var(--sep-op)',
          padding: '16px 8px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280
        }}
      >
        {/* Selected Muscle Active Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--sep)',
            borderRadius: 999,
            padding: '5px 14px',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: activeMuscle.status.color,
              boxShadow: `0 0 8px ${activeMuscle.status.color}`
            }}
          />
          <span style={{ color: 'var(--label)' }}>{t(MUSCLE_NAME[selectedMuscle] || selectedMuscle)}</span>
          <span style={{ color: activeMuscle.status.color }}>
            {activeMuscle.percent}% {t(activeMuscle.status.label)}
          </span>
        </div>

        {/* Vector SVG Body Map (1.5x enlarged for effortless touch targets) */}
        <div style={{ width: '88%', maxWidth: 330, margin: '6px 0 14px' }}>
          <BodyMap
            recovery={recovery.muscles}
            singleView={homeBodyView}
            body={S.gender || S.body || 'male'}
            selected={selectedMuscle}
            onMuscle={slug => setSelectedMuscle(slug)}
          />
        </div>

        {/* 3-State Color Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            width: '100%',
            paddingTop: 10,
            borderTop: '1px solid var(--sep-op)',
            fontSize: 11,
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ color: 'var(--label-2)' }}>{t('Ready (>70%)')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
            <span style={{ color: 'var(--label-2)' }}>{t('Recovering (40–70%)')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
            <span style={{ color: 'var(--label-2)' }}>{t('Rest (<40%)')}</span>
          </div>
        </div>
      </div>

      {/* Summary Counts Bar */}
      <div
        className="row between"
        style={{
          marginTop: 10,
          padding: '8px 4px 0',
          cursor: 'pointer'
        }}
        onClick={() => nav('/recovery')}
      >
        <div style={{ fontSize: 13, color: 'var(--label-3)' }}>
          <span style={{ color: '#10b981', fontWeight: 600 }}>{readyCount}</span> {t('ready')} ·{' '}
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{recoveringCount}</span> {t('recovering')} ·{' '}
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{restCount}</span> {t('rest')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--acc)', fontSize: 13, fontWeight: 600 }}>
          <span>{t('View All')}</span>
          <Icon name="chevronRight" size={14} />
        </div>
      </div>
    </div>

    {/* Week Calendar Strip Card */}
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week"><Icon name="chevronLeft" /></button>
        <div className="small muted" style={{ fontWeight: 500 }}>{wkLabel}</div>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week"><Icon name="chevronRight" /></button>
      </div>
      <div className="week">{strip}</div>
    </div>

    {coachOn && <CoachCard nav={nav} />}

    {!S.routines.length && !S.active && (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span className="lrow-i"><Icon name="sparkles" /></span>
          <div className="big" style={{ fontSize: 22 }}>{t('Welcome!')}</div>
        </div>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</div>
        {coachOn && <>
          <Button variant="primary" icon="sparkles" onClick={() => nav(hasConsent(S) ? '/coach/intake' : '/coach')}>{t('Let the Coach build it')}</Button>
          <div style={{ height: 8 }} />
        </>}
        <Button variant={coachOn ? 'plain' : 'primary'} icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (PPL)')}</Button>
        <div style={{ height: 8 }} /><Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    )}

    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {bw ? <>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></div>
          {/* only when it actually moved — an unchanged weight used to read as "− 0" */}
          {!!delta && (
            <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />
              {fmtNum(Math.abs(delta))}
            </span>
          )}
          <span className="dim small" style={{ marginLeft: 'auto' }}>{fmtDate(bw.d, true)}</span>
        </div>
        {S.targetW && (
          <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
            <Icon name="target" style={{ fontSize: 13 }} />
            <span>{t('Goal')} {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}</span>
          </div>
        )}
        <div className="chart" style={{ marginTop: 8 }}><LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} /></div>
      </> : <div className="muted small">{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</div>}
    </div>

    <div className="card tappable" style={{ cursor: 'pointer' }} onClick={() => calendarSheet()}>
      <div className="row between">
        <div>
          <div className="row" style={{ gap: 7, fontSize: 22, fontWeight: 600, letterSpacing: '-.021em' }}>
            <Icon name="flame" style={{ color: 'var(--orange)' }} />
            {t('{0} week streak', streakWeeks(S))}
          </div>
          <div className="muted small" style={{ marginTop: 2 }}>{wThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}</div>
        </div>
        <Icon name="calendar" className="chev" style={{ fontSize: 20 }} />
      </div>
    </div>
  </div>
}
