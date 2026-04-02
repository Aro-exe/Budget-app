// ----------------------
// PAGE ACCUEIL
// ----------------------
function renderHome() {
  const now  = new Date();
  const txs  = getCurrentMonthTx();
  const inc  = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const exp  = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const bal  = inc - exp;

  // Header
  document.getElementById('header-balance').innerHTML = `<span>${getCurrencySymbol()}</span>${Math.abs(bal).toLocaleString('fr-FR')}`;
  document.getElementById('header-balance').style.color = bal >= 0 ? 'var(--gold2)' : 'var(--red)';
  document.getElementById('header-month').textContent =
    now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('total-income').textContent  = fmt(inc);
  document.getElementById('total-expense').textContent = fmt(exp);

  renderBudgetOverview(txs, exp);
  renderGlobalBudget(exp);
  renderTop5(txs);
  renderRecentTransactions();
}

function getCurrencySymbol() {
  const symbols = { EUR: '€', USD: '$', CAD: 'CA$', GBP: '£', CHF: 'CHF' };
  return symbols[state.currency] || '€';
}

function renderGlobalBudget(exp) {
  let el = document.getElementById('global-budget-card');
  if (state.globalBudget <= 0) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id        = 'global-budget-card';
    el.className = 'card';
    // Insérer avant la card "Budgets ce mois"
    const budgetCard = document.querySelector('#page-home .card');
    budgetCard.parentNode.insertBefore(el, budgetCard);
  }
  const pct      = Math.min(100, Math.round((exp / state.globalBudget) * 100));
  const over     = exp > state.globalBudget;
  const barColor = over ? 'var(--red)' : pct > 80 ? '#e8a84c' : 'var(--gold)';
  const reste    = state.globalBudget - exp;
  el.innerHTML   = `
    <div class="card-title">Budget global du mois</div>
    <div class="budget-row" style="margin-bottom:10px;">
      <div style="font-size:14px;font-weight:500;">${fmt(exp)} dépensés</div>
      <div style="font-size:12px;color:var(--text3);">sur ${fmt(state.globalBudget)}</div>
    </div>
    <div class="bar-track">
      <div class="bar-fill" style="width:${pct}%;background:${barColor}"></div>
    </div>
    <div style="font-size:12px;margin-top:8px;color:${over ? 'var(--red)' : 'var(--text2)'};">
      ${over ? `⚠ Dépassement de ${fmt(-reste)}` : `${fmt(reste)} restants`}
    </div>`;
}

function renderTop5(txs) {
  let el = document.getElementById('top5-card');
  const expenses = txs.filter(t => t.type === 'expense').sort((a,b) => b.amount - a.amount).slice(0,5);
  if (expenses.length === 0) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id        = 'top5-card';
    el.className = 'card';
    document.querySelector('#page-home [style*="padding"]').appendChild(el);
  }
  el.innerHTML = `
    <div class="card-title">Top 5 dépenses du mois</div>
    ${expenses.map((t, i) => {
      const cat   = getCat(t.category);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--border);">
          <div style="font-size:16px;width:24px;text-align:center;">${medal}</div>
          <div style="font-size:18px;">${cat.emoji}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.desc || cat.label}</div>
            <div style="font-size:11px;color:var(--text3);">${formatDate(t.date)}</div>
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--red);">${fmt(t.amount)}</div>
        </div>`;
    }).join('')}`;
}

function renderBudgetOverview(txs, totalExp) {
  const el = document.getElementById('budget-overview');
  if (!el) return;
  const expBycat = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    expBycat[t.category] = (expBycat[t.category] || 0) + t.amount;
  });
  const catsWithBudget = CATEGORIES.filter(c => state.budgets[c.id] > 0);
  if (catsWithBudget.length === 0) {
    el.innerHTML = `<div style="font-size:13px;color:var(--text3);padding:8px 0;">Aucun budget défini. Configure-les dans Réglages.</div>`;
    return;
  }
  el.innerHTML = catsWithBudget.map(c => {
    const spent  = expBycat[c.id] || 0;
    const budget = state.budgets[c.id];
    const pct    = Math.min(100, Math.round((spent / budget) * 100));
    const over   = spent > budget;
    const barColor = over ? 'var(--red)' : pct > 80 ? '#e8a84c' : 'var(--gold)';
    return `
      <div class="budget-item">
        <div class="budget-row">
          <div class="budget-name"><span class="budget-emoji">${c.emoji}</span>${c.label}</div>
          <div class="budget-amounts"><strong>${fmt(spent)}</strong> / ${fmt(budget)}</div>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </div>`;
  }).join('');
}

function renderRecentTransactions() {
  const el     = document.getElementById('recent-tx');
  const recent = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
  el.innerHTML = recent.length === 0
    ? `<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">Aucune transaction pour l'instant</div></div>`
    : recent.map(t => txHTML(t, false)).join('');
}

// ----------------------
// PAGE STATS
// ----------------------
function renderStats() {
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  document.getElementById('stats-month-name').textContent = `${months[state.statsMonth]} ${state.statsYear}`;

  const monthTxs    = getMonthTx(state.statsMonth, state.statsYear);
  const filteredTxs = getFilteredTx(monthTxs);

  const inc = filteredTxs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const exp = filteredTxs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);

  document.getElementById('stats-income').textContent  = fmt(inc);
  document.getElementById('stats-expense').textContent = fmt(exp);

  renderDonut(filteredTxs);
  renderFilterBar();
  renderAllTransactions(filteredTxs);
}

function renderFilterBar() {
  const el = document.getElementById('filter-bar');
  if (!el) return;
  const allCats = [...CATEGORIES, ...INCOME_CATEGORIES];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;padding:0 20px 12px;">
      <input type="search" id="filter-search" class="form-input" placeholder="🔍 Rechercher..." value="${state.filterText}" oninput="applyFilters()">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <select id="filter-type" class="form-input" onchange="applyFilters()">
          <option value="all" ${state.filterType==='all'?'selected':''}>Tous types</option>
          <option value="expense" ${state.filterType==='expense'?'selected':''}>Dépenses</option>
          <option value="income"  ${state.filterType==='income'?'selected':''}>Revenus</option>
        </select>
        <select id="filter-cat" class="form-input" onchange="applyFilters()">
          <option value="all">Toutes catégories</option>
          ${allCats.map(c => `<option value="${c.id}" ${state.filterCat===c.id?'selected':''}>${c.emoji} ${c.label}</option>`).join('')}
        </select>
      </div>
      ${(state.filterText || state.filterType !== 'all' || state.filterCat !== 'all')
        ? `<button onclick="clearFilters()" style="background:var(--bg3);border:0.5px solid var(--border);color:var(--text2);border-radius:var(--r);padding:8px;font-size:13px;cursor:pointer;">✕ Effacer les filtres</button>`
        : ''}
    </div>`;
}

let donutChart = null;
function renderDonut(txs) {
  const expenses = txs.filter(t => t.type === 'expense');
  const bycat    = {};
  expenses.forEach(t => { bycat[t.category] = (bycat[t.category] || 0) + t.amount; });

  const labels = [], data = [], colors = [];
  Object.entries(bycat).forEach(([id, amt]) => {
    const cat = getCat(id);
    labels.push(cat.label);
    data.push(amt);
    colors.push(cat.color);
  });

  if (donutChart) { donutChart.destroy(); donutChart = null; }
  const canvas = document.getElementById('donut-chart');
  if (!canvas) return;

  if (data.length === 0) {
    canvas.parentElement.innerHTML = `<div style="text-align:center;color:var(--text3);padding:40px 0;font-size:14px;">Aucune dépense ce mois</div>`;
    return;
  }

  const ctx = canvas.getContext('2d');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#a09990', font: { family: 'DM Sans', size: 12 }, padding: 16, boxWidth: 10, boxHeight: 10, borderRadius: 3 }
        },
        tooltip: { callbacks: { label: ctx => ` ${fmtDec(ctx.parsed)}` } }
      }
    }
  });
}

function renderAllTransactions(txs) {
  const el     = document.getElementById('all-tx');
  const sorted = [...txs].sort((a,b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = sorted.length === 0
    ? '<div class="empty"><div class="empty-text">Aucune transaction</div></div>'
    : sorted.map(t => txHTML(t, true)).join('');
}

// ----------------------
// PAGE AJOUTER
// ----------------------
function renderAddForm() {
  // Reset état édition si on arrive via nav directe
  if (state.editingId === null) {
    document.getElementById('input-date').value   = new Date().toISOString().split('T')[0];
    document.getElementById('input-amount').value = '';
    document.getElementById('input-desc').value   = '';
    document.querySelector('.submit-btn').textContent = 'Enregistrer';
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.remove();
  }
  setType(state.currentType);
  renderCatGrid();
}

function renderCatGrid() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  const cats = state.currentType === 'income' ? INCOME_CATEGORIES : CATEGORIES;
  const selected = state.currentType === 'income' ? state.selectedIncCat : state.selectedCat;
  const fn = state.currentType === 'income' ? 'selectIncCat' : 'selectCat';

  grid.innerHTML = cats.map(c => `
    <button class="cat-btn ${c.id === selected ? 'selected' : ''}"
      data-cat-id="${c.id}"
      onclick="${fn}('${c.id}', this)">
      <span>${c.emoji}</span>
      <span>${c.label}</span>
    </button>`).join('');
}

// ----------------------
// PAGE RÉGLAGES
// ----------------------
function renderSettings() {
  // Budgets par catégorie
  const bEl = document.getElementById('budget-settings');
  if (bEl) {
    bEl.innerHTML = CATEGORIES.map(c => `
      <div class="budget-setting-row">
        <label class="budget-setting-label">
          <span>${c.emoji}</span> ${c.label}
        </label>
        <input type="number" id="budget-${c.id}" class="budget-input"
          placeholder="0" min="0" value="${state.budgets[c.id] || ''}">
      </div>`).join('');
  }

  // Budget global
  const gbEl = document.getElementById('global-budget-input');
  if (gbEl) gbEl.value = state.globalBudget || '';

  // Devise
  const currEl = document.getElementById('currency-select');
  if (currEl) currEl.value = state.currency || 'EUR';

  // Catégories dépenses
  const catEl = document.getElementById('cat-list');
  if (catEl) {
    catEl.innerHTML = CATEGORIES.map(c => `
      <div class="cat-manage-item">
        <span class="cat-manage-emoji">${c.emoji}</span>
        <span class="cat-manage-label">${c.label}</span>
        ${!DEFAULT_CATEGORIES.find(d => d.id === c.id)
          ? `<button class="cat-delete-btn" onclick="deleteCategory('${c.id}')">✕</button>`
          : ''}
      </div>`).join('');
  }
}

// ----------------------
// COMPOSANT TRANSACTION
// ----------------------
function txHTML(t, withActions) {
  const cat = getCat(t.category);
  const sign = t.type === 'expense' ? '-' : '+';
  return `
    <div class="tx-item" id="tx-${t.id}">
      <div class="tx-inner">
        <div class="tx-icon" style="background:${cat.color}22;">
          <span>${cat.emoji}</span>
        </div>
        <div class="tx-info">
          <div class="tx-name">${t.desc || cat.label}</div>
          <div class="tx-cat">${cat.label}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${t.type}">${sign}${fmt(t.amount)}</div>
          <div class="tx-date">${formatDate(t.date)}</div>
        </div>
      </div>
      ${withActions ? `
        <div class="tx-actions">
          <button class="tx-edit-btn"   onclick="editTransaction(${t.id})">✎ Modifier</button>
          <button class="tx-delete-btn" onclick="deleteTransaction(${t.id})">✕ Supprimer</button>
        </div>` : ''}
    </div>`;
}

// ----------------------
// TOAST
// ----------------------
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
