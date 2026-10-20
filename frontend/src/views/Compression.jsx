import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Icon from '../components/Icon.jsx'
import { t } from '../lib/i18n.js'

const GEAR_ITEMS = [
  { id: 'socks', label: 'Compression Socks', icon: 'socks' },
  { id: 'knee', label: 'Knee Sleeve', icon: 'kneeSleeve' },
  { id: 'calf', label: 'Calf Sleeve', icon: 'calfSleeve' },
  { id: 'thigh', label: 'Thigh Sleeve', icon: 'thighSleeve' },
  { id: 'arm', label: 'Arm Sleeve', icon: 'armSleeve' },
  { id: 'boots', label: 'Recovery Boots', icon: 'boots' }
]

const DURATIONS = [15, 30, 45, 60]

export default function Compression() {
  const nav = useNavigate()
  const { toast } = useUI()
  const [subtab, setSubtab] = useState('log') // 'log' | 'history'
  const [selectedGear, setSelectedGear] = useState(['socks'])
  const [duration, setDuration] = useState(45)
  const [startTime, setStartTime] = useState('7:30 PM')
  const [activeSession, setActiveSession] = useState(null)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0)

  const toggleGear = id => {
    setSelectedGear(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(g => g !== id) : prev) : [...prev, id]
    )
  }

  const startSession = () => {
    const itemLabels = selectedGear.map(id => GEAR_ITEMS.find(g => g.id === id)?.label).join(', ')
    setActiveSession({ items: itemLabels, duration, startedAt: Date.now() })
    setSessionSecondsLeft(duration * 60)
    toast(t('Recovery compression session started ({0} min)', duration))
  }

  return (
    <div className="narrow">
      {/* Header */}
      <div className="hdr" style={{ marginBottom: 14 }}>
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="chevronLeft" />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1, textAlign: 'center' }}>
          {t('Compression')}
        </h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Subtabs: Log | History */}
      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={subtab === 'log' ? 'on' : ''} onClick={() => setSubtab('log')}>
          {t('Log')}
        </button>
        <button className={subtab === 'history' ? 'on' : ''} onClick={() => setSubtab('history')}>
          {t('History')}
        </button>
      </div>

      {subtab === 'log' ? (
        <>
          {activeSession ? (
            <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 48, color: 'var(--acc)', marginBottom: 12 }}>
                <Icon name="clock" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
                {t('Session in Progress')}
              </h2>
              <div style={{ color: 'var(--label-2)', fontSize: 15, marginBottom: 18 }}>
                {activeSession.items} · {activeSession.duration} {t('min')}
              </div>
              <button
                className="btn primary pill"
                onClick={() => {
                  setActiveSession(null)
                  toast(t('Recovery session completed & logged!'))
                }}
              >
                {t('Complete Session')}
              </button>
            </div>
          ) : (
            <>
              {/* Gear selection prompt */}
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label-2)', marginBottom: 8 }}>
                {t('What are you using?')}
              </div>

              {/* 2x3 Gear Grid matching mockup Screen 8 */}
              <div className="gear-grid">
                {GEAR_ITEMS.map(g => {
                  const sel = selectedGear.includes(g.id)
                  return (
                    <div
                      key={g.id}
                      className={'gear-card' + (sel ? ' selected' : '')}
                      onClick={() => toggleGear(g.id)}
                    >
                      <div className="gear-icon">
                        <Icon name={g.icon} size={28} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: sel ? '#ffffff' : 'var(--label-2)' }}>
                        {t(g.label)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Timing parameters */}
              <div className="card" style={{ marginTop: 12 }}>
                <div className="row between" style={{ marginBottom: 14 }}>
                  <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
                    {t('Start Time')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--acc)', fontWeight: 600, cursor: 'pointer' }}>
                    <span>{startTime}</span>
                    <Icon name="chevronDown" size={14} />
                  </div>
                </div>

                <div className="lbl2" style={{ fontSize: 13, color: 'var(--label-3)', marginBottom: 10 }}>
                  {t('Duration')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      className={'chip' + (duration === d ? ' on' : '')}
                      style={{ flex: 1, padding: '10px 0', fontSize: 14, textAlign: 'center' }}
                      onClick={() => setDuration(d)}
                    >
                      {d} {t('min')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Session Button */}
              <div style={{ marginTop: 20 }}>
                <button
                  className="btn primary pill"
                  onClick={startSession}
                  style={{ width: '100%', fontSize: 17 }}
                >
                  {t('Start Session')}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        /* History tab */
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            {t('Recent Recovery Sessions')}
          </div>
          <div className="recovery-row">
            <div>
              <div style={{ fontWeight: 600 }}>{t('Compression Socks')}</div>
              <div style={{ fontSize: 12, color: 'var(--label-3)' }}>{t('Yesterday')} · 45 min</div>
            </div>
            <span className="badge-status badge-ready">
              <span className="badge-dot" /> {t('Recovered')}
            </span>
          </div>
          <div className="recovery-row">
            <div>
              <div style={{ fontWeight: 600 }}>{t('Knee Sleeve & Recovery Boots')}</div>
              <div style={{ fontSize: 12, color: 'var(--label-3)' }}>{t('3 days ago')} · 30 min</div>
            </div>
            <span className="badge-status badge-ready">
              <span className="badge-dot" /> {t('Recovered')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
