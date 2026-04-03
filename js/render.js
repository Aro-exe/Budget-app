// =====================
// RENDER.JS
// Toutes les fonctions d'affichage des pages
// =====================

let donutChart = null;

// ----------------------
// HTML d'une transaction (simple, sans swipe)
// ----------------------
function txHTML(t) {
  const cat  = getCat(t.category);
  const sign = t.type === 'expense' ? '-' : '+';
  const cls  = t.type === 'expense' ? 'expense' : 'income';
  const recBadge = t.recurringId ? '<span class="tx-recurring-badge">REC</span>' : '';
  return `
    <div class="tx-item">
      <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-name">${t.desc || cat.label}${recBadge}</div>
        <div class="tx-cat">${cat.label}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${cls}">${sign}${fmtDec(t.amount)}</div>
        <div class="tx-date">${formatDate(t.date)}</div>
      </div>
    </div>`;
}

// ----------------------
// HTML d'une transaction avec swipe-to-delete et actions
// ----------------------
function txSwipeHTML(t) {
  const cat  = getCat(t.category);
  const sign = t.type === 'expense' ? '-' : '+';
  const cls  = t.type === 'expense' ? 'expense' : 'income';
  const recBadge = t.recurringId ? '<span class="tx-recurring-badge">REC</span>' : '';
  return `
    <div class="tx-swipe-wrapper" data-tx-id="${t.id}">
      <div class="tx-actions-bg">
        <button class="tx-action-btn tx-action-edit" onclick="editTransaction(${t.id})">✎</button>
        <button class="tx-action-btn tx-action-delete" onclick="deleteTransaction(${t.id})">✕</button>
      </div>
      <div class="tx-swipe-content" ontouchstart="swipeStart(event)" ontouchmove="swipeMove(event)" ontouchend="swipeEnd(event)">
        <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
        <div class="tx-info">
          <div class="tx-name">${t.desc || cat.label}${recBadge}</div>
          <div class="tx-cat">${cat.label}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${cls}">${sign}${fmtDec(t.amount)}</div>
          <div class="tx-date">${formatDate(t.date)}</div>
        </div>
      </div>
    </div>`;
}

// ----------------------
// PAGE ACCUEIL
// ----------------------
function renderHome() {
  const now      = new Date();
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('header-month').textContent = monthName;

  const txs = getCurrentMonthTx();
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  const balance = income - expense;

  document.getElementById('header-balance').innerHTML =
    `<span>€</span>${Math.round(balance).toLocaleString('fr-FR')}`;
  document.getElementById('total-income').textContent  = fmt(income);
  document.getElementById('total-expense').textContent = fmt(expense);

  renderGlobalBudget(expense);
  renderBudgetOverview(txs);
  renderTop5(txs);
  renderRecentTransactions();
}

// ----------------------
// BUDGET GLOBAL
// ----------------------
function renderGlobalBudget(totalExpense) {
  const card = document.getElementById('global-budget-card');
  const el   = document.getElementById('global-budget-overview');

  if (!state.globalBudget || state.globalBudget <= 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = '';
  const budget = state.globalBudget;
  const pct    = Math.min(100, Math.round((totalExpense / budget) * 100));
  const over   = totalExpense > budget;
  const barColor = over ? 'var(--red)' : pct > 80 ? '#e8a84c' : 'var(--gold)';
  const remaining = budget - totalExpense;

  el.innerHTML = `
    <div class="budget-item">
      <div class="budget-row">
        <div class="budget-name"><span class="budget-emoji">💰</span>Total dépenses</div>
        <div class="budget-amounts"><strong>${fmt(totalExpense)}</strong> / ${fmt(budget)}</div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div style="font-size:12px;color:${over ? 'var(--red)' : 'var(--text3)'};margin-top:6px;">
        ${over ? `Dépassement de ${fmt(totalExpense - budget)}` : `Reste ${fmt(remaining)}`}
      </div>
    </div>`;
}

function renderBudgetOverview(txs) {
  const expBycat = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    expBycat[t.category] = (expBycat[t.category] || 0) + t.amount;
  });

  const catsWithBudget = CATEGORIES.filter(c => state.budgets[c.id] > 0);
  const el = document.getElementById('budget-overview');

  if (catsWithBudget.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-text">Définissez vos budgets dans Réglages</div></div>`;
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

// ----------------------
// TOP 5 DÉPENSES DU MOIS
// ----------------------
function renderTop5(txs) {
  const el = document.getElementById('top5-expenses');
  const expenses = txs
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (expenses.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:20px 0;"><div class="empty-text">Aucune dépense ce mois</div></div>';
    return;
  }

  el.innerHTML = expenses.map((t, i) => {
    const cat = getCat(t.category);
    const rankClass = i < 3 ? ` rank-${i + 1}` : '';
    return `
      <div class="top-item">
        <div class="top-rank${rankClass}">${i + 1}</div>
        <div class="top-info">
          <div class="top-name">${t.desc || cat.label}</div>
          <div class="top-cat">${cat.emoji} ${cat.label} · ${formatDate(t.date)}</div>
        </div>
        <div class="top-amount">${fmtDec(t.amount)}</div>
      </div>`;
  }).join('');
}

function renderRecentTransactions() {
  const el     = document.getElementById('recent-tx');
  const recent = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recent.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🌱</div><div class="empty-text">Aucune transaction pour l'instant</div></div>`;
  } else {
    el.innerHTML = recent.map(txHTML).join('');
  }
}

// ----------------------
// PAGE STATS
// ----------------------
function renderStats() {
  const monthName = new Date(state.statsYear, state.statsMonth)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('stats-month-name').textContent =
    monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const txs      = getMonthTx(state.statsMonth, state.statsYear);
  const expenses = txs.filter(t => t.type === 'expense');

  const expBycat = {};
  expenses.forEach(t => {
    expBycat[t.category] = (expBycat[t.category] || 0) + t.amount;
  });

  // Populate filter categories dropdown
  populateFilterCategories();

  renderDonutChart(expBycat);
  renderAverageExpenses();
  applyFilters();
}

function renderDonutChart(expBycat) {
  const labels = [], data = [], colors = [];
  CATEGORIES.forEach(c => {
    if (expBycat[c.id]) {
      labels.push(c.emoji + ' ' + c.label);
      data.push(Math.round(expBycat[c.id] * 100) / 100);
      colors.push(c.color);
    }
  });

  if (donutChart) donutChart.destroy();

  const chartWrap = document.getElementById('donut-chart').parentElement;

  if (data.length === 0) {
    chartWrap.innerHTML = `<div class="empty" style="padding:24px 0"><div class="empty-icon">📊</div><div class="empty-text">Aucune dépense ce mois</div></div>`;
    return;
  }

  // Recréer le canvas s'il a été remplacé par le message vide
  if (!document.getElementById('donut-chart')) {
    chartWrap.innerHTML = '<canvas id="donut-chart"></canvas>';
  }

  const ctx = document.getElementById('donut-chart').getContext('2d');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#a09990',
            font: { family: 'DM Sans', size: 12 },
            padding: 16, boxWidth: 10, boxHeight: 10, borderRadius: 3
          }
        },
        tooltip: { callbacks: { label: ctx => ` ${fmtDec(ctx.parsed)}` } }
      }
    }
  });
}

// ----------------------
// MOYENNE DÉPENSES PAR CATÉGORIE
// ----------------------
function renderAverageExpenses() {
  const el = document.getElementById('avg-expenses');
  const monthCount = getActiveMonthCount();

  const totals = {};
  state.transactions.filter(t => t.type === 'expense').forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const entries = CATEGORIES
    .filter(c => totals[c.id] > 0)
    .map(c => ({ cat: c, avg: totals[c.id] / monthCount, total: totals[c.id] }))
    .sort((a, b) => b.avg - a.avg);

  if (entries.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:20px 0;"><div class="empty-text">Pas assez de données</div></div>';
    return;
  }

  el.innerHTML = entries.map(e => `
    <div class="avg-item">
      <div class="avg-emoji">${e.cat.emoji}</div>
      <div class="avg-info">
        <div class="avg-name">${e.cat.label}</div>
        <div class="avg-detail">Total : ${fmtDec(e.total)} sur ${monthCount} mois</div>
      </div>
      <div class="avg-amount">${fmtDec(e.avg)}/mois</div>
    </div>
  `).join('');
}

// ----------------------
// FILTRES ET RECHERCHE
// ----------------------
function populateFilterCategories() {
  const sel = document.getElementById('filter-cat');
  const currentVal = sel.value;
  const allCats = [...CATEGORIES, ...INCOME_CATEGORIES];
  sel.innerHTML = '<option value="all">Toutes catégories</option>' +
    allCats.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');
  sel.value = currentVal || 'all';
}

function getFilteredTransactions(txs) {
  const search   = (document.getElementById('filter-search').value || '').toLowerCase();
  const type     = document.getElementById('filter-type').value;
  const cat      = document.getElementById('filter-cat').value;
  const dateFrom = document.getElementById('filter-date-from').value;
  const dateTo   = document.getElementById('filter-date-to').value;

  return txs.filter(t => {
    if (search && !(t.desc || '').toLowerCase().includes(search)) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (cat !== 'all' && t.category !== cat) return false;
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });
}

function renderFilteredTransactions(txs) {
  const el     = document.getElementById('all-tx');
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = sorted.length === 0
    ? '<div class="empty"><div class="empty-text">Aucune transaction</div></div>'
    : sorted.map(t => txSwipeHTML(t)).join('');
}

// ----------------------
// PAGE AJOUTER
// ----------------------
function renderAddForm() {
  document.getElementById('input-date').value   = new Date().toISOString().split('T')[0];
  document.getElementById('input-amount').value = '';
  document.getElementById('input-desc').value   = '';
  document.getElementById('edit-tx-id').value   = '';
  document.getElementById('form-title').textContent = 'Ajouter';
  document.getElementById('form-sub').textContent   = 'Une dépense ou un revenu';
  document.getElementById('submit-btn').textContent  = 'Enregistrer';
  document.getElementById('cancel-edit-btn').style.display = 'none';

  renderExpenseCatGrid();
  renderIncomeCatGrid();
  updateTypeUI();
}

function renderExpenseCatGrid() {
  document.getElementById('cat-grid').innerHTML = CATEGORIES.map(c => `
    <button class="cat-btn ${c.id === state.selectedCat ? 'selected' : ''}"
            onclick="selectCat('${c.id}', this)">
      <span>${c.emoji}</span><span>${c.label}</span>
    </button>
  `).join('');
}

function renderIncomeCatGrid() {
  document.getElementById('income-cat-grid').innerHTML = INCOME_CATEGORIES.map(c => `
    <button class="cat-btn ${c.id === state.selectedIncomeCat ? 'selected' : ''}"
            onclick="selectIncomeCat('${c.id}', this)">
      <span>${c.emoji}</span><span>${c.label}</span>
    </button>
  `).join('');
}

// ----------------------
// PAGE RÉGLAGES
// ----------------------
function renderSettings() {
  // Budget global
  document.getElementById('global-budget-input').value = state.globalBudget || '';

  // Budgets par catégorie
  document.getElementById('budget-settings').innerHTML = CATEGORIES.map(c => `
    <div class="budget-edit">
      <div class="budget-edit-left">
        <span class="budget-edit-icon">${c.emoji}</span>
        <span class="budget-edit-name">${c.label}</span>
      </div>
      <input type="number" class="budget-edit-input" id="budget-${c.id}"
             placeholder="0" value="${state.budgets[c.id] || ''}" inputmode="numeric" min="0">
    </div>
  `).join('');

  // Liste des catégories de dépenses
  document.getElementById('cat-list').innerHTML = CATEGORIES.map(c => `
    <div class="cat-manage-item">
      <span class="cat-manage-emoji">${c.emoji}</span>
      <span class="cat-manage-label">${c.label}</span>
      <button class="cat-delete-btn" onclick="removeCategory('${c.id}')" title="Supprimer">✕</button>
    </div>
  `).join('');

  // Liste des catégories de revenus
  document.getElementById('income-cat-list').innerHTML = INCOME_CATEGORIES.map(c => `
    <div class="cat-manage-item">
      <span class="cat-manage-emoji">${c.emoji}</span>
      <span class="cat-manage-label">${c.label}</span>
      <button class="cat-delete-btn" onclick="removeIncomeCategory('${c.id}')" title="Supprimer">✕</button>
    </div>
  `).join('');

  // Transactions récurrentes
  renderRecurringList();
}

function renderRecurringList() {
  const el = document.getElementById('recurring-list');
  if (state.recurringTx.length === 0) {
    el.innerHTML = '<div class="empty" style="padding:16px 0;"><div class="empty-text">Aucune récurrence</div></div>';
    return;
  }

  el.innerHTML = state.recurringTx.map(rec => {
    const cat = getCat(rec.category);
    const cls = rec.type === 'expense' ? 'expense' : 'income';
    const sign = rec.type === 'expense' ? '-' : '+';
    return `
      <div class="rec-item">
        <div style="font-size:20px;">${cat.emoji}</div>
        <div class="rec-info">
          <div class="rec-name">${rec.desc || cat.label}</div>
          <div class="rec-detail">Le ${rec.dayOfMonth} de chaque mois · ${rec.active ? 'Actif' : 'Inactif'}</div>
        </div>
        <div class="rec-amount ${cls}">${sign}${fmtDec(rec.amount)}</div>
        <button class="cat-delete-btn" onclick="deleteRecurring(${rec.id})" title="Supprimer">✕</button>
      </div>`;
  }).join('');
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
