// sessions.js
// Sessions table rendering, pagination, sort, and search.
// Depends on globals: DATA, getFilteredData, fmt, formatDate, escapeHtml,
// modelClass, modelLabel, projectShort, openDrilldown,
// currentSort, currentPage, PAGE_SIZE, searchQuery

function renderSessions() {
  let sessions = [...getFilteredData().sessions];
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    sessions = sessions.filter(s =>
      s.firstPrompt.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      projectShort(s.project).toLowerCase().includes(q)
    );
  }

  const sortFns = {
    date: (a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''),
    prompt: (a, b) => a.firstPrompt.localeCompare(b.firstPrompt),
    model: (a, b) => a.model.localeCompare(b.model),
    queries: (a, b) => a.queryCount - b.queryCount,
    total: (a, b) => a.totalTokens - b.totalTokens,
    input: (a, b) => a.inputTokens - b.inputTokens,
    output: (a, b) => a.outputTokens - b.outputTokens,
  };
  const fn = sortFns[currentSort.key] || sortFns.total;
  sessions.sort((a, b) => currentSort.dir === 'desc' ? fn(b, a) : fn(a, b));

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const paged = sessions.slice(start, start + PAGE_SIZE);

  document.getElementById('sessionCount').textContent =
    sessions.length <= PAGE_SIZE
      ? `${sessions.length} sessions`
      : `${start + 1}\u2013${Math.min(start + PAGE_SIZE, sessions.length)} of ${sessions.length} sessions`;

  const tbody = document.getElementById('sessionsBody');
  tbody.textContent = '';
  for (const s of paged) {
    const tr = document.createElement('tr');
    tr.addEventListener('click', () => openDrilldown(s.sessionId));

    const tdDate = document.createElement('td');
    tdDate.className = 'date-cell';
    tdDate.textContent = formatDate(s.date);
    const projSpan = document.createElement('span');
    projSpan.className = 'project-tag';
    projSpan.title = projectShort(s.project);
    projSpan.textContent = projectShort(s.project);
    tdDate.appendChild(projSpan);
    tr.appendChild(tdDate);

    const tdPrompt = document.createElement('td');
    const promptDiv = document.createElement('div');
    promptDiv.className = 'prompt-preview';
    promptDiv.title = s.firstPrompt;
    promptDiv.textContent = s.firstPrompt;
    tdPrompt.appendChild(promptDiv);
    tr.appendChild(tdPrompt);

    const tdModel = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'model-badge ' + modelClass(s.model);
    badge.title = s.model;
    const dot = document.createElement('span');
    dot.className = 'model-dot';
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(modelLabel(s.model)));
    tdModel.appendChild(badge);
    tr.appendChild(tdModel);

    const addNumCell = (val, bold) => {
      const td = document.createElement('td');
      td.className = 'token-num';
      if (bold) td.style.fontWeight = '700';
      td.textContent = typeof val === 'number' ? fmt(val) : val;
      tr.appendChild(td);
    };
    addNumCell(s.queryCount, false);
    addNumCell(s.totalTokens, true);
    addNumCell(s.inputTokens, false);
    addNumCell(s.outputTokens, false);

    tbody.appendChild(tr);
  }

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  let el = document.getElementById('sessionsPagination');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sessionsPagination';
    el.className = 'sessions-pagination';
    document.getElementById('sessionsBody').closest('.sessions-card').after(el);
  }
  el.textContent = '';
  if (totalPages <= 1) return;

  const pages = [];
  const addPage = (n) => { if (!pages.includes(n)) pages.push(n); };
  addPage(1);
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) addPage(i);
  addPage(totalPages);
  pages.sort((a, b) => a - b);

  const makeBtn = (text, page, disabled, active) => {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener('click', () => goPage(page));
    el.appendChild(btn);
  };

  makeBtn('\u2039', currentPage - 1, currentPage === 1, false);
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) {
      const dots = document.createElement('span');
      dots.className = 'page-ellipsis';
      dots.textContent = '\u2026';
      el.appendChild(dots);
    }
    makeBtn(String(p), p, false, p === currentPage);
    prev = p;
  }
  makeBtn('\u203A', currentPage + 1, currentPage === totalPages, false);
}

function goPage(n) {
  currentPage = n;
  renderSessions();
  document.querySelector('.sessions-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initSessionsListeners() {
  // Sort
  document.querySelectorAll('.sessions-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) { currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc'; }
      else { currentSort = { key, dir: 'desc' }; }
      document.querySelectorAll('.sessions-table th').forEach(t => t.classList.remove('sorted'));
      th.classList.add('sorted');
      renderSessions();
    });
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderSessions();
  });
}
