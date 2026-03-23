// charts.js
// Canvas-based chart rendering: daily bar chart and model donut chart.
// Depends on globals: DATA, getFilteredData, fmt, fmtCost, formatDate,
// getChartColors, modelLabel, isDark

// Daily chart
function renderDailyChart() {
  const canvas = document.getElementById('dailyChart');
  const ctx = canvas.getContext('2d');
  const data = getFilteredData().dailyUsage;
  if (!data.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth - 48;
  const h = 200;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const c = getChartColors();
  const maxTotal = Math.max(...data.map(d => d.totalTokens));
  const barW = Math.max(8, Math.min(32, (w - 52) / data.length - 3));
  const gap = 3;
  const chartH = h - 36;
  const startX = 48;

  // Grid
  ctx.font = '500 10px Inter, system-ui';
  ctx.fillStyle = c.axisText;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = (maxTotal / 4) * i;
    const y = chartH - (chartH * i / 4) + 8;
    ctx.fillText(fmt(val), startX - 10, y + 3);
    ctx.strokeStyle = c.gridLine; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Bars with gradient
  const inGrad = ctx.createLinearGradient(0, chartH + 8, 0, 0);
  inGrad.addColorStop(0, '#818CF8'); inGrad.addColorStop(1, '#6366F1');
  const outGrad = ctx.createLinearGradient(0, chartH + 8, 0, 0);
  outGrad.addColorStop(0, '#2DD4BF'); outGrad.addColorStop(1, '#14B8A6');
  const cacheReadGrad = ctx.createLinearGradient(0, chartH + 8, 0, 0);
  cacheReadGrad.addColorStop(0, '#06B6D4'); cacheReadGrad.addColorStop(1, '#22D3EE');
  const cacheWriteGrad = ctx.createLinearGradient(0, chartH + 8, 0, 0);
  cacheWriteGrad.addColorStop(0, '#F59E0B'); cacheWriteGrad.addColorStop(1, '#FBBF24');

  const minH = 3;

  data.forEach((d, i) => {
    const x = startX + i * (barW + gap);
    const baseY = chartH + 8;
    const r = Math.min(4, barW / 2);

    // Use fallbacks for old data that lacks the new fields
    const outputTokens = d.outputTokens || 0;
    const cacheReadTokens = d.cacheReadTokens != null ? d.cacheReadTokens : 0;
    const cacheWriteTokens = d.cacheWriteTokens != null ? d.cacheWriteTokens : 0;
    const baseInputTokens = d.baseInputTokens != null ? d.baseInputTokens : d.inputTokens || 0;

    let rawOutH = (outputTokens / maxTotal) * chartH;
    let rawCacheReadH = (cacheReadTokens / maxTotal) * chartH;
    let rawCacheWriteH = (cacheWriteTokens / maxTotal) * chartH;
    let rawBaseInH = (baseInputTokens / maxTotal) * chartH;

    // Apply minH guard: clamp to minH if > 0 but < minH
    const clamp = h => (h > 0 && h < minH) ? minH : h;
    const outH = clamp(rawOutH);
    const cacheReadH = clamp(rawCacheReadH);
    const cacheWriteH = clamp(rawCacheWriteH);
    const baseInH = clamp(rawBaseInH);

    // Stack bottom-to-top: Output, Cache Reads, Cache Writes, Base Input
    let stackY = baseY;

    if (outH > 0) {
      ctx.fillStyle = outGrad;
      ctx.beginPath(); roundedRect(ctx, x, stackY - outH, barW, outH, r); ctx.fill();
      stackY -= outH;
    }

    if (cacheReadH > 0) {
      ctx.fillStyle = cacheReadGrad;
      ctx.beginPath(); roundedRect(ctx, x, stackY - cacheReadH, barW, cacheReadH, r); ctx.fill();
      stackY -= cacheReadH;
    }

    if (cacheWriteH > 0) {
      ctx.fillStyle = cacheWriteGrad;
      ctx.beginPath(); roundedRect(ctx, x, stackY - cacheWriteH, barW, cacheWriteH, r); ctx.fill();
      stackY -= cacheWriteH;
    }

    if (baseInH > 0) {
      ctx.fillStyle = inGrad;
      ctx.beginPath(); roundedRect(ctx, x, stackY - baseInH, barW, baseInH, r); ctx.fill();
    }
  });

  // X labels
  ctx.fillStyle = c.axisText; ctx.textAlign = 'center';
  ctx.font = '500 10px Inter, system-ui';
  const step = Math.max(1, Math.floor(data.length / 7));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      const x = startX + i * (barW + gap) + barW / 2;
      ctx.fillText(formatDate(d.date), x, chartH + 24);
    }
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Model donut
function renderModelChart() {
  const canvas = document.getElementById('modelChart');
  const ctx = canvas.getContext('2d');
  const data = getFilteredData().modelBreakdown;
  if (!data.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); document.getElementById('modelLegend').innerHTML = ''; return; }

  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(180, canvas.parentElement.clientWidth - 48);
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const c = getChartColors();
  const cx = size/2, cy = size/2, r = size/2 - 6, innerR = r * 0.6;
  const total = data.reduce((s, d) => s + d.totalTokens, 0);

  const modelColors = { opus: ['#6366F1','#818CF8'], sonnet: ['#10B981','#34D399'], haiku: ['#F97316','#FB923C'] };
  function getColors(m) {
    for (const [k, c] of Object.entries(modelColors)) { if (m.includes(k)) return c; }
    return ['#94A3B8','#CBD5E1'];
  }

  let angle = -Math.PI / 2;
  const slices = [...data].sort((a, b) => b.totalTokens - a.totalTokens);

  slices.forEach(d => {
    const sa = (d.totalTokens / total) * Math.PI * 2;
    const [c1] = getColors(d.model);

    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + sa);
    ctx.arc(cx, cy, innerR, angle + sa, angle, true);
    ctx.closePath();
    ctx.fillStyle = c1;
    ctx.fill();

    // Gap between slices
    ctx.strokeStyle = c.donutGap; ctx.lineWidth = 2; ctx.stroke();
    angle += sa;
  });

  ctx.fillStyle = c.centerText; ctx.textAlign = 'center';
  ctx.font = '800 17px Inter, system-ui';
  ctx.fillText(fmt(total), cx, cy + 2);
  ctx.font = '500 10px Inter, system-ui';
  ctx.fillStyle = c.centerSub;
  ctx.fillText('total', cx, cy + 16);

  document.getElementById('modelLegend').innerHTML = slices.map(d => {
    const pct = ((d.totalTokens / total) * 100).toFixed(1);
    const cost = d.costWithCache != null ? ' &ndash; ' + fmtCost(d.costWithCache) : '';
    return `<div class="legend-item">
      <div class="legend-dot" style="background:${getColors(d.model)[0]}"></div>
      <span><strong>${modelLabel(d.model)}</strong> &ndash; ${fmt(d.totalTokens)} (${pct}%)${cost}</span>
    </div>`;
  }).join('');
}
