import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { computeMuscleRecovery, BODY_GROUPS, RECOVERY_STATUS } from '../lib/recovery.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import BodyMap from '../components/BodyMap.jsx'
import Icon from '../components/Icon.jsx'
import { t } from '../lib/i18n.js'

export default function Recovery() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [tab, setTab] = useState('today') // 'today' | 'weekly' | 'insights' | 'map'
  const [view, setView] = useState('front') // 'front' | 'back'
  const [selectedMuscle, setSelectedMuscle] = useState('chest')

  const recovery = computeMuscleRecovery(S.workouts)
  const selInfo = recovery.muscles[selectedMuscle] || { percent: 100, status: RECOVERY_STATUS.READY, lastTrainedHours: null, hoursUntilReady: 0 }

  // Circle progress calculation for 72% ring
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (recovery.overall / 100) * circumference

  const PILL_GROUPS = [
    { slug: 'chest', label: 'Chest' },
    { slug: 'deltoids', label: 'Shoulders' },
    { slug: 'biceps', label: 'Biceps' },
    { slug: 'abdominals', label: 'Abs' },
    { slug: 'quadriceps', label: 'Quads' },
    { slug: 'calves', label: 'Calves' }
  ]

  return (
    <div className="narrow">
      {/* Header */}
      <div className="hdr" style={{ marginBottom: 12 }}>
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="chevronLeft" />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1, textAlign: 'center' }}>
          {tab === 'map' ? t('Muscle Map') : t('Recovery')}
        </h1>
        <button
          className="iconbtn"
          onClick={() => setTab(t => (t === 'map' ? 'today' : 'map'))}
          aria-label={tab === 'map' ? 'Dashboard' : 'Muscle Map'}
          style={{ color: tab === 'map' ? 'var(--acc)' : 'inherit' }}
        >
          <Icon name={tab === 'map' ? 'chart' : 'person'} />
        </button>
      </div>

      {tab !== 'map' ? (
        <>
          {/* Subtabs: Today | Weekly | Insights */}
          <div className="seg" style={{ marginBottom: 16 }}>
            <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
              {t('Today')}
            </button>
            <button className={tab === 'weekly' ? 'on' : ''} onClick={() => setTab('weekly')}>
              {t('Weekly')}
            </button>
            <button className={tab === 'insights' ? 'on' : ''} onClick={() => setTab('insights')}>
              {t('Insights')}
            </button>
          </div>

          {/* Screen 7: Circular Gauge */}
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div className="recovery-ring-wrap">
              <svg className="recovery-ring-svg" viewBox="0 0 160 160">
                <circle className="recovery-ring-bg" cx="80" cy="80" r={radius} />
                <circle
                  className="recovery-ring-fill"
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={recovery.overall >= 80 ? '#10b981' : recovery.overall >= 60 ? '#05f292' : '#f59e0b'}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="recovery-ring-center">
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {recovery.overall}%
                </div>
              </div>
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {t('Overall Recovery')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--label-2)', marginTop: 4 }}>
              {recovery.overall >= 70 ? t("You're on track! Keep it up.") : t('Rest prioritized for muscle synthesis.')}
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="btn pill-sm pill-outline"
                onClick={() => setTab('map')}
              >
                <Icon name="person" size={16} /> {t('View 3D Muscle Map')}
              </button>
            </div>
          </div>

          {/* Muscle Recovery Bars */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: 'var(--label)' }}>
              {t('Muscle Recovery')}
            </h2>

            {Object.entries(recovery.groups).map(([groupName, groupData]) => {
              const color = groupData.status.color
              return (
                <div key={groupName} className="recovery-row">
                  <span style={{ fontSize: 15, fontWeight: 600, width: 85 }}>
                    {t(groupName)}
                  </span>
                  <div className="recovery-meter">
                    <div
                      className="recovery-fill"
                      style={{ width: `${groupData.percent}%`, background: color }}
                    />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color, minWidth: 42, textAlign: 'right' }}>
                    {groupData.percent}%
                  </span>
                </div>
              )
            })}
          </div>

          {/* Tip Card with Gender Physiology Insight */}
          <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 24, color: 'var(--acc)' }}>
              <Icon name="lightbulb" />
            </span>
            <div style={{ fontSize: 13, color: 'var(--label-2)', lineHeight: 1.45 }}>
              {(S.gender || S.body) === 'female'
                ? t('Female recovery profile: Enhanced intra-set metabolic clearance and high volume capacity for posterior chain. Ensure hydration and steady electrolytes.')
                : t('Male recovery profile: High mechanical tension loading. Prioritize central nervous system rest intervals between heavy compound sets and aim for 7–9 hours sleep.')}
            </div>
          </div>
        </>
      ) : (
        /* Screen 4: Muscle Map */
        <div>
          {/* Gender Anatomical Map Pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <span
              className="tag"
              style={{
                background: 'var(--acc-soft)',
                color: 'var(--acc)',
                border: '1px solid var(--acc-line)',
                padding: '4px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{(S.gender || S.body) === 'female' ? '♀' : '♂'}</span>
              <span>{(S.gender || S.body) === 'female' ? t('Female Anatomical Map') : t('Male Anatomical Map')}</span>
            </span>
          </div>

          {/* Front / Back Toggle Switch */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div className="seg" style={{ width: 220 }}>
              <button className={view === 'front' ? 'on' : ''} onClick={() => setView('front')}>
                {t('Front')}
              </button>
              <button className={view === 'back' ? 'on' : ''} onClick={() => setView('back')}>
                {t('Back')}
              </button>
            </div>
          </div>

          {/* Interactive 3D Body Map Canvas (1.5x Enlarged for Finger Touch) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '18px 12px' }}>
            {/* Body Vector Map 1.5x */}
            <div style={{ width: '88%', maxWidth: 360, margin: '8px 0' }}>
              <BodyMap
                recovery={recovery.muscles}
                singleView={view}
                body={S.gender || S.body || 'male'}
                selected={selectedMuscle}
                onMuscle={slug => setSelectedMuscle(slug)}
              />
            </div>

            {/* Quick Muscle Legend pills with large touch targets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, width: '100%', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--sep-op)' }}>
              {PILL_GROUPS.map(p => {
                const rec = recovery.muscles[p.slug] || { percent: 100, status: RECOVERY_STATUS.READY }
                const isSel = selectedMuscle === p.slug
                return (
                  <div
                    key={p.slug}
                    onClick={() => setSelectedMuscle(p.slug)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isSel ? 'var(--surface-3)' : 'var(--surface-2)',
                      border: isSel ? '1.5px solid var(--acc)' : '1px solid var(--sep-op)',
                      borderRadius: 9999,
                      padding: '6px 13px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      touchAction: 'manipulation'
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: rec.status.color,
                        boxShadow: `0 0 6px ${rec.status.color}`
                      }}
                    />
                    <span>{t(p.label)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Muscle Card (Matching Mockup Screen 4 Bottom) */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>
                  {t(MUSCLE_NAME[selectedMuscle] || selectedMuscle)}
                </span>
                <span className={`badge-status badge-${selInfo.status.label.toLowerCase().replace(' ', '-')}`}>
                  <span className="badge-dot" />
                  {selInfo.percent}% {t(selInfo.status.label)}
                </span>
              </div>
              <Icon name="chevronRight" className="chev" />
            </div>

            <div className="grid2" style={{ borderTop: '1px solid var(--sep-op)', paddingTop: 12 }}>
              <div>
                <div className="lbl2" style={{ fontSize: 12, color: 'var(--label-3)' }}>
                  {t('Last trained')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                  {selInfo.lastTrainedHours !== null
                    ? selInfo.lastTrainedHours < 24
                      ? t('{0}h ago', selInfo.lastTrainedHours)
                      : t('{0} days ago', Math.round(selInfo.lastTrainedHours / 24))
                    : t('Not recently')}
                </div>
              </div>
              <div>
                <div className="lbl2" style={{ fontSize: 12, color: 'var(--label-3)' }}>
                  {t('Suggested rest')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: selInfo.hoursUntilReady > 0 ? 'var(--yellow)' : 'var(--acc)' }}>
                  {selInfo.hoursUntilReady > 0
                    ? t('~{0} hours', selInfo.hoursUntilReady)
                    : t('Ready to train')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
