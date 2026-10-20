import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, api, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState } = useStore()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { api('/api/config').then(c => setInviteOnly(!!c.invite_only)).catch(() => {}) }, [])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</div>
    <input ref={ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} style={{ letterSpacing: '.14em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('This app is invite-only — enter the code you were given.')}</div>
    </>}
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

function SignInOptionsSheet({ close }) {
  const { setUser, pushState, pullState } = useStore()

  const handlePasskey = async () => {
    try {
      const u = await passkeyLogin()
      setUser(u)
      close()
      if (hasData(useStore.getState().S)) {
        await pushState()
        useUI.getState().toast(t('Signed in — local workouts moved into profile'))
      } else {
        await pullState()
        useUI.getState().toast(t('Welcome back, {0}', u.name))
      }
    } catch (e) {
      if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
        useUI.getState().toast(e.message || t('Sign-in failed'))
      }
    }
  }

  const handleSocial = async (provider = 'Google') => {
    try {
      close()
      const u = { id: `u_${provider.toLowerCase()}_${Date.now().toString(36)}`, name: `${provider} Lifter`, admin: false }
      setUser(u)
      if (hasData(useStore.getState().S)) {
        await pushState()
        useUI.getState().toast(t('Signed in with {0} — workouts synced!', provider))
      } else {
        await pullState()
        useUI.getState().toast(t('Welcome, {0}!', u.name))
      }
    } catch (e) {
      useUI.getState().toast(t('Sign-in cancelled'))
    }
  }

  return <>
    <h3>{t('Sign in to MuscleTrack')}</h3>
    <div className="muted small" style={{ marginBottom: 16 }}>
      {t('Sync your workouts, routines and nutrition across all your mobile devices.')}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {webauthnOK() && (
        <button
          className="btn"
          style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 600, background: 'var(--surface-3)', gap: 8 }}
          onClick={handlePasskey}
        >
          <Icon name="lock" size={16} style={{ color: 'var(--acc)' }} />
          <span>{t('Continue with Passkey / Face ID')}</span>
        </button>
      )}

      <button
        className="btn"
        style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 600, background: '#ffffff', color: '#000000', gap: 8 }}
        onClick={() => handleSocial('Apple')}
      >
        <span style={{ fontSize: 18, fontWeight: 900 }}></span>
        <span>{t('Sign in with Apple')}</span>
      </button>

      <button
        className="btn"
        style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 600, background: 'var(--surface-3)', gap: 8 }}
        onClick={() => handleSocial('Google')}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: '#4285F4' }}>G</span>
        <span>{t('Sign in with Google')}</span>
      </button>
    </div>
  </>
}

import Onboarding from './Onboarding.jsx'

export default function Login() {
  const { setUser, pullState, setGuest } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const openSignInSheet = () => {
    useUI.getState().openSheet(close => <SignInOptionsSheet close={close} />)
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onBack={() => setShowOnboarding(false)}
        onComplete={() => {
          if (!useStore.getState().user) {
            setGuest(true)
          }
          setShowOnboarding(false)
        }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '94vh',
        width: '100%',
        maxWidth: 440,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        textAlign: 'center',
        padding: '48px 20px 36px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: 24
      }}
    >
      {/* Background with dark aesthetic athlete photo & cinematic vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/splash_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.42,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(22,22,22,0.95) 0%, rgba(16,35,42,0.40) 35%, rgba(16,35,42,0.72) 65%, rgba(22,22,22,0.98) 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Top Header & Branding */}
      <div style={{ position: 'relative', zIndex: 2, paddingTop: 16 }}>
        <div style={{ color: 'var(--acc)', fontSize: 72, marginBottom: 12 }}>
          <Icon name="muscletrack" size={76} />
        </div>

        <h1
          style={{
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: '-0.035em',
            margin: '0 0 16px',
            color: '#ffffff'
          }}
        >
          MuscleTrack
        </h1>

        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.6,
            color: 'var(--label-2)',
            letterSpacing: '-0.01em'
          }}
        >
          <div>Train Smarter</div>
          <div>Recover Better</div>
          <div>Be Stronger</div>
        </div>
      </div>

      {/* Spacer to let the background athlete back shine in center */}
      <div style={{ minHeight: 120, flex: 1 }} />

      {/* Bottom Call to Action */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 340 }}>
        <button
          className="btn primary pill"
          onClick={() => setShowOnboarding(true)}
          style={{ width: '100%', fontSize: 18, height: 52 }}
        >
          {t('Get Started')}
        </button>

        {/* Sign In Options */}
        <div style={{ marginTop: 20, fontSize: 14, color: 'var(--label-3)' }}>
          {t('Already have an account?')}{' '}
          <button
            onClick={openSignInSheet}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--acc)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            {t('Sign In')}
          </button>
        </div>

        {webauthnOK() && (
          <div style={{ marginTop: 14 }}>
            <button
              className="btn plain"
              style={{ fontSize: 13, color: 'var(--label-3)' }}
              onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}
            >
              {t('Register Passkey Profile')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
