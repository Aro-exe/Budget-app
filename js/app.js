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

  btnExp.className = 'type-btn' + (state.currentType === 'expense' ? ' active-expense' : '');
  btnInc.className = 'type-btn' + (state.currentType === 'income'  ? ' active-income'  : '');

  // Masquer les catégories pour les revenus
  catSection.style.display = state.currentType === 'expense' ? '' : 'none';
}

// ----------------------
// FORMULAIRE — CATÉGORIE
// ----------------------
function selectCat(id, btn) {
  state.selectedCat = id;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ----------------------
// AJOUTER UNE TRANSACTION
// ----------------------
function addTransaction() {
  const amount = parseFloat(document.getElementById('input-amount').value);
  const desc   = document.getElementById('input-desc').value.trim();
  const date   = document.getElementById('input-date').value;

  if (!amount || amount <= 0) { showToast('Entrez un montant valide'); return; }
  if (!date)                  { showToast('Choisissez une date');      return; }

  const tx = {
    id:       Date.now(),
    type:     state.currentType,
    amount,
    desc,
    category: state.currentType === 'income' ? 'other' : state.selectedCat,
    date,
  };

  state.transactions.unshift(tx);
  saveData();
  showToast(state.currentType === 'expense' ? '✓ Dépense ajoutée' : '✓ Revenu ajouté');
  showPage('home');
}

// ----------------------
// RÉGLAGES — BUDGETS
// ----------------------
function saveBudgets() {
  CATEGORIES.forEach(c => {
    const val = parseFloat(document.getElementById('budget-' + c.id).value) || 0;
    state.budgets[c.id] = val;
  });
  saveData();
  showToast('✓ Budgets enregistrés');
}

// ----------------------
// GESTION DES CATÉGORIES
// ----------------------
function addCategory() {
  const emoji = document.getElementById('new-cat-emoji').value.trim();
  const label = document.getElementById('new-cat-label').value.trim();

  if (!emoji) { showToast('Ajoute un emoji'); return; }
  if (!label) { showToast('Ajoute un nom');   return; }
  if (label.length > 14) { showToast('Nom trop long (14 car. max)'); return; }

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

  // Réaffecter les transactions à "other"
  state.transactions.forEach(t => { if (t.category === id) t.category = 'other'; });
  CATEGORIES = CATEGORIES.filter(c => c.id !== id);
  delete state.budgets[id];

  saveData();
  showToast(`"${cat.label}" supprimée`);
  renderSettings();
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
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).catch(() => {});
}

// ----------------------
// INITIALISATION
// ----------------------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderHome();
  registerServiceWorker();
});
