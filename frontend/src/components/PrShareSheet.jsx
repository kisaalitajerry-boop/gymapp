import { useState, useEffect } from 'react';
import { generatePrCardDataUrl, sharePrCard } from '../lib/share-card.js';
import { useUI } from '../store/useUI.js';
import { t } from '../lib/i18n.js';
import Icon from './Icon.jsx';

export default function PrShareSheet({ prData, close }) {
  const toast = useUI(s => s.toast);
  const [dataUrl, setDataUrl] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    try {
      const url = generatePrCardDataUrl(prData);
      setDataUrl(url);
    } catch (e) {
      toast(t('Could not generate share graphic'));
    }
  }, [prData]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await sharePrCard(prData);
      if (res.shared) {
        toast(t('PR shared successfully!'));
      } else if (res.downloaded) {
        toast(t('PR graphic saved to downloads!'));
      }
    } catch (err) {
      toast(t('Sharing cancelled or failed'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '12px 6px 16px' }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t('Share New PR')}</h3>
        <button className="iconbtn" onClick={close} aria-label="Close">
          <Icon name="xmark" />
        </button>
      </div>

      <div style={{ color: 'var(--label-2)', fontSize: 14, marginBottom: 14 }}>
        {t('Celebrate your milestone! Ready for Instagram Stories, TikTok, or WhatsApp.')}
      </div>

      {/* Card Preview */}
      <div
        style={{
          width: '100%',
          maxWidth: 240,
          aspectRatio: '9/16',
          margin: '0 auto 18px',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          border: '1px solid rgba(5, 242, 146, 0.3)',
          background: '#090d12'
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="PR Share Card Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="muted small" style={{ paddingTop: 100 }}>
            {t('Rendering…')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={() => {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `MuscleTrack_PR_${prData.exerciseName.replace(/\s+/g, '_')}.png`;
            a.click();
            toast(t('Graphic saved!'));
          }}
          disabled={!dataUrl}
        >
          <Icon name="arrowDown" size={16} />
          <span>{t('Save Image')}</span>
        </button>

        <button
          className="btn primary pill"
          style={{ flex: 1 }}
          onClick={handleShare}
          disabled={!dataUrl || sharing}
        >
          <Icon name="share" size={16} />
          <span>{sharing ? t('Sharing…') : t('Share Story')}</span>
        </button>
      </div>
    </div>
  );
}
