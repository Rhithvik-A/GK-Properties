/* ═══════════════════════════════════════════
   GK Properties — App Logic
   LocalStorage-backed CRUD for properties
   ═══════════════════════════════════════════ */

const STORAGE_KEY = 'gk_properties';

// ── State ──
let properties = [];
let editingId = null;
let deletingId = null;

// ── DOM Refs ──
const viewList     = document.getElementById('view-list');
const viewAdd      = document.getElementById('view-add');
const propertyGrid = document.getElementById('property-grid');
const emptyState   = document.getElementById('empty-state');
const form         = document.getElementById('property-form');
const formTitle    = document.getElementById('form-title');
const searchInput  = document.getElementById('search-input');
const statTotal    = document.getElementById('stat-total');
const statIssues   = document.getElementById('stat-issues');
const btnSubmitTxt = document.getElementById('btn-submit-text');
const modalOverlay = document.getElementById('modal-overlay');
const toastContainer = document.getElementById('toast-container');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  searchInput.addEventListener('input', renderList);
});

// ── Persistence ──
async function loadProperties() {
  try {
    // Try fetching from the server backend
    const res = await fetch('/api/data');
    if (res.ok) {
      properties = await res.json();
      saveToLocalStorageFallback(); // sync fallback
      renderList();
      return;
    }
  } catch (e) {
    console.warn('Backend server not reachable. Using localStorage fallback.', e);
  }

  // Fallback to localstorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    properties = raw ? JSON.parse(raw) : [];
  } catch {
    properties = [];
  }
  renderList();
}

function saveToLocalStorageFallback() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  } catch (e) {
    console.error('Failed to save to localStorage fallback', e);
  }
}

async function saveProperties() {
  // Always save to localstorage fallback immediately for fast response/resilience
  saveToLocalStorageFallback();

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(properties)
    });
    if (!res.ok) {
      console.error('Failed to sync changes with backend server');
    }
  } catch (e) {
    console.warn('Could not sync with backend server. Saved locally.', e);
  }
}

// ── Views ──
function showView(name) {
  viewList.classList.remove('active');
  viewAdd.classList.remove('active');

  if (name === 'list') {
    viewList.classList.add('active');
    renderList();
  } else if (name === 'add') {
    viewAdd.classList.add('active');
  }
}

// ── Render List ──
function renderList() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = properties.filter(p => {
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      (p.clientName && p.clientName.toLowerCase().includes(query)) ||
      (p.clientPhone && p.clientPhone.toLowerCase().includes(query)) ||
      (p.issue && p.issue.toLowerCase().includes(query))
    );
  });

  // Update stats
  statTotal.textContent = properties.length;
  statIssues.textContent = properties.filter(p => p.issue && p.issue.trim()).length;

  // Toggle empty state
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    propertyGrid.innerHTML = '';
    if (query) {
      emptyState.querySelector('h3').textContent = 'No Results Found';
      emptyState.querySelector('p').textContent = 'Try a different search term.';
    } else {
      emptyState.querySelector('h3').textContent = 'No Properties Yet';
      emptyState.querySelector('p').textContent = 'Add your first property to get started.';
    }
    return;
  }

  emptyState.classList.add('hidden');

  propertyGrid.innerHTML = filtered.map((p, i) => {
    const hasIssue = p.issue && p.issue.trim();
    return `
      <div class="property-card" style="animation-delay:${i * 60}ms">
        <div class="card-header">
          <div class="card-name">${escapeHtml(p.name)}</div>
          <div class="card-actions">
            <button class="btn btn--icon" title="Edit" onclick="startEdit('${p.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn--icon" title="Delete" onclick="startDelete('${p.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>

        <div class="card-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(p.location)}
        </div>

        <div class="card-divider"></div>

        <div class="card-detail">
          <svg class="card-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div>
            <div class="card-detail-label">Client</div>
            <div class="card-detail-value ${p.clientName ? '' : 'empty'}">${p.clientName ? escapeHtml(p.clientName) : 'Not specified'}</div>
          </div>
        </div>

        <div class="card-detail">
          <svg class="card-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <div>
            <div class="card-detail-label">Phone</div>
            <div class="card-detail-value ${p.clientPhone ? '' : 'empty'}">${p.clientPhone ? escapeHtml(p.clientPhone) : 'Not specified'}</div>
          </div>
        </div>

        ${hasIssue ? `
        <div class="card-detail">
          <svg class="card-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <div class="card-detail-label">Issue</div>
            <div class="card-detail-value">${escapeHtml(p.issue)}</div>
          </div>
        </div>
        ` : ''}

        <div class="issue-badge ${hasIssue ? 'issue-badge--has' : 'issue-badge--clear'}">
          ${hasIssue
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Issue Reported'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> All Clear'}
        </div>
      </div>
    `;
  }).join('');
}

// ── Form Handling ──
function handleSubmit(e) {
  e.preventDefault();

  const data = {
    name:        form.name.value.trim(),
    location:    form.location.value.trim(),
    clientName:  form.clientName.value.trim() || null,
    clientPhone: form.clientPhone.value.trim() || null,
    issue:       form.issue.value.trim() || null,
  };

  if (editingId) {
    // Update existing
    const idx = properties.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      properties[idx] = { ...properties[idx], ...data, updatedAt: Date.now() };
    }
    editingId = null;
    showToast('Property updated successfully');
  } else {
    // Create new
    data.id = generateId();
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    properties.unshift(data);
    showToast('Property added successfully');
  }

  saveProperties();
  resetForm();
  showView('list');
}

function startEdit(id) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;

  editingId = id;
  formTitle.textContent = 'Edit Property';
  btnSubmitTxt.textContent = 'Update Property';

  form.name.value        = prop.name;
  form.location.value    = prop.location;
  form.clientName.value  = prop.clientName || '';
  form.clientPhone.value = prop.clientPhone || '';
  form.issue.value       = prop.issue || '';

  showView('add');
}

function cancelForm() {
  resetForm();
  showView('list');
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'Add New Property';
  btnSubmitTxt.textContent = 'Save Property';
}

// ── Delete ──
function startDelete(id) {
  deletingId = id;
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  deletingId = null;
}

function confirmDelete() {
  if (!deletingId) return;
  properties = properties.filter(p => p.id !== deletingId);
  saveProperties();
  closeModal();
  renderList();
  showToast('Property deleted');
}

// ── Toast ──
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${escapeHtml(message)}</span>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2800);
}

// ── Utilities ──
function generateId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// Calculator Widget
// ═══════════════════════════════════════════

const calcFab        = document.getElementById('calc-fab');
const calcPanel      = document.getElementById('calc-panel');
const calcExpression = document.getElementById('calc-expression');
const calcResult     = document.getElementById('calc-result');

let calcCurrent     = '0';
let calcPrevious    = '';
let calcOperatorVal = null;
let calcResetNext   = false;

function toggleCalculator() {
  const isOpen = calcPanel.classList.toggle('active');
  calcFab.classList.toggle('active', isOpen);
}

function calcUpdateDisplay() {
  calcResult.textContent = calcCurrent;

  if (calcPrevious && calcOperatorVal) {
    const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' }[calcOperatorVal] || calcOperatorVal;
    calcExpression.textContent = `${calcPrevious} ${opSymbol}`;
  } else {
    calcExpression.textContent = '';
  }
}

function calcDigit(d) {
  if (calcResetNext) {
    calcCurrent = d;
    calcResetNext = false;
  } else {
    calcCurrent = calcCurrent === '0' ? d : calcCurrent + d;
  }
  calcUpdateDisplay();
}

function calcDecimal() {
  if (calcResetNext) {
    calcCurrent = '0.';
    calcResetNext = false;
  } else if (!calcCurrent.includes('.')) {
    calcCurrent += '.';
  }
  calcUpdateDisplay();
}

function calcOperator(op) {
  if (calcOperatorVal && !calcResetNext) {
    calcCompute();
  }
  calcPrevious = calcCurrent;
  calcOperatorVal = op;
  calcResetNext = true;
  calcUpdateDisplay();
}

function calcCompute() {
  const a = parseFloat(calcPrevious);
  const b = parseFloat(calcCurrent);
  if (isNaN(a) || isNaN(b)) return;

  let result;
  switch (calcOperatorVal) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/': result = b === 0 ? 'Error' : a / b; break;
    case '%': result = a * (b / 100); break;
    default: return;
  }

  if (typeof result === 'number') {
    // Avoid floating-point display issues
    result = parseFloat(result.toPrecision(12)).toString();
  }

  calcCurrent = result.toString();
}

function calcEquals() {
  if (!calcOperatorVal) return;

  const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' }[calcOperatorVal] || calcOperatorVal;
  const expr = `${calcPrevious} ${opSymbol} ${calcCurrent} =`;

  calcCompute();
  calcExpression.textContent = expr;
  calcResult.textContent = calcCurrent;
  calcOperatorVal = null;
  calcPrevious = '';
  calcResetNext = true;
}

function calcClear() {
  calcCurrent = '0';
  calcPrevious = '';
  calcOperatorVal = null;
  calcResetNext = false;
  calcUpdateDisplay();
}

function calcBackspace() {
  if (calcResetNext) return;
  calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
  calcUpdateDisplay();
}

// Close calculator when clicking outside
document.addEventListener('click', (e) => {
  if (calcPanel.classList.contains('active') &&
      !calcPanel.contains(e.target) &&
      !calcFab.contains(e.target)) {
    calcPanel.classList.remove('active');
    calcFab.classList.remove('active');
  }
});
