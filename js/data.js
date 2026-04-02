// =====================
// CATÉGORIES
// Ajoute, modifie ou supprime des catégories ici
// =====================
const CATEGORIES = [
  { id: 'food',      label: 'Alimentation', emoji: '🛒', color: '#e8c97a' },
  { id: 'transport', label: 'Transport',    emoji: '🚇', color: '#7ac4e8' },
  { id: 'housing',   label: 'Logement',    emoji: '🏠', color: '#a87ae8' },
  { id: 'health',    label: 'Santé',        emoji: '💊', color: '#e87a9f' },
  { id: 'leisure',   label: 'Loisirs',     emoji: '🎬', color: '#7ae8b4' },
  { id: 'clothing',  label: 'Vêtements',   emoji: '👗', color: '#e8a87a' },
  { id: 'tech',      label: 'Tech',         emoji: '💻', color: '#7a9fe8' },
  { id: 'other',     label: 'Autre',        emoji: '📦', color: '#a0a0a0' },
];

// =====================
// STATE (données en mémoire)
// =====================
const state = {
  transactions: [],
  budgets:      {},
  currentType:  'expense',
  selectedCat:  'food',
  statsMonth:   new Date().getMonth(),
  statsYear:    new Date().getFullYear(),
};

// =====================
// PERSISTANCE LOCALSTORAGE
// =====================
const STORAGE_KEY = 'budget-app-v1';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state.transactions = parsed.transactions || [];
    state.budgets      = parsed.budgets      || {};
  }
  // S'assurer que toutes les catégories ont un budget (même 0)
  CATEGORIES.forEach(c => {
    if (state.budgets[c.id] === undefined) state.budgets[c.id] = 0;
  });
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions: state.transactions,
    budgets:      state.budgets,
  }));
}

// =====================
// EXPORT JSON
// =====================
function exportData() {
  const data = {
    transactions: state.transactions,
    budgets:      state.budgets,
    exportedAt:   new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href     = url;
  a.download = `budget-sauvegarde-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Sauvegarde téléchargée');
}

// =====================
// IMPORT JSON
// =====================
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transactions || !data.budgets) throw new Error('Format invalide');

      const count = data.transactions.length;
      if (!confirm(`Importer ${count} transaction(s) ? Tes données actuelles seront remplacées.`)) return;

      state.transactions = data.transactions;
      state.budgets      = data.budgets;
      saveData();
      showToast('✓ Données importées !');
      showPage('home');
    } catch {
      showToast('Fichier invalide');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// =====================
// EFFACER TOUTES LES DONNÉES
// =====================
function clearData() {
  if (!confirm('Effacer toutes les transactions et budgets ?')) return;
  state.transactions = [];
  state.budgets      = {};
  CATEGORIES.forEach(c => state.budgets[c.id] = 0);
  saveData();
  showToast('Données effacées');
  showPage('home');
}

// =====================
// HELPERS
// =====================
function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function getMonthTx(month, year) {
  return state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function getCurrentMonthTx() {
  const now = new Date();
  return getMonthTx(now.getMonth(), now.getFullYear());
}

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(n);
}

function fmtDec(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
