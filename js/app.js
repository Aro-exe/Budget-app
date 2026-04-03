// =====================
// APP.JS
// Navigation, actions utilisateur, initialisation
// =====================

// ----------------------
// NAVIGATION
// ----------------------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');

  // Scroll en haut à chaque changement de page
  window.scrollTo(0, 0);

  if (name === 'home')     renderHome();
  if (name === 'stats')    renderStats();
  if (name === 'add')      renderAddForm();
  if (name === 'settings') renderSettings();
}

// ----------------------
// FORMULAIRE — TYPE
// ----------------------
function setType(type) {
  state.currentType = type;
  updateTypeUI();
}

function updateTypeUI() {
  const btnExp    = document.getElementById('btn-expense');
  const btnInc    = document.getElementById('btn-income');
  const catSection = document.getElementById('cat-section');
  const incomeCatSection = document.getElementById('income-cat-section');

  btnExp.className = 'type-btn' + (state.currentType === 'expense' ? ' active-expense' : '');
  btnInc.className = 'type-btn' + (state.currentType === 'income'  ? ' active-income'  : '');

  // Afficher les catégories appropriées selon le type
  catSection.style.display       = state.currentType === 'expense' ? '' : 'none';
  incomeCatSection.style.display = state.currentType === 'income'  ? '' : 'none';
}

// ----------------------
// FORMULAIRE — CATÉGORIE
// ----------------------
function selectCat(id, btn) {
  state.selectedCat = id;
  document.querySelectorAll('#cat-grid .cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function selectIncomeCat(id, btn) {
  state.selectedIncomeCat = id;
  document.querySelectorAll('#income-cat-grid .cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ----------------------
// AJOUTER / MODIFIER UNE TRANSACTION
// ----------------------
function addTransaction() {
  const amount = parseFloat(document.getElementById('input-amount').value);
  const desc   = document.getElementById('input-desc').value.trim();
  const date   = document.getElementById('input-date').value;
  const editId = document.getElementById('edit-tx-id').value;

  if (!amount || amount <= 0) { showToast('Entrez un montant valide'); return; }
  if (!date)                  { showToast('Choisissez une date');      return; }

  const category = state.currentType === 'income' ? state.selectedIncomeCat : state.selectedCat;

  if (editId) {
    // Mode édition
    const idx = state.transactions.findIndex(t => t.id === parseFloat(editId));
    if (idx === -1) { showToast('Transaction introuvable'); return; }

    pushUndo('Modification de transaction');
    state.transactions[idx] = {
      ...state.transactions[idx],
      type:     state.currentType,
      amount,
      desc,
      category,
      date,
    };
    saveData();
    showToast('✓ Transaction modifiée');
  } else {
    // Mode ajout
    pushUndo('Ajout de transaction');
    const tx = {
      id:       Date.now(),
      type:     state.currentType,
      amount,
      desc,
      category,
      date,
    };
    state.transactions.unshift(tx);
    saveData();
    showToast(state.currentType === 'expense' ? '✓ Dépense ajoutée' : '✓ Revenu ajouté');
  }

  showPage('home');
}

// ----------------------
// MODIFIER UNE TRANSACTION
// ----------------------
function editTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  showPage('add');

  // Remplir le formulaire
  document.getElementById('form-title').textContent  = 'Modifier';
  document.getElementById('form-sub').textContent    = 'Modifier cette transaction';
  document.getElementById('submit-btn').textContent   = 'Sauvegarder';
  document.getElementById('cancel-edit-btn').style.display = '';
  document.getElementById('edit-tx-id').value = tx.id;
  document.getElementById('input-amount').value = tx.amount;
  document.getElementById('input-desc').value   = tx.desc || '';
  document.getElementById('input-date').value   = tx.date;

  state.currentType = tx.type;
  updateTypeUI();

  if (tx.type === 'expense') {
    state.selectedCat = tx.category;
    renderExpenseCatGrid();
  } else {
    state.selectedIncomeCat = tx.category;
    renderIncomeCatGrid();
  }
}

function cancelEdit() {
  showPage('add');
}

// ----------------------
// SUPPRIMER UNE TRANSACTION
// ----------------------
function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  const cat = getCat(tx.category);
  if (!confirm(`Supprimer "${tx.desc || cat.label}" (${fmtDec(tx.amount)}) ?`)) return;

  pushUndo('Suppression de transaction');
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveData();
  showToast('✓ Transaction supprimée');

  // Rafraîchir la page courante
  const activePage = document.querySelector('.page.active');
  if (activePage) {
    const pageId = activePage.id.replace('page-', '');
    showPage(pageId);
  }
}

// ----------------------
// UNDO
// ----------------------
function undoAction() {
  const entry = popUndo();
  if (!entry) {
    showToast('Rien à annuler');
    return;
  }

  state.transactions = entry.snapshot.transactions;
  state.budgets      = entry.snapshot.budgets;
  state.globalBudget = entry.snapshot.globalBudget;
  state.recurringTx  = entry.snapshot.recurringTx;
  CATEGORIES         = entry.snapshot.categories;
  INCOME_CATEGORIES  = entry.snapshot.incomeCategories;

  saveData();
  hideUndoButton();
  showToast(`↩ "${entry.label}" annulé`);

  const activePage = document.querySelector('.page.active');
  if (activePage) {
    const pageId = activePage.id.replace('page-', '');
    showPage(pageId);
  }
}

// ----------------------
// SWIPE-TO-DELETE
// ----------------------
let swipeStartX = 0;
let swipeCurrentX = 0;
let swipeElement = null;

function swipeStart(e) {
  swipeElement = e.currentTarget;
  swipeStartX  = e.touches[0].clientX;
  swipeCurrentX = swipeStartX;
  swipeElement.style.transition = 'none';
}

function swipeMove(e) {
  if (!swipeElement) return;
  swipeCurrentX = e.touches[0].clientX;
  const diff = swipeCurrentX - swipeStartX;
  // Only allow left swipe
  if (diff < 0) {
    const clamped = Math.max(diff, -120);
    swipeElement.style.transform = `translateX(${clamped}px)`;
  }
}

function swipeEnd(e) {
  if (!swipeElement) return;
  swipeElement.style.transition = 'transform 0.25s ease';
  const diff = swipeCurrentX - swipeStartX;
  if (diff < -60) {
    // Reveal actions
    swipeElement.style.transform = 'translateX(-120px)';
  } else {
    swipeElement.style.transform = 'translateX(0)';
  }
  swipeElement = null;
}

// Close open swipes when tapping elsewhere
document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.tx-swipe-content') && !e.target.closest('.tx-actions-bg')) {
    document.querySelectorAll('.tx-swipe-content').forEach(el => {
      el.style.transition = 'transform 0.25s ease';
      el.style.transform = 'translateX(0)';
    });
  }
});

// ----------------------
// FILTRES STATS
// ----------------------
function applyFilters() {
  const txs = getMonthTx(state.statsMonth, state.statsYear);
  const filtered = getFilteredTransactions(txs);
  renderFilteredTransactions(filtered);
}

function clearFilters() {
  document.getElementById('filter-search').value    = '';
  document.getElementById('filter-type').value      = 'all';
  document.getElementById('filter-cat').value       = 'all';
  document.getElementById('filter-date-from').value = '';
  document.getElementById('filter-date-to').value   = '';
  applyFilters();
}

// ----------------------
// RÉGLAGES — BUDGETS
// ----------------------
function saveBudgets() {
  pushUndo('Modification des budgets');
  CATEGORIES.forEach(c => {
    const val = parseFloat(document.getElementById('budget-' + c.id).value) || 0;
    state.budgets[c.id] = val;
  });
  saveData();
  showToast('✓ Budgets enregistrés');
}

function saveGlobalBudget() {
  pushUndo('Modification du budget global');
  state.globalBudget = parseFloat(document.getElementById('global-budget-input').value) || 0;
  saveData();
  showToast('✓ Budget global enregistré');
}

// ----------------------
// GESTION DES CATÉGORIES (DÉPENSES)
// ----------------------
function addCategory() {
  const emoji = document.getElementById('new-cat-emoji').value.trim();
  const label = document.getElementById('new-cat-label').value.trim();

  if (!emoji) { showToast('Ajoute un emoji'); return; }
  if (!label) { showToast('Ajoute un nom');   return; }
  if (label.length > 14) { showToast('Nom trop long (14 car. max)'); return; }

  pushUndo('Ajout de catégorie');
  const id    = 'cat_' + Date.now();
  const color = PALETTE[CATEGORIES.length % PALETTE.length];

  CATEGORIES.push({ id, label, emoji, color });
  state.budgets[id] = 0;
  saveData();

  document.getElementById('new-cat-emoji').value = '';
  document.getElementById('new-cat-label').value = '';

  showToast(`✓ "${label}" ajoutée`);
  renderSettings();
}

function removeCategory(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return;

  const txCount = state.transactions.filter(t => t.category === id).length;
  const msg = txCount > 0
    ? `Supprimer "${cat.label}" ? Les ${txCount} transaction(s) associées passeront en "Autre".`
    : `Supprimer "${cat.label}" ?`;

  if (!confirm(msg)) return;

  pushUndo('Suppression de catégorie');
  state.transactions.forEach(t => { if (t.category === id) t.category = 'other'; });
  CATEGORIES = CATEGORIES.filter(c => c.id !== id);
  delete state.budgets[id];

  saveData();
  showToast(`"${cat.label}" supprimée`);
  renderSettings();
}

// ----------------------
// GESTION DES CATÉGORIES (REVENUS)
// ----------------------
function addIncomeCategory() {
  const emoji = document.getElementById('new-income-cat-emoji').value.trim();
  const label = document.getElementById('new-income-cat-label').value.trim();

  if (!emoji) { showToast('Ajoute un emoji'); return; }
  if (!label) { showToast('Ajoute un nom');   return; }
  if (label.length > 14) { showToast('Nom trop long (14 car. max)'); return; }

  pushUndo('Ajout de catégorie revenu');
  const id    = 'icat_' + Date.now();
  const color = PALETTE[INCOME_CATEGORIES.length % PALETTE.length];

  INCOME_CATEGORIES.push({ id, label, emoji, color });
  saveData();

  document.getElementById('new-income-cat-emoji').value = '';
  document.getElementById('new-income-cat-label').value = '';

  showToast(`✓ "${label}" ajoutée`);
  renderSettings();
}

function removeIncomeCategory(id) {
  const cat = INCOME_CATEGORIES.find(c => c.id === id);
  if (!cat) return;
  if (INCOME_CATEGORIES.length <= 1) { showToast('Il faut au moins une catégorie'); return; }

  const txCount = state.transactions.filter(t => t.category === id).length;
  const fallback = INCOME_CATEGORIES.find(c => c.id !== id);
  const msg = txCount > 0
    ? `Supprimer "${cat.label}" ? Les ${txCount} transaction(s) iront dans "${fallback.label}".`
    : `Supprimer "${cat.label}" ?`;

  if (!confirm(msg)) return;

  pushUndo('Suppression de catégorie revenu');
  state.transactions.forEach(t => { if (t.category === id) t.category = fallback.id; });
  INCOME_CATEGORIES = INCOME_CATEGORIES.filter(c => c.id !== id);

  saveData();
  showToast(`"${cat.label}" supprimée`);
  renderSettings();
}

// ----------------------
// TRANSACTIONS RÉCURRENTES
// ----------------------
function showAddRecurring() {
  document.getElementById('recurring-form').style.display = '';
  updateRecFormCats();
}

function hideRecurringForm() {
  document.getElementById('recurring-form').style.display = 'none';
}

function updateRecFormCats() {
  const type = document.getElementById('rec-type').value;
  const cats = type === 'expense' ? CATEGORIES : INCOME_CATEGORIES;
  document.getElementById('rec-cat').innerHTML = cats.map(c =>
    `<option value="${c.id}">${c.emoji} ${c.label}</option>`
  ).join('');
}

function saveRecurring() {
  const type   = document.getElementById('rec-type').value;
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const desc   = document.getElementById('rec-desc').value.trim();
  const cat    = document.getElementById('rec-cat').value;
  const day    = parseInt(document.getElementById('rec-day').value);

  if (!amount || amount <= 0) { showToast('Montant invalide');              return; }
  if (!day || day < 1 || day > 28) { showToast('Jour invalide (1-28)'); return; }

  pushUndo('Ajout de récurrence');
  state.recurringTx.push({
    id:         Date.now(),
    type,
    amount,
    desc,
    category:   cat,
    dayOfMonth: day,
    active:     true,
  });

  saveData();
  showToast('✓ Récurrence ajoutée');
  hideRecurringForm();

  // Reset form
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-desc').value   = '';
  document.getElementById('rec-day').value    = '';

  renderRecurringList();
}

function deleteRecurring(id) {
  if (!confirm('Supprimer cette récurrence ?')) return;
  pushUndo('Suppression de récurrence');
  state.recurringTx = state.recurringTx.filter(r => r.id !== id);
  saveData();
  showToast('✓ Récurrence supprimée');
  renderRecurringList();
}

function changeStatsMonth(dir) {
  state.statsMonth += dir;
  if (state.statsMonth < 0)  { state.statsMonth = 11; state.statsYear--; }
  if (state.statsMonth > 11) { state.statsMonth = 0;  state.statsYear++; }
  renderStats();
}

// ----------------------
// SERVICE WORKER (PWA offline)
// ----------------------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const swCode = `
const CACHE = 'budget-v3';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/data.js', '/js/render.js', '/js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});`;

  const blob  = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).catch(() => {});
}

// ----------------------
// INITIALISATION
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  processRecurringTransactions();
  renderHome();
  registerServiceWorker();
});
