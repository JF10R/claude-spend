// share.js — Shareable stats card (canvas PNG)

function generateShareImage() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const W = 1200, H = 630;
  canvas.width = W;
  canvas.height = H;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0F172A');
  bg.addColorStop(1, '#1E293B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(99,102,241,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Glow effect
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 400);
  glow.addColorStop(0, 'rgba(99,102,241,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 36px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Claude Code Usage Stats', 60, 80);

  // Date range
  const d = getFilteredData();
  const t = d.totals;
  const range = t.dateRange;
  if (range) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillText(range.from + '  —  ' + range.to, 60, 115);
  }

  // Top insight
  const insights = DATA.insights || [];
  if (insights.length > 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px Inter, system-ui, sans-serif';
    const insightText = insights[0].title;
    const lines = wrapText(ctx, insightText, 1080, 2);
    lines.forEach(function(line, i) {
      ctx.fillText(line, 60, 155 + i * 22);
    });
  }

  // Divider
  ctx.strokeStyle = 'rgba(148,163,184,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 200);
  ctx.lineTo(W - 60, 200);
  ctx.stroke();

  // Stats grid (2x2)
  const cacheSavings = t.costWithoutCache > 0 ? ((t.costWithoutCache - t.costWithCache) / t.costWithoutCache * 100).toFixed(0) : 0;
  const stats = [
    { label: 'Estimated Cost', value: fmtCost(t.costWithCache), sub: fmtCost(t.costWithoutCache) + ' without cache' },
    { label: 'Total Tokens', value: fmt(t.totalTokens), sub: fmt(t.totalInputTokens) + ' in / ' + fmt(t.totalOutputTokens) + ' out' },
    { label: 'Conversations', value: fmtFull(t.totalSessions), sub: '~' + fmt(t.avgTokensPerSession) + ' tokens each' },
    { label: 'Cache Savings', value: cacheSavings + '%', sub: fmtCost(t.costWithoutCache - t.costWithCache) + ' saved' },
  ];

  const colW = 540, rowH = 140;
  const startY = 230;
  stats.forEach(function(stat, i) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 60 + col * colW;
    const y = startY + row * rowH;

    // Card background
    ctx.fillStyle = 'rgba(30,41,59,0.6)';
    ctx.beginPath();
    roundedRect(ctx, x, y, colW - 20, rowH - 20, 12);
    ctx.fill();

    // Label
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, x + 20, y + 32);

    // Value
    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.fillText(stat.value, x + 20, y + 72);

    // Sub
    ctx.fillStyle = '#64748B';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.fillText(stat.sub, x + 20, y + 98);
  });

  // Footer branding
  ctx.fillStyle = '#475569';
  ctx.font = '500 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Claude Spend — claude-spend.dev', W / 2, H - 40);

  // Accent line at bottom
  const accent = ctx.createLinearGradient(0, H - 4, W, H - 4);
  accent.addColorStop(0, '#6366F1');
  accent.addColorStop(0.5, '#A855F7');
  accent.addColorStop(1, '#14B8A6');
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 4, W, 4);

  return canvas;
}

// roundedRect() loaded from charts.js (shared canvas helper)

function wrapText(ctx, text, maxWidth, maxLines) {
  var words = text.split(' ');
  var lines = [];
  var line = '';
  for (var i = 0; i < words.length; i++) {
    var test = line + (line ? ' ' : '') + words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      if (lines.length >= maxLines) {
        lines[lines.length - 1] += '...';
        return lines;
      }
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function openShareModal() {
  var canvas = generateShareImage();
  var preview = document.getElementById('sharePreview');
  preview.innerHTML = '';
  preview.appendChild(canvas);
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '8px';
  document.getElementById('shareOverlay').style.display = 'flex';
}

function closeShareModal() {
  document.getElementById('shareOverlay').style.display = 'none';
}

function downloadShareCard() {
  var canvas = document.querySelector('#sharePreview canvas');
  if (!canvas) return;
  canvas.toBlob(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'claude-spend-stats.png';
    a.click();
    URL.revokeObjectURL(url);
  });
}
