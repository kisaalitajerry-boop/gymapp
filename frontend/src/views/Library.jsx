import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf } from '../lib/exercises.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const ql = q.toLowerCase().trim()
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && (!ql || e.n.toLowerCase().includes(ql) || e.tg.includes(ql) || e.eq.includes(ql) || (e.desc || '').toLowerCase().includes(ql)))
  const eqOpts = equipmentOf(base)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? base.filter(e => e.eq === eqOn) : base

  return <>
    <div className="hdr" style={{ marginBottom: 12 }}>
      <button className="iconbtn" onClick={() => window.history.back()} aria-label="Back">
        <Icon name="chevronLeft" />
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, flex: 1, textAlign: 'center' }}>
        {t('Log Workout')}
      </h1>
      <div style={{ width: 36 }} />
    </div>

    {/* Search exercises input with filter icon */}
    <div className="search" style={{ marginBottom: 12 }}>
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        className="input"
        placeholder={t('Search exercises…')}
        value={q}
        onChange={e => { setQ(e.target.value); setShown(40) }}
      />
    </div>

    {/* Category chips: All, Chest, Back, Shoulders */}
    <div className="chips" style={{ marginBottom: 14 }}>
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>
        {t('All')}
      </button>
      {['chest', 'back', 'shoulders', 'upper arms', 'upper legs'].map(b => (
        <button
          key={b}
          className={'chip' + (bp === b ? ' on' : '')}
          onClick={() => { setBp(b); setEq(''); setShown(40) }}
        >
          {t(b === 'upper arms' ? 'Arms' : b === 'upper legs' ? 'Legs' : b)}
        </button>
      ))}
    </div>

    {/* Exercise List matching mockup Screen 5 */}
    <div className="list">
      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        const muscles = [e.tg, e.sm].filter(Boolean).slice(0, 2).map(m => t(m)).join(' • ')
        return (
          <div
            key={e.id}
            className="item"
            style={{ borderRadius: 'var(--r-card)', padding: '12px 14px' }}
            onClick={() => exerciseDetailSheet(e)}
          >
            <Thumb ex={e} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="tt capitalize" style={{ fontSize: 16, fontWeight: 600 }}>
                {e.n}
              </div>
              <div className="ss capitalize" style={{ color: 'var(--label-2)', fontSize: 13, marginTop: 2 }}>
                {muscles || t(e.bp)}
              </div>
            </div>
            {best > 0 && <span className="tag acc">{fmtNum(best)} {S.unit}</span>}
            <Icon name="chevronRight" className="chev" />
          </div>
        )
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>

    {/* + Add Custom Exercise button at bottom matching Screen 5 */}
    <div style={{ marginTop: 18, marginBottom: 20 }}>
      <button
        className="btn primary pill-outline"
        onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}
        style={{ width: '100%', fontSize: 16 }}
      >
        <Icon name="plus" size={18} /> {t('Add Custom Exercise')}
      </button>
    </div>

    {f.length > shown && (
      <div style={{ marginBottom: 20 }}>
        <Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button>
      </div>
    )}
  </>
}
