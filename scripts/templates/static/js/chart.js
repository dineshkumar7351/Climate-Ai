// Live SWIR Spectral Absorption Canvas Chart Rendering
function drawSpectralChart(hasPlume) {
  const canvas = document.getElementById('spectralCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Grid background
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Spectral Curve
  ctx.beginPath();
  ctx.strokeStyle = hasPlume ? '#ef4444' : '#00f0ff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = hasPlume ? 'rgba(239, 68, 68, 0.6)' : 'rgba(0, 240, 255, 0.6)';
  ctx.shadowBlur = 8;

  for (let x = 0; x < w; x++) {
    const normX = x / w;
    let baseline = 0.5 + 0.15 * Math.sin(normX * 6);
    // Characteristic CH4 absorption dip at 2.30 µm (approx x=0.65)
    if (hasPlume) {
      const dip = 0.45 * Math.exp(-Math.pow((normX - 0.65) / 0.08, 2));
      baseline -= dip;
    }
    const y = h - (baseline * h * 0.8 + 10);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Marker for 2.3 µm
  const markerX = w * 0.65;
  ctx.fillStyle = hasPlume ? '#ef4444' : '#00f0ff';
  ctx.font = '9px JetBrains Mono';
  ctx.fillText('2.30µm CH₄ Dip', markerX - 35, 20);
}
