// =====================
// CATÉGORIES DÉPENSES
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
// CATÉGORIES REVENUS
// =====================
const DEFAULT_INCOME_CATEGORIES = [
  { id: 'inc_salary',     label: 'Salaire',       emoji: '💼', color: '#52c97a' },
  { id: 'inc_freelance',  label: 'Freelance',     emoji: '🧑‍💻', color: '#7ae8b4' },
  { id: 'inc_refund',     label: 'Remboursement', emoji: '↩️',  color: '#7ac4e8' },
  { id: 'inc_invest',     label: 'Investissement',emoji: '📈', color: '#e8c97a' },
  { id: 'inc_gift',       label: 'Cadeau',        emoji: '🎁', color: '#e87a9f' },
  { id: 'inc_other',      label: 'Autre',         emoji: '💰', color: '#a0a0a0' },
];

let CATEGORIES        = [...DEFAULT_CATEGORIES];
let INCOME_CATEGORIES = [...DEFAULT_INCOME_CATEGORIES];

const PALETTE = [
  '#e8c97a','#7ac4e8','#a87ae8','#e87a9f',
  '#7ae8b4','#e8a87a','#7a9fe8','#a0a0a0',
  '#e87a7a','#7ae8e8','#c4e87a','#b07ae8',
];

// =====================
// STATE
// =====================
const state = {
  transactions:   [],
  budgets:        {},
  globalBudget:   0,
  currency:       'EUR',
  currentType:    'expense',
  selectedCat:    'food',
  selectedIncCat: 'inc_salary',
  statsMonth:     new Date().getMonth(),
  statsYear:      new Date().getFullYear(),
  editingId:      null,
  filterText:     '',
  filterType:     'all',
  filterCat:      'all',
};

// =====================
// PERSISTANCE
// =====================
const STORAGE_KEY = 'budget-app-v1';

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions:     state.transactions,
    budgets:          state.budgets,
    globalBudget:     state.globalBudget,
    currency:         state.currency,
    categories:       CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
  }));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    CATEGORIES.forEach(c => state.budgets[c.id] = 0);
    return;
  }
  try {
    const d = JSON.parse(raw);
    state.transactions = d.transactions || [];
    state.budgets      = d.budgets      || {};
    state.globalBudget = d.globalBudget || 0;
    state.currency     = d.currency     || 'EUR';
    if (d.categories)       CATEGORIES        = d.categories;
    if (d.incomeCategories) INCOME_CATEGORIES = d.incomeCategories;
    // S'assurer que chaque catégorie a un budget initialisé
    CATEGORIES.forEach(c => { if (state.budgets[c.id] === undefined) state.budgets[c.id] = 0; });
  } catch(e) {
    console.error('loadData error', e);
  }
}

// =====================
// EXPORT JSON
// =====================
function exportData() {
  const data = JSON.stringify({
    transactions:     state.transactions,
    budgets:          state.budgets,
    globalBudget:     state.globalBudget,
    currency:         state.currency,
    categories:       CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `budget-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================
// EXPORT CSV
// =====================
function exportCSV() {
  const allCats = [...CATEGORIES, ...INCOME_CATEGORIES];
  const header  = ['Date','Type','Montant','Description','Catégorie'];
  const rows    = state.transactions
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .map(t => {
      const cat = allCats.find(c => c.id === t.category) || { label: 'Autre' };
      return [
        t.date,
        t.type === 'expense' ? 'Dépense' : 'Revenu',
        t.type === 'expense' ? -t.amount : t.amount,
        `"${(t.desc || '').replace(/"/g, '""')}"`,
        cat.label,
      ].join(';');
    });
  const csv  = [header.join(';'), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `budget-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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
      if (!confirm(`Importer ${data.transactions.length} transaction(s) ? Tes données actuelles seront remplacées.`)) return;
      state.transactions = data.transactions;
      state.budgets      = data.budgets;
      state.globalBudget = data.globalBudget || 0;
      state.currency     = data.currency     || 'EUR';
      if (data.categories)       CATEGORIES        = data.categories;
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
// EFFACER
// =====================
function clearData() {
  if (!confirm('Effacer toutes les transactions, budgets et catégories personnalisées ?')) return;
  state.transactions = [];
  state.budgets      = {};
  state.globalBudget = 0;
  state.currency     = 'EUR';
  CATEGORIES        = [...DEFAULT_CATEGORIES];
  INCOME_CATEGORIES = [...DEFAULT_INCOME_CATEGORIES];
  CATEGORIES.forEach(c => state.budgets[c.id] = 0);
  saveData();
  showToast('Données effacées');
  showPage('home');
}

// =====================
// HELPERS
// =====================
function getCat(id) {
  return [...CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === id)
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
    style: 'currency', currency: state.currency || 'EUR', maximumFractionDigits: 0
  }).format(n);
}

function fmtDec(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: state.currency || 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
