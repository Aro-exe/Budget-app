// =====================
// CATÉGORIES PAR DÉFAUT (DÉPENSES)
// =====================
const DEFAULT_CATEGORIES = [
  { id: 'food',      label: 'Alimentation', emoji: '🛒', color: '#e8c97a' },
  { id: 'transport', label: 'Transport',    emoji: '🚇', color: '#7ac4e8' },
  { id: 'housing',   label: 'Logement',     emoji: '🏠', color: '#a87ae8' },
  { id: 'health',    label: 'Santé',        emoji: '💊', color: '#e87a9f' },
  { id: 'leisure',   label: 'Loisirs',      emoji: '🎬', color: '#7ae8b4' },
  { id: 'clothing',  label: 'Vêtements',    emoji: '👗', color: '#e8a87a' },
  { id: 'tech',      label: 'Tech',         emoji: '💻', color: '#7a9fe8' },
  { id: 'other',     label: 'Autre',        emoji: '📦', color: '#a0a0a0' },
];

// =====================
// CATÉGORIES PAR DÉFAUT (REVENUS)
// =====================
const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary',     label: 'Salaire',        emoji: '💵', color: '#52c97a' },
  { id: 'freelance',  label: 'Freelance',      emoji: '💼', color: '#7ae8b4' },
  { id: 'refund',     label: 'Remboursement',  emoji: '🔄', color: '#7ac4e8' },
  { id: 'investment', label: 'Investissement', emoji: '📈', color: '#e8c97a' },
  { id: 'gift',       label: 'Cadeau',         emoji: '🎁', color: '#e87a9f' },
  { id: 'other_inc',  label: 'Autre',          emoji: '📦', color: '#a0a0a0' },
];

// CATEGORIES est désormais dynamique (chargé/sauvegardé dans localStorage)
let CATEGORIES = [...DEFAULT_CATEGORIES];
let INCOME_CATEGORIES = [...DEFAULT_INCOME_CATEGORIES];

// Palette de couleurs pour les nouvelles catégories
const PALETTE = [
  '#e8c97a','#7ac4e8','#a87ae8','#e87a9f',
  '#7ae8b4','#e8a87a','#7a9fe8','#a0a0a0',
  '#e87a7a','#7ae8e8','#c4e87a','#b07ae8',
  '#7ae8a0','#e8b07a','#7ab0e8','#e8d07a',
];

// =====================
// STATE (données en mémoire)
// =====================
const state = {
  transactions:    [],
  budgets:         {},
  globalBudget:    0,
  recurringTx:     [],
  currentType:     'expense',
  selectedCat:     'food',
  selectedIncomeCat: 'salary',
  statsMonth:      new Date().getMonth(),
  statsYear:       new Date().getFullYear(),
};

// =====================
// HISTORIQUE UNDO
// =====================
const undoStack = [];
const MAX_UNDO = 20;

function pushUndo(actionLabel) {
  undoStack.push({
    label: actionLabel,
    snapshot: JSON.parse(JSON.stringify({
      transactions: state.transactions,
      budgets: state.budgets,
      globalBudget: state.globalBudget,
      recurringTx: state.recurringTx,
      categories: CATEGORIES,
      incomeCategories: INCOME_CATEGORIES,
    })),
    timestamp: Date.now(),
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  showUndoButton();
}

function popUndo() {
  if (undoStack.length === 0) return null;
  return undoStack.pop();
}

function showUndoButton() {
  const btn = document.getElementById('undo-btn');
  if (!btn) return;
  btn.style.display = 'block';
  clearTimeout(btn._hideTimer);
  btn._hideTimer = setTimeout(() => { btn.style.display = 'none'; }, 8000);
}

function hideUndoButton() {
  const btn = document.getElementById('undo-btn');
  if (btn) {
    btn.style.display = 'none';
    clearTimeout(btn._hideTimer);
  }
}

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
    state.globalBudget = parsed.globalBudget  || 0;
    state.recurringTx  = parsed.recurringTx   || [];
    if (parsed.categories && parsed.categories.length > 0) {
      CATEGORIES = parsed.categories;
    }
    if (parsed.incomeCategories && parsed.incomeCategories.length > 0) {
      INCOME_CATEGORIES = parsed.incomeCategories;
    }
  }
  CATEGORIES.forEach(c => {
    if (state.budgets[c.id] === undefined) state.budgets[c.id] = 0;
  });
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions:     state.transactions,
    budgets:          state.budgets,
    globalBudget:     state.globalBudget,
    recurringTx:      state.recurringTx,
    categories:       CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
  }));
}

// =====================
// TRANSACTIONS RÉCURRENTES
// =====================
function processRecurringTransactions() {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();

  state.recurringTx.forEach(rec => {
    if (!rec.active) return;
    // Vérifier si une transaction récurrente existe déjà ce mois
    const exists = state.transactions.some(t =>
      t.recurringId === rec.id &&
      new Date(t.date).getMonth() === month &&
      new Date(t.date).getFullYear() === year
    );
    if (exists) return;

    // Si on est passé le jour du mois (ou c'est aujourd'hui), créer la transaction
    const day = Math.min(rec.dayOfMonth, new Date(year, month + 1, 0).getDate());
    if (today.getDate() >= day) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      state.transactions.unshift({
        id:          Date.now() + Math.random(),
        type:        rec.type,
        amount:      rec.amount,
        desc:        rec.desc,
        category:    rec.category,
        date:        dateStr,
        recurringId: rec.id,
      });
    }
  });
  saveData();
}

// =====================
// EXPORT JSON
// =====================
function exportData() {
  const data = {
    transactions:     state.transactions,
    budgets:          state.budgets,
    globalBudget:     state.globalBudget,
    recurringTx:      state.recurringTx,
    categories:       CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
    exportedAt:       new Date().toISOString(),
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

      pushUndo('Import de données');
      state.transactions = data.transactions;
      state.budgets      = data.budgets;
      state.globalBudget = data.globalBudget || 0;
      state.recurringTx  = data.recurringTx  || [];
      if (data.categories) CATEGORIES = data.categories;
      if (data.incomeCategories) INCOME_CATEGORIES = data.incomeCategories;
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
  if (!confirm('Effacer toutes les transactions, budgets et catégories personnalisées ?')) return;
  pushUndo('Effacement des données');
  state.transactions = [];
  state.budgets      = {};
  state.globalBudget = 0;
  state.recurringTx  = [];
  CATEGORIES         = [...DEFAULT_CATEGORIES];
  INCOME_CATEGORIES  = [...DEFAULT_INCOME_CATEGORIES];
  CATEGORIES.forEach(c => state.budgets[c.id] = 0);
  saveData();
  showToast('Données effacées');
  showPage('home');
}

// =====================
// HELPERS
// =====================
function getCat(id) {
  return CATEGORIES.find(c => c.id === id)
    || INCOME_CATEGORIES.find(c => c.id === id)
    || CATEGORIES[CATEGORIES.length - 1];
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

// Calculer le nombre de mois avec des transactions
function getActiveMonthCount() {
  const months = new Set();
  state.transactions.forEach(t => {
    const d = new Date(t.date);
    months.add(`${d.getFullYear()}-${d.getMonth()}`);
  });
  return Math.max(1, months.size);
}
