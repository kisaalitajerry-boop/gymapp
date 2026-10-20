import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import Icon from '../components/Icon.jsx';
import { t } from '../lib/i18n.js';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/purchases.js';
import { TIERS } from '../lib/entitlements.js';

export default function Paywall({ close }) {
  const { update } = useStore();
  const { toast } = useUI();
  const [selectedPlan, setSelectedPlan] = useState('annual'); // 'annual' | 'monthly'
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOfferings().then(setOfferings);
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const pkgId = selectedPlan === 'annual' ? '$rc_annual' : '$rc_monthly';
      const res = await purchasePackage(pkgId);
      if (res.success && res.tier === TIERS.PRO) {
        update(s => {
          s.entitlement = 'pro';
        });
        toast(t('Welcome to MuscleTrack Pro! All features unlocked.'));
        if (close) close();
      } else if (!res.cancelled) {
        toast(t('Purchase could not be completed. Please try again.'));
      }
    } catch (err) {
      toast(err.message || t('Subscription failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await restorePurchases();
      if (res.tier === TIERS.PRO) {
        update(s => {
          s.entitlement = 'pro';
        });
        toast(t('Pro subscription restored successfully!'));
        if (close) close();
      } else {
        toast(t('No active subscription found to restore.'));
      }
    } catch (err) {
      toast(err.message || t('Restore failed'));
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = offerings?.current?.monthly?.product?.priceString || '$9.99';
  const annualPrice = offerings?.current?.annual?.product?.priceString || '$59.99';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 8px 24px',
        maxWidth: 440,
        margin: '0 auto',
        textAlign: 'center'
      }}
    >
      {/* Brand & Badge */}
      <div style={{ color: 'var(--acc)', fontSize: 44, marginBottom: 8 }}>
        <Icon name="muscletrack" size={48} />
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(5, 242, 146, 0.12)',
          color: 'var(--acc)',
          padding: '4px 14px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 10
        }}
      >
        <Icon name="sparkles" size={14} /> MuscleTrack Pro
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
        {t('Unlock Your Peak Physique')}
      </h2>

      <div style={{ fontSize: 14, color: 'var(--label-2)', marginBottom: 24, lineHeight: 1.5 }}>
        {t('Train Smarter • Recover Better • Be Stronger')}
      </div>

      {/* Feature Value Props */}
      <div
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'var(--surface)',
          borderRadius: 'var(--r-card)',
          padding: '16px',
          marginBottom: 20,
          border: '1px solid var(--border)'
        }}
      >
        {[
          {
            title: t('AI Coach Personalized Guidance'),
            desc: t('Dynamic recommendations based on your muscle recovery readiness.')
          },
          {
            title: t('3D Interactive Muscle Recovery Map'),
            desc: t('Track fatigue and visualize readiness for chest, back, shoulders & legs.')
          },
          {
            title: t('Adaptive Nutrition Engine'),
            desc: t('Smart TDEE algorithm adjusts your calorie and macro targets automatically.')
          },
          {
            title: t('AI Vision Meal Scanner'),
            desc: t('Instant nutrition logging with camera vision powered by Gemini.')
          },
          {
            title: t('Advanced Progress & 1RM Trends'),
            desc: t('Volume analytics, projected 1RM curves and strength milestone tracking.')
          }
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i === 4 ? 0 : 14 }}>
            <div style={{ color: 'var(--acc)', marginTop: 2 }}>
              <Icon name="checkCircle" size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Selector Cards */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {/* Annual Option */}
        <div
          onClick={() => setSelectedPlan('annual')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 'var(--r-card)',
            cursor: 'pointer',
            border: selectedPlan === 'annual' ? '2px solid var(--acc)' : '1px solid var(--sep)',
            background: selectedPlan === 'annual' ? 'var(--acc-soft)' : 'var(--surface)',
            position: 'relative'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--label)' }}>{t('Annual Plan')}</span>
              <span
                style={{
                  background: 'var(--acc)',
                  color: 'var(--on-acc)',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 10
                }}
              >
                {t('SAVE 50%')}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>
              {t('7 days free, then {0}/year ($4.99/mo)', annualPrice)}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--acc)' }}>{annualPrice}</div>
        </div>

        {/* Monthly Option */}
        <div
          onClick={() => setSelectedPlan('monthly')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 'var(--r-card)',
            cursor: 'pointer',
            border: selectedPlan === 'monthly' ? '2px solid var(--acc)' : '1px solid var(--border)',
            background: selectedPlan === 'monthly' ? 'rgba(5, 242, 146, 0.08)' : 'var(--surface)'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{t('Monthly Plan')}</div>
            <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>
              {t('Billed monthly, cancel anytime')}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>{monthlyPrice}</div>
        </div>
      </div>

      {/* Main Action Button */}
      <button
        className="btn primary pill"
        disabled={loading}
        onClick={handleSubscribe}
        style={{ width: '100%', fontSize: 17, height: 50, marginBottom: 12 }}
      >
        {loading ? t('Processing…') : t('Start 7-Day Free Trial')}
      </button>

      {/* Secondary Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: 'var(--label-3)' }}>
        <button
          onClick={handleRestore}
          style={{ background: 'none', border: 'none', color: 'var(--label-2)', cursor: 'pointer', padding: 0 }}
        >
          {t('Restore Purchases')}
        </button>
        <span>•</span>
        <button
          onClick={() => {}}
          style={{ background: 'none', border: 'none', color: 'var(--label-3)', cursor: 'pointer', padding: 0 }}
        >
          {t('Terms of Service')}
        </button>
        <span>•</span>
        <button
          onClick={() => {}}
          style={{ background: 'none', border: 'none', color: 'var(--label-3)', cursor: 'pointer', padding: 0 }}
        >
          {t('Privacy Policy')}
        </button>
      </div>
    </div>
  );
}
