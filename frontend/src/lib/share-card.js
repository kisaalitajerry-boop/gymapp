// PR Share Card Canvas Generator (1080x1920 Story Aspect Ratio)
import { fmtDate, todayISO } from './format.js';

/**
 * Renders a branded 1080x1920 personal record achievement graphic to an offscreen HTML5 canvas.
 */
export function renderPrCardCanvas({
  exerciseName = 'Bench Press',
  weight = 100,
  reps = 5,
  e1rm = 115,
  unit = 'kg',
  date = todayISO(),
  userName = 'Athlete'
}, customCanvas = null) {
  const canvas = customCanvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!canvas) {
    return {
      width: 1080,
      height: 1920,
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };
  }
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return canvas;

  // 1. Dark athletic luxury gradient background
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, '#161616');
  bg.addColorStop(0.35, '#10232A');
  bg.addColorStop(0.7, '#18242A');
  bg.addColorStop(1, '#161616');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Ambient radial warm bronze glow in the center
  const glow = ctx.createRadialGradient(540, 960, 50, 540, 960, 600);
  glow.addColorStop(0, 'rgba(181, 136, 99, 0.18)');
  glow.addColorStop(0.5, 'rgba(181, 136, 99, 0.05)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Grid accent lines
  ctx.strokeStyle = 'rgba(167, 158, 156, 0.06)';
  ctx.lineWidth = 2;
  for (let y = 100; y < 1920; y += 120) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(1000, y);
    ctx.stroke();
  }

  // 4. Top Header & App Branding
  ctx.textAlign = 'center';

  // Brand Name
  ctx.fillStyle = '#B58863';
  ctx.font = '800 52px system-ui, -apple-system, sans-serif';
  ctx.fillText('MUSCLETRACK', 540, 240);

  ctx.fillStyle = '#D3C3B9';
  ctx.font = '600 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('TRAIN SMARTER · RECOVER BETTER', 540, 290);

  // 5. Achievement Badge
  ctx.fillStyle = 'rgba(181, 136, 99, 0.14)';
  ctx.strokeStyle = '#B58863';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(310, 390, 460, 72, 36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#B58863';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('★ NEW PERSONAL RECORD ★', 540, 438);

  // 6. Exercise Title Card
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px system-ui, -apple-system, sans-serif';
  const cleanExName = (exerciseName || '').toUpperCase();
  ctx.fillText(cleanExName, 540, 680);

  // 7. Giant Weight & Reps Showcase
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.roundRect(140, 760, 800, 480, 40);
  ctx.fill();
  ctx.strokeStyle = 'rgba(167, 158, 156, 0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight number
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 160px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${weight}`, 540, 960);

  ctx.fillStyle = '#B58863';
  ctx.font = '800 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${unit.toUpperCase()} × ${reps} ${reps === 1 ? 'REP' : 'REPS'}`, 540, 1050);

  ctx.fillStyle = '#D3C3B9';
  ctx.font = '500 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(`ESTIMATED 1RM: ${e1rm} ${unit.toUpperCase()}`, 540, 1140);

  // 8. Lifter Info & Date
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(userName || 'Athlete', 540, 1420);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '500 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(fmtDate(date, true), 540, 1470);

  // 9. Watermark / Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '500 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('Logged with MuscleTrack Commercial Fitness App', 540, 1780);

  return canvas;
}

export function generatePrCardDataUrl(prData) {
  const canvas = renderPrCardCanvas(prData);
  return canvas.toDataURL('image/png');
}

export async function sharePrCard(prData) {
  const dataUrl = generatePrCardDataUrl(prData);

  // If Web Share API supports file sharing
  if (navigator.share && navigator.canShare) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `PR_${prData.exerciseName.replace(/\s+/g, '_')}.png`, {
        type: 'image/png'
      });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `New PR: ${prData.exerciseName}`,
          text: `Hit a new PR on ${prData.exerciseName}: ${prData.weight} ${prData.unit} × ${prData.reps} reps!`
        });
        return { shared: true };
      }
    } catch (e) {
      // Fallback below
    }
  }

  // Fallback direct download
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `MuscleTrack_PR_${prData.exerciseName.replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return { downloaded: true };
}
