// projects.js
// Project breakdown table with accordion drawers.
// Depends on globals: DATA, getFilteredData, fmt, fmtCost, escapeHtml,
// modelClass, modelLabel, projectShort, projectFull, openDrilldown

function toggleProjectDrawer(i) {
  const row = document.getElementById('proj-row-' + i);
  const drawer = document.getElementById('proj-drawer-' + i);
  const isOpen = drawer.classList.contains('open');
  row.classList.toggle('expanded', !isOpen);
  drawer.classList.toggle('open', !isOpen);
}

function buildDrawerContent(p) {
  if (!p.topPrompts || p.topPrompts.length === 0) {
    return '<div class="drawer-empty">No prompt data available</div>';
  }
  const items = p.topPrompts.map((pr, i) => {
    const toolEntries = Object.entries(pr.toolCounts || {}).sort((a, b) => b[1] - a[1]);
    const chips = toolEntries.map(([name, count]) =>
      '<span class="tool-chip">' + count + '\u00d7\u00a0' + escapeHtml(name) + '</span>'
    ).join('') + (pr.continuations > 0 ? '<span class="tool-chip">+' + pr.continuations + ' turns</span>' : '');
    const badge = '<span class="model-badge ' + modelClass(pr.model) + '"><span class="model-dot"></span>' + modelLabel(pr.model) + '</span>';
    const tokVal = fmt(pr.totalTokens);
    const tokSub = fmt(pr.inputTokens) + ' / ' + fmt(pr.outputTokens);
    const promptText = escapeHtml(pr.prompt);
    const sid = pr.sessionId;
    return [
      '<div class="drawer-prompt-row" onclick="openDrilldown(\'' + sid + '\')">',
      '<div class="drawer-rank">' + (i + 1) + '</div>',
      '<div>',
      '<div class="drawer-prompt-text">' + promptText + '</div>',
      '<div class="drawer-prompt-meta">' + badge + chips + '</div>',
      '</div>',
      '<div class="drawer-tokens"><div class="value">' + tokVal + '</div><div class="sub">' + tokSub + '</div></div>',
      '</div>',
    ].join('');
  });
  return '<div class="drawer-prompt-list">' + items.join('') + '</div>';
}

// Project breakdown
function renderProjectBreakdown() {
  const projects = getFilteredData().projectBreakdown;
  if (!projects || !projects.length) return;

  const countEl = document.getElementById('projectsCount');
  countEl.textContent = projects.length + ' project' + (projects.length === 1 ? '' : 's');

  const maxTokens = projects[0].totalTokens;
  const chevron = '<svg class="proj-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6l4 4-4 4"/></svg>';
  const rows = [];
  projects.forEach((p, i) => {
    const barPct = (p.totalTokens / maxTokens * 100).toFixed(1);
    const ariaLabel = p.modelBreakdown.map(m => modelLabel(m.model) + ': ' + fmt(m.inputTokens) + ' input, ' + fmt(m.outputTokens) + ' output, ' + (m.userPromptCount || 0) + ' prompts').join(', ');
    const gridItems = p.modelBreakdown.map(m =>
      '<span class="model-grid-name ' + modelClass(m.model) + '" style="background:none;padding:0;border-radius:0">' +
        '<span class="model-dot" aria-hidden="true"></span>' + modelLabel(m.model) +
      '</span>' +
      '<span class="model-grid-val">' + fmtCost(m.costWithCache) + '</span>' +
      '<span class="model-grid-val"><span class="sr-only">in </span>' + fmt(m.inputTokens) + ' <span aria-hidden="true">\u2193</span></span>' +
      '<span class="model-grid-val"><span class="sr-only">out </span>' + fmt(m.outputTokens) + ' <span aria-hidden="true">\u2191</span></span>' +
      '<span class="model-grid-prompts">' + (m.userPromptCount || 0) + ' prompts</span>'
    ).join('');
    const summaryRow = [
      '<tr class="proj-row" id="proj-row-' + i + '" onclick="toggleProjectDrawer(' + i + ')">',
      '<td style="padding:10px 16px">',
      '<div style="display:flex;align-items:center;gap:6px">',
      chevron,
      '<div>',
      '<div class="proj-name" title="' + projectFull(p.project) + '">' + escapeHtml(projectShort(p.project)) + '</div>',
      '<div class="model-grid" aria-label="Models used: ' + ariaLabel + '">' + gridItems + '</div>',
      '</div></div></td>',
      '<td class="token-num" style="font-weight:700;vertical-align:top;padding-top:12px">' +
      '<div>' + fmtCost(p.costWithCache) + '</div>' +
      '<div style="font-size:11px;font-weight:500;color:var(--text-tertiary);margin-top:1px">' + fmtCost(p.costWithoutCache) + ' w/o cache</div>' +
      '</td>',
      '<td class="token-num" style="font-weight:700;vertical-align:top;padding-top:12px">',
      '<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end">',
      '<div style="flex:1;max-width:60px;height:3px;background:var(--bg);border-radius:4px;overflow:hidden">',
      '<div style="width:' + barPct + '%;height:100%;background:var(--indigo);border-radius:4px"></div>',
      '</div><div><div>' + fmt(p.totalTokens) + '</div><div style="font-size:11px;font-weight:500;color:var(--text-tertiary);margin-top:1px">' + fmt(p.inputTokens) + ' in\u00a0\u00b7\u00a0' + fmt(p.outputTokens) + ' out</div></div></div></td>',
      '<td class="token-num" style="vertical-align:top;padding-top:12px">' + p.sessionCount + '</td>',
      '<td class="token-num" style="vertical-align:top;padding-top:12px">' + p.queryCount + '</td>',
      '<td class="token-num" style="vertical-align:top;padding-top:12px">' + p.userPromptCount + '</td>',
      '</tr>',
    ].join('');
    const drawerRow = [
      '<tr class="proj-drawer" id="proj-drawer-' + i + '">',
      '<td colspan="6"><div class="proj-drawer-inner"><div class="proj-drawer-content">',
      buildDrawerContent(p),
      '</div></div></td></tr>',
    ].join('');
    rows.push(summaryRow, drawerRow);
  });
  document.getElementById('projectsBody').innerHTML = rows.join('');
}
