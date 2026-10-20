import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const on = k => {
    if (k === 'home') return cur === 'home' || cur === ''
    if (k === 'workout') return cur === 'workout'
    if (k === 'stats') return cur === 'stats' || cur === 'history'
    if (k === 'coach') return cur === 'coach'
    if (k === 'more') return cur === 'settings' || cur === 'plan' || cur === 'library' || cur === 'admin' || cur === 'nutrition' || cur === 'recovery' || cur === 'compression'
    return false
  }

  const Tab = ({ k, icon, to, label, badge }) => (
    <button className={on(k) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} />
      <span>{label}</span>
      {badge && <span className="tab-badge" />}
    </button>
  )

  return (
    <nav id="tabbar">
      <Tab k="home" icon="house" to="/home" label={t('Home')} />
      <Tab k="workout" icon="dumbbell" to="/workout" label={t('Workout')} badge={S.active} />
      <Tab k="stats" icon="chart" to="/stats" label={t('Progress')} />
      <Tab k="coach" icon="sparkles" to="/coach" label={t('Coach')} />
      <Tab k="more" icon="grid" to="/settings" label={t('More')} />
    </nav>
  )
}
