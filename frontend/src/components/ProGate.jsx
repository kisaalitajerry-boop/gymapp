import React from 'react';
import { useStore } from '../store/useStore.js';
import { canUse, getActiveTier } from '../lib/entitlements.js';
import { useUI } from '../store/useUI.js';
import Icon from './Icon.jsx';
import { t } from '../lib/i18n.js';
import { paywallSheet } from '../sheets.jsx';

export default function ProGate({ feature, fallback, children, prompt }) {
  const S = useStore(s => s.S);
  const userTier = getActiveTier(S?.entitlement);
  const hasAccess = canUse(feature, userTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '24px 18px',
        border: '1px solid rgba(5, 242, 146, 0.25)',
        background: 'linear-gradient(180deg, rgba(19, 25, 34, 0.95) 0%, rgba(13, 20, 28, 0.98) 100%)',
        margin: '12px 0'
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: 'rgba(5, 242, 146, 0.12)',
          color: 'var(--acc)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}
      >
        <Icon name="lock" size={26} />
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#ffffff' }}>
        {t('MuscleTrack Pro')}
      </h3>

      <div style={{ fontSize: 14, color: 'var(--label-2)', lineHeight: 1.5, marginBottom: 16 }}>
        {prompt || t('This feature is exclusive to MuscleTrack Pro members.')}
      </div>

      <button
        className="btn primary pill"
        onClick={() => paywallSheet()}
        style={{ width: '100%', fontSize: 15 }}
      >
        <Icon name="sparkles" size={16} /> {t('Unlock with Pro')}
      </button>
    </div>
  );
}
