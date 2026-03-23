// drilldown.js
// Session drilldown panel: open/close individual session details.
// Depends on globals: DATA, fmt, formatDate, escapeHtml, modelLabel, fmtCost, getChartColors

// Simplified client-side cost estimation (mirrors parser.js computeCost)
// Uses approximate pricing per 1M tokens for common model families
const DRILLDOWN_PRICING = {
  'opus':   { input: 15.00, cacheWrite: 18.75, cacheRead: 1.50, output: 75.00 },
  'sonnet': { input: 3.00,  cacheWrite: 3.75,  cacheRead: 0.30, output: 15.00 },
  'haiku':  { input: 0.80,  cacheWrite: 1.00,  cacheRead: 0.08, output: 4.00 },
};

function clientComputeCost(model, baseInput, cacheWrite, cacheRead, output) {
  let family = 'sonnet'; // default
  if (model && model.includes('opus')) family = 'opus';
  else if (model && model.includes('haiku')) family = 'haiku';
  const p = DRILLDOWN_PRICING[family];
  return (baseInput * p.input + cacheWrite * p.cacheWrite + cacheRead * p.cacheRead + output * p.output) / 1000000;
}

function renderDrilldownCostChart(grouped) {
  const canvas = document.getElementById('drilldownCostCanvas');
  if (!canvas || grouped.length < 3) {
    if (canvas) canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 180;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const c = getChartColors();
  const costs = grouped.map(g => g.cost);
  const maxCost = Math.max.apply(null, costs);
  if (maxCost <= 0) { canvas.style.display = 'none'; return; }

  const padL = 55, padR = 16, padT = 16, padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  // Y-axis labels
  ctx.font = '500 10px Inter, system-ui';
  ctx.fillStyle = c.axisText;
  ctx.textAlign = 'right';
  for (let yi = 0; yi <= 4; yi++) {
    const val = (maxCost / 4) * yi;
    const y = padT + chartH - (chartH * yi / 4);
    ctx.fillText(fmtCost(val), padL - 8, y + 3);
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  // Plot points
  const points = [];
  for (let i = 0; i < costs.length; i++) {
    const px = padL + (i / Math.max(1, costs.length - 1)) * chartW;
    const py = padT + chartH - (costs[i] / maxCost) * chartH;
    points.push({ x: px, y: py });
  }

  // Area fill with gradient
  const areaGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  areaGrad.addColorStop(0, 'rgba(99,102,241,0.25)');
  areaGrad.addColorStop(1, 'rgba(99,102,241,0.02)');
  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, padT + chartH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padT + chartH);
  ctx.closePath();
  ctx.fill();

  // Line
  const lineGrad = ctx.createLinearGradient(padL, 0, padL + chartW, 0);
  lineGrad.addColorStop(0, '#6366F1');
  lineGrad.addColorStop(1, '#A855F7');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Dots
  points.forEach(p => {
    ctx.fillStyle = '#6366F1';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // Find inflection (most expensive turn if > 3x median)
  const sortedCosts = costs.slice().sort((a, b) => a - b);
  const median = sortedCosts[Math.floor(sortedCosts.length / 2)];
  const maxIdx = costs.indexOf(Math.max.apply(null, costs));
  if (maxIdx > 0 && costs[maxIdx] > median * 3 && costs[maxIdx] > 0.01) {
    // Vertical dashed inflection line
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(points[maxIdx].x, padT);
    ctx.lineTo(points[maxIdx].x, padT + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#F43F5E';
    ctx.font = '500 10px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Turn ' + (maxIdx + 1) + ' \u00B7 ' + fmtCost(costs[maxIdx]), points[maxIdx].x, padT - 4);
  }

  // X-axis labels
  ctx.fillStyle = c.axisText;
  ctx.textAlign = 'center';
  ctx.font = '500 10px Inter, system-ui';
  const labelStep = Math.max(1, Math.floor(costs.length / 8));
  for (let xi = 0; xi < costs.length; xi++) {
    if (xi % labelStep === 0 || xi === costs.length - 1) {
      ctx.fillText(String(xi + 1), points[xi].x, padT + chartH + 16);
    }
  }
}

function renderDrilldownInsight(grouped) {
  const el = document.getElementById('drilldownInsight');
  if (!el || grouped.length < 3) { if (el) el.style.display = 'none'; return; }

  const costs = grouped.map(g => g.cost);
  const sortedCosts = costs.slice().sort((a, b) => a - b);
  const median = sortedCosts[Math.floor(sortedCosts.length / 2)];
  const maxCost = Math.max.apply(null, costs);
  const maxIdx = costs.indexOf(maxCost);
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;

  let html, bg, icon;

  if (maxIdx > 0 && maxCost > median * 3 && maxCost > 0.01) {
    // Spike warning
    const ratio = (maxCost / median).toFixed(1);
    bg = 'rgba(245,158,11,0.1)';
    icon = '\u26A0\uFE0F';
    html = '<strong>Turn ' + (maxIdx + 1) + ' cost ' + fmtCost(maxCost) + '</strong> \u2014 ' + ratio + 'x more than the typical turn (' + fmtCost(median) + '). Consider using <code>/clear</code> before expensive context switches.';
  } else if (grouped.length >= 30) {
    // Long conversation
    const lastQ = costs.slice(-Math.ceil(costs.length / 4));
    const lastQAvg = lastQ.reduce((a, b) => a + b, 0) / lastQ.length;
    bg = 'rgba(59,130,246,0.1)';
    icon = '\uD83D\uDCA1';
    html = '<strong>Long conversation (' + grouped.length + ' turns)</strong> \u2014 avg ' + fmtCost(avgCost) + '/turn, last quarter avg ' + fmtCost(lastQAvg) + '/turn. Splitting into smaller conversations can reduce per-turn costs.';
  } else {
    // Healthy
    const totalCost = costs.reduce((a, b) => a + b, 0);
    bg = 'rgba(16,185,129,0.1)';
    icon = '\u2705';
    html = '<strong>Efficient conversation</strong> \u2014 ' + grouped.length + ' turns, ' + fmtCost(totalCost) + ' total, avg ' + fmtCost(avgCost) + '/turn.';
  }

  el.style.display = 'block';
  el.style.background = bg;
  el.innerHTML = '<span style="font-size:16px">' + icon + '</span> <span>' + html + '</span>';
}

function openDrilldown(sessionId) {
  const session = DATA.sessions.find(s => s.sessionId === sessionId);
  if (!session) return;

  document.getElementById('drilldownTitle').textContent = session.firstPrompt.substring(0, 140);
  document.getElementById('drilldownMeta').textContent =
    `${formatDate(session.date)} \u00B7 ${modelLabel(session.model)} \u00B7 ${session.queryCount} messages \u00B7 ${fmt(session.totalTokens)} tokens used`;

  const grouped = [];
  let current = null;
  for (const q of session.queries) {
    if (q.userPrompt) {
      if (current) grouped.push(current);
      current = {
        prompt: q.userPrompt,
        model: q.model,
        baseInputTokens: q.baseInputTokens || 0,
        cacheWriteTokens: q.cacheWriteTokens || 0,
        cacheReadTokens: q.cacheReadTokens || 0,
        inputTokens: q.inputTokens,
        outputTokens: q.outputTokens,
        totalTokens: q.totalTokens,
        continuations: 0
      };
    } else if (current) {
      current.baseInputTokens += q.baseInputTokens || 0;
      current.cacheWriteTokens += q.cacheWriteTokens || 0;
      current.cacheReadTokens += q.cacheReadTokens || 0;
      current.inputTokens += q.inputTokens;
      current.outputTokens += q.outputTokens;
      current.totalTokens += q.totalTokens;
      current.continuations++;
    }
  }
  if (current) grouped.push(current);

  grouped.forEach(g => {
    g.cost = clientComputeCost(g.model, g.baseInputTokens, g.cacheWriteTokens, g.cacheReadTokens, g.outputTokens);
  });

  document.getElementById('queryList').innerHTML = grouped.map((g, i) => {
    const cont = g.continuations > 0 ? ` + ${g.continuations} tool uses` : '';
    const costStr = g.cost > 0 ? ` \u00B7 ${fmtCost(g.cost)}` : '';
    return `<div class="query-item">
      <div class="query-num">${i + 1}</div>
      <div class="query-prompt">${escapeHtml(g.prompt.substring(0, 500))}</div>
      <div class="query-tokens-col">
        <div class="total">${fmt(g.totalTokens)}</div>
        <div class="detail">${fmt(g.inputTokens)} read / ${fmt(g.outputTokens)} written${cont}${costStr}</div>
      </div>
    </div>`;
  }).join('');

  const panel = document.getElementById('drilldown');
  renderDrilldownCostChart(grouped);
  renderDrilldownInsight(grouped);
  panel.classList.add('open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDrilldown() {
  document.getElementById('drilldown').classList.remove('open');
}
