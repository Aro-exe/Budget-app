// =====================
// RENDER.JS
// Toutes les fonctions d'affichage des pages
// =====================

let donutChart = null;

// ----------------------
// HTML d'une transaction
// ----------------------
function txHTML(t) {
  const cat  = getCat(t.category);
  const sign = t.type === 'expense' ? '-' : '+';
  const cls  = t.type === 'expense' ? 'expense' : 'income';
  return `
    <div class="tx-item">
      <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-name">${t.desc || cat.label}</div>
        <div class="tx-cat">${cat.label}</div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${cls}">${sign}${fmtDec(t.amount)}</div>
        <div class="tx-date">${formatDate(t.date)}</div>
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

  renderBudgetOverview(txs);
  renderRecentTransactions();
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

  renderDonutChart(expBycat);
  renderAllTransactions(txs);
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

function renderAllTransactions(txs) {
  const el     = document.getElementById('all-tx');
  const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = sorted.length === 0
    ? '<div class="empty"><div class="empty-text">Aucune transaction</div></div>'
    : sorted.map(txHTML).join('');
}

// ----------------------
// PAGE AJOUTER
// ----------------------
function renderAddForm() {
  document.getElementById('input-date').value   = new Date().toISOString().split('T')[0];
  document.getElementById('input-amount').value = '';
  document.getElementById('input-desc').value   = '';

  document.getElementById('cat-grid').innerHTML = CATEGORIES.map(c => `
    <button class="cat-btn ${c.id === state.selectedCat ? 'selected' : ''}"
            onclick="selectCat('${c.id}', this)">
      <span>${c.emoji}</span><span>${c.label}</span>
    </button>
  `).join('');

  updateTypeUI();
}

// ----------------------
// PAGE RÉGLAGES
// ----------------------
function renderSettings() {
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

  // Liste des catégories avec bouton supprimer
  document.getElementById('cat-list').innerHTML = CATEGORIES.map(c => `
    <div class="cat-manage-item">
      <span class="cat-manage-emoji">${c.emoji}</span>
      <span class="cat-manage-label">${c.label}</span>
      <button class="cat-delete-btn" onclick="removeCategory('${c.id}')" title="Supprimer">✕</button>
    </div>
  `).join('');
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
