// ----------------------
// NAVIGATION
// ----------------------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');

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
  const btnExp = document.getElementById('btn-expense');
  const btnInc = document.getElementById('btn-income');
  btnExp.className = 'type-btn' + (type === 'expense' ? ' active-expense' : '');
  btnInc.className = 'type-btn' + (type === 'income'  ? ' active-income'  : '');
  renderCatGrid();
}

// ----------------------
// FORMULAIRE — CATÉGORIE DÉPENSE
// ----------------------
function selectCat(id, btn) {
  state.selectedCat = id;
  document.querySelectorAll('#cat-grid .cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ----------------------
// FORMULAIRE — CATÉGORIE REVENU
// ----------------------
function selectIncCat(id, btn) {
  state.selectedIncCat = id;
  document.querySelectorAll('#cat-grid .cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ----------------------
// AJOUTER / MODIFIER UNE TRANSACTION
// ----------------------
function addTransaction() {
  const amount = parseFloat(document.getElementById('input-amount').value);
  const desc   = document.getElementById('input-desc').value.trim();
  const date   = document.getElementById('input-date').value;

  if (!amount || amount <= 0) { showToast('Entrez un montant valide'); return; }
  if (!date)                  { showToast('Choisissez une date');      return; }

  const category = state.currentType === 'income'
    ? state.selectedIncCat
    : state.selectedCat;

  if (state.editingId !== null) {
    // Mode édition
    const idx = state.transactions.findIndex(t => t.id === state.editingId);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], type: state.currentType, amount, desc, category, date };
    }
    state.editingId = null;
    saveData();
    showToast('✓ Transaction modifiée');
  } else {
    // Mode ajout
    const tx = { id: Date.now(), type: state.currentType, amount, desc, category, date };
    state.transactions.unshift(tx);
    saveData();
    showToast(state.currentType === 'expense' ? '✓ Dépense ajoutée' : '✓ Revenu ajouté');
  }
  showPage('home');
}

// ----------------------
// ÉDITER UNE TRANSACTION
// ----------------------
function editTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  state.editingId = id;
  showPage('add');
  // Pré-remplir le formulaire après render
  setTimeout(() => {
    setType(tx.type);
    document.getElementById('input-amount').value = tx.amount;
    document.getElementById('input-desc').value   = tx.desc || '';
    document.getElementById('input-date').value   = tx.date;
    if (tx.type === 'income') {
      state.selectedIncCat = tx.category;
    } else {
      state.selectedCat = tx.category;
    }
    renderCatGrid();
    // Marquer la catégorie sélectionnée
    document.querySelectorAll('#cat-grid .cat-btn').forEach(b => {
      if (b.dataset.catId === tx.category) b.classList.add('selected');
    });
    // Changer le bouton submit
    document.querySelector('.submit-btn').textContent = 'Modifier';
    // Ajouter bouton annuler si absent
    if (!document.getElementById('cancel-edit-btn')) {
      const btn = document.createElement('button');
      btn.id        = 'cancel-edit-btn';
      btn.className = 'cancel-btn';
      btn.textContent = 'Annuler';
      btn.onclick   = cancelEdit;
      document.querySelector('.submit-btn').insertAdjacentElement('afterend', btn);
    }
  }, 50);
}

function cancelEdit() {
  state.editingId = null;
  const btn = document.getElementById('cancel-edit-btn');
  if (btn) btn.remove();
  showPage('home');
}

// ----------------------
// SUPPRIMER UNE TRANSACTION
// ----------------------
function deleteTransaction(id) {
  if (!confirm('Supprimer cette transaction ?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveData();
  showToast('Transaction supprimée');
  renderStats();
}

// ----------------------
// RÉGLAGES — BUDGETS
// ----------------------
function saveBudgets() {
  CATEGORIES.forEach(c => {
    const el = document.getElementById('budget-' + c.id);
    if (el) state.budgets[c.id] = parseFloat(el.value) || 0;
  });
  const gbEl = document.getElementById('budget-global');
  if (gbEl) state.globalBudget = parseFloat(gbEl.value) || 0;
  saveData();
  showToast('✓ Budgets enregistrés');
}

// ----------------------
// RÉGLAGES — DEVISE
// ----------------------
function saveCurrency() {
  const el = document.getElementById('currency-select');
  if (el) state.currency = el.value;
  saveData();
  showToast('✓ Devise enregistrée');
  renderHome();
}

// ----------------------
// RÉGLAGES — CATÉGORIES DÉPENSES
// ----------------------
function addCategory() {
  const emoji = document.getElementById('new-cat-emoji').value.trim() || '🏷️';
  const label = document.getElementById('new-cat-label').value.trim();
  if (!label) { showToast('Entrez un nom'); return; }
  const id    = 'cat_' + Date.now();
  const color = PALETTE[CATEGORIES.length % PALETTE.length];
  CATEGORIES.push({ id, label, emoji, color });
  state.budgets[id] = 0;
  document.getElementById('new-cat-emoji').value = '';
  document.getElementById('new-cat-label').value = '';
  saveData();
  renderSettings();
}

function deleteCategory(id) {
  if (DEFAULT_CATEGORIES.find(c => c.id === id)) { showToast('Catégorie par défaut non supprimable'); return; }
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return;
  if (!confirm(`Supprimer "${cat.label}" ?`)) return;
  CATEGORIES = CATEGORIES.filter(c => c.id !== id);
  delete state.budgets[id];
  saveData();
  showToast(`"${cat.label}" supprimée`);
  renderSettings();
}

// ----------------------
// FILTRES STATS
// ----------------------
function applyFilters() {
  state.filterText = (document.getElementById('filter-search')?.value || '').toLowerCase();
  state.filterType = document.getElementById('filter-type')?.value || 'all';
  state.filterCat  = document.getElementById('filter-cat')?.value  || 'all';
  renderStats();
}

function clearFilters() {
  state.filterText = '';
  state.filterType = 'all';
  state.filterCat  = 'all';
  const s = document.getElementById('filter-search');
  const t = document.getElementById('filter-type');
  const c = document.getElementById('filter-cat');
  if (s) s.value = '';
  if (t) t.value = 'all';
  if (c) c.value = 'all';
  renderStats();
}

function getFilteredTx(txs) {
  return txs.filter(t => {
    const matchText = !state.filterText || (t.desc || '').toLowerCase().includes(state.filterText);
    const matchType = state.filterType === 'all' || t.type === state.filterType;
    const matchCat  = state.filterCat  === 'all' || t.category === state.filterCat;
    return matchText && matchType && matchCat;
  });
}

// ----------------------
// NAVIGATION MOIS STATS
// ----------------------
function changeStatsMonth(dir) {
  state.statsMonth += dir;
  if (state.statsMonth < 0)  { state.statsMonth = 11; state.statsYear--; }
  if (state.statsMonth > 11) { state.statsMonth = 0;  state.statsYear++; }
  renderStats();
}

// ----------------------
// SERVICE WORKER (PWA)
// ----------------------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const swCode = `
const CACHE = 'budget-v2';
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
  navigator.serviceWorker.register(URL.createObjectURL(blob)).catch(() => {});
}

// ----------------------
// INITIALISATION
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderHome();
  registerServiceWorker();
});
