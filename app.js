/* ═══════════════════════════════════════════
   GK Properties — Ultra-Modern App Logic
   Exclusively for Mr. Govindraj
   ═══════════════════════════════════════════ */

const STORAGE_KEY = 'gk_properties';

// ── State ──
let properties = [];
let editingId = null;
let deletingId = null;

// ── DOM Refs ──
const viewList       = document.getElementById('view-list');
const viewAdd        = document.getElementById('view-add');
const propertyGrid   = document.getElementById('property-grid');
const emptyState     = document.getElementById('empty-state');
const form           = document.getElementById('property-form');
const formTitle      = document.getElementById('form-title');
const searchInput    = document.getElementById('search-input');
const statTotal      = document.getElementById('stat-total');
const statIssues     = document.getElementById('stat-issues');
const btnSubmitTxt   = document.getElementById('btn-submit-text');
const modalOverlay   = document.getElementById('modal-overlay');
const toastContainer = document.getElementById('toast-container');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  loadProperties();
  searchInput.addEventListener('input', renderList);
  initParticles();
  initLiveClock();
  initKeyboardShortcuts();
  initScrollTopBtn();
  initMagneticButtons();
  initRippleButtons();
  initCalcInput();
  updateGreeting();
});

// ═══════════════════════════════════════════
// Persistence (same as before, server + fallback)
// ═══════════════════════════════════════════

async function loadProperties() {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      properties = await res.json();
      saveToLocalStorageFallback();
      renderList();
      updateHeroStats();
      return;
    }
  } catch (e) {
    console.warn('Backend server not reachable. Using localStorage fallback.', e);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    properties = raw ? JSON.parse(raw) : [];
  } catch {
    properties = [];
  }
  renderList();
  updateHeroStats();
}

function saveToLocalStorageFallback() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  } catch (e) {
    console.error('Failed to save to localStorage fallback', e);
  }
}

async function saveProperties() {
  saveToLocalStorageFallback();
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(properties)
    });
    if (!res.ok) console.error('Failed to sync changes with backend server');
  } catch (e) {
    console.warn('Could not sync with backend server. Saved locally.', e);
  }
}

// ═══════════════════════════════════════════
// Views
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// Render List
// ═══════════════════════════════════════════

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
    const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `
      <div class="property-card" style="animation-delay:${i * 70}ms" 
           onmouseenter="startTilt(this)" onmouseleave="endTilt(this)" onmousemove="handleTilt(event, this)">
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

        ${createdDate ? `<div style="margin-top:10px;font-size:0.62rem;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;">Added ${createdDate}</div>` : ''}
      </div>
    `;
  }).join('');

  updateHeroStats();
}

// ═══════════════════════════════════════════
// Form Handling
// ═══════════════════════════════════════════

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
    const idx = properties.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      properties[idx] = { ...properties[idx], ...data, updatedAt: Date.now() };
    }
    editingId = null;
    showToast('Property updated successfully ✏️');
    playSound('success');
  } else {
    data.id = generateId();
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    properties.unshift(data);
    showToast('Property added successfully 🎉');
    playSound('celebrate');
    // Launch confetti!
    launchConfetti();
  }

  saveProperties();
  resetForm();
  showView('list');
}

function startEdit(id) {
  const prop = properties.find(p => p.id === id);
  if (!prop) return;

  editingId = id;
  formTitle.innerHTML = '<span class="title-accent"></span> Edit Property';
  btnSubmitTxt.textContent = 'Update Property';

  form.name.value        = prop.name;
  form.location.value    = prop.location;
  form.clientName.value  = prop.clientName || '';
  form.clientPhone.value = prop.clientPhone || '';
  form.issue.value       = prop.issue || '';

  showView('add');
  playSound('click');
}

function cancelForm() {
  resetForm();
  showView('list');
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.innerHTML = '<span class="title-accent"></span> Add New Property';
  btnSubmitTxt.textContent = 'Save Property';
}

// ═══════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════

function startDelete(id) {
  deletingId = id;
  modalOverlay.classList.add('active');
  playSound('warning');
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
  showToast('Property deleted 🗑️');
  playSound('delete');
}

// ═══════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════

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
  }, 3000);
}

// ═══════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════

function generateId() {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// 🌌 PARTICLE CONSTELLATION SYSTEM
// ═══════════════════════════════════════════

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = -1000, mouseY = -1000;
  const PARTICLE_COUNT = 70;
  const CONNECTION_DIST = 140;
  const MOUSE_RADIUS = 200;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.radius = Math.random() * 1.8 + 0.5;
      this.opacity = Math.random() * 0.5 + 0.2;
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulseOffset = Math.random() * Math.PI * 2;
    }

    update(time) {
      this.x += this.vx;
      this.y += this.vy;

      // Wrap around
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;

      // Mouse repulsion
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.015;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }

      // Dampen velocity
      this.vx *= 0.999;
      this.vy *= 0.999;

      // Pulse
      this.currentOpacity = this.opacity + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.15;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 229, 255, ${this.currentOpacity})`;
      ctx.fill();
    }
  }

  // Create particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function animate(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update & draw particles
    particles.forEach(p => p.update(time));

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => p.draw());

    // Mouse glow
    if (mouseX > 0 && mouseY > 0) {
      const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.04)');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 120, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════
// 🃏 3D CARD TILT EFFECT
// ═══════════════════════════════════════════

function startTilt(card) {
  card.classList.add('tilt-active');
}

function endTilt(card) {
  card.classList.remove('tilt-active');
  card.style.transform = '';
}

function handleTilt(e, card) {
  if (!card.classList.contains('tilt-active')) return;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * -6;
  const rotateY = ((x - centerX) / centerX) * 6;

  card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
}

// ═══════════════════════════════════════════
// 🕐 LIVE CLOCK
// ═══════════════════════════════════════════

function initLiveClock() {
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('clock-time').textContent = timeStr;
    document.getElementById('clock-date').textContent = dateStr;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// ═══════════════════════════════════════════
// 👋 GREETING LOGIC
// ═══════════════════════════════════════════

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 5)       greeting = 'Good Night';
  else if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  else if (hour < 21) greeting = 'Good Evening';
  else                greeting = 'Good Night';

  document.getElementById('hero-title').innerHTML = `${greeting}, <span class="hero-name">Govindraj</span>`;
}

// ═══════════════════════════════════════════
// 📊 HERO STATS (Animated Counters)
// ═══════════════════════════════════════════

function updateHeroStats() {
  const total = properties.length;
  const issues = properties.filter(p => p.issue && p.issue.trim()).length;
  const active = total - issues;
  const clients = properties.filter(p => p.clientName && p.clientName.trim()).length;

  animateCounter('hero-stat-total', total);
  animateCounter('hero-stat-active', active);
  animateCounter('hero-stat-issues', issues);
  animateCounter('hero-stat-clients', clients);

  // Animate bars
  setTimeout(() => {
    const maxVal = Math.max(total, 1);
    setBrWidth('bar-total', (total / maxVal) * 100);
    setBrWidth('bar-active', (active / maxVal) * 100);
    setBrWidth('bar-issues', (issues / maxVal) * 100);
    setBrWidth('bar-clients', (clients / maxVal) * 100);
  }, 200);
}

function setBrWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(pct, 100) + '%';
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + (target - current) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ═══════════════════════════════════════════
// ⌨️ KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K — Command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCmdPalette();
      return;
    }

    // Ctrl+N — New property
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      showView('add');
      return;
    }

    // Escape — Close overlays
    if (e.key === 'Escape') {
      if (document.getElementById('cmd-palette-overlay').classList.contains('active')) {
        closeCmdPalette();
      } else if (modalOverlay.classList.contains('active')) {
        closeModal();
      } else if (calcPanel.classList.contains('active')) {
        toggleCalculator();
      } else if (document.getElementById('fab-container').classList.contains('open')) {
        closeFabMenu();
      }
    }
  });
}

// ═══════════════════════════════════════════
// 🔍 COMMAND PALETTE
// ═══════════════════════════════════════════

const cmdOverlay = document.getElementById('cmd-palette-overlay');
const cmdInput   = document.getElementById('cmd-input');
const cmdResults = document.getElementById('cmd-results');

function toggleCmdPalette() {
  const isOpen = cmdOverlay.classList.toggle('active');
  if (isOpen) {
    cmdInput.value = '';
    cmdInput.focus();
    renderCmdResults('');
  }
}

function closeCmdPalette() {
  cmdOverlay.classList.remove('active');
}

cmdInput.addEventListener('input', () => {
  renderCmdResults(cmdInput.value.trim().toLowerCase());
});

cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCmdPalette();
  } else if (e.key === 'Enter') {
    const firstItem = cmdResults.querySelector('.cmd-item');
    if (firstItem) firstItem.click();
  }
});

function renderCmdResults(query) {
  let html = '';

  // Quick actions
  const actions = [
    { icon: '➕', text: 'Add New Property', action: 'add', shortcut: 'Ctrl+N' },
    { icon: '🧮', text: 'Open Calculator', action: 'calc', shortcut: 'C' },
    { icon: '⬆️', text: 'Scroll to Top', action: 'top', shortcut: 'T' },
  ];

  const filteredActions = actions.filter(a => !query || a.text.toLowerCase().includes(query));

  if (filteredActions.length > 0) {
    html += '<div class="cmd-group-label">Quick Actions</div>';
    filteredActions.forEach(a => {
      html += `<button class="cmd-item" onclick="cmdAction('${a.action}')">
        <span class="cmd-item-icon">${a.icon}</span>
        <span class="cmd-item-text">${a.text}</span>
        <kbd>${a.shortcut}</kbd>
      </button>`;
    });
  }

  // Search properties
  if (query && properties.length > 0) {
    const matchedProps = properties.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      (p.clientName && p.clientName.toLowerCase().includes(query))
    );

    if (matchedProps.length > 0) {
      html += '<div class="cmd-group-label">Properties</div>';
      matchedProps.slice(0, 5).forEach(p => {
        html += `<button class="cmd-item cmd-item--property" onclick="cmdEditProperty('${p.id}')">
          <span class="cmd-item-icon">🏠</span>
          <div>
            <div class="cmd-prop-name">${escapeHtml(p.name)}</div>
            <div class="cmd-prop-location">${escapeHtml(p.location)}</div>
          </div>
        </button>`;
      });
    }
  }

  if (!html) {
    html = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No results found</div>';
  }

  cmdResults.innerHTML = html;
}

function cmdAction(action) {
  closeCmdPalette();
  playSound('click');
  switch (action) {
    case 'add':
      showView('add');
      break;
    case 'calc':
      if (!calcPanel.classList.contains('active')) toggleCalculator();
      break;
    case 'top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
  }
}

function cmdEditProperty(id) {
  closeCmdPalette();
  startEdit(id);
}

// ═══════════════════════════════════════════
// 🎯 FLOATING ACTION BUTTON (Radial Menu)
// ═══════════════════════════════════════════

const fabContainer = document.getElementById('fab-container');
const fabMain      = document.getElementById('fab-main');
let fabOpen = false;

function toggleFabMenu() {
  fabOpen = !fabOpen;
  fabContainer.classList.toggle('open', fabOpen);
  fabMain.classList.toggle('active', fabOpen);
  playSound('click');
}

function closeFabMenu() {
  fabOpen = false;
  fabContainer.classList.remove('open');
  fabMain.classList.remove('active');
}

function fabCalc() {
  closeFabMenu();
  toggleCalculator();
}

function fabAddProperty() {
  closeFabMenu();
  showView('add');
}

function fabScrollTop() {
  closeFabMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ═══════════════════════════════════════════
// 🧮 CALCULATOR (Enhanced with typing)
// ═══════════════════════════════════════════

const calcPanel      = document.getElementById('calc-panel');
const calcExpression = document.getElementById('calc-expression');
const calcResultInput = document.getElementById('calc-result');

let calcCurrent     = '0';
let calcPrevious    = '';
let calcOperatorVal = null;
let calcResetNext   = false;
let calcOpen        = false;

function toggleCalculator() {
  calcOpen = !calcOpen;
  calcPanel.classList.toggle('active', calcOpen);
  if (calcOpen) {
    playSound('click');
    // Focus the input for typing
    setTimeout(() => calcResultInput.focus(), 100);
  }
}

function calcUpdateDisplay() {
  calcResultInput.value = calcCurrent;

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
  playSound('tick');
}

function calcDecimal() {
  if (calcResetNext) {
    calcCurrent = '0.';
    calcResetNext = false;
  } else if (!calcCurrent.includes('.')) {
    calcCurrent += '.';
  }
  calcUpdateDisplay();
  playSound('tick');
}

function calcOperator(op) {
  if (calcOperatorVal && !calcResetNext) {
    calcCompute();
  }
  calcPrevious = calcCurrent;
  calcOperatorVal = op;
  calcResetNext = true;
  calcUpdateDisplay();
  playSound('click');
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
  calcResultInput.value = calcCurrent;
  calcOperatorVal = null;
  calcPrevious = '';
  calcResetNext = true;
  playSound('success');
}

function calcClear() {
  calcCurrent = '0';
  calcPrevious = '';
  calcOperatorVal = null;
  calcResetNext = false;
  calcUpdateDisplay();
  playSound('click');
}

function calcBackspace() {
  if (calcResetNext) return;
  calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
  calcUpdateDisplay();
  playSound('tick');
}

// ── Calculator Input Typing Support ──
function initCalcInput() {
  calcResultInput.addEventListener('keydown', (e) => {
    e.stopPropagation();

    // Digits
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      calcDigit(e.key);
      return;
    }

    // Decimal
    if (e.key === '.') {
      e.preventDefault();
      calcDecimal();
      return;
    }

    // Operators
    if (['+', '-', '*', '/'].includes(e.key)) {
      e.preventDefault();
      calcOperator(e.key);
      return;
    }

    // Percent
    if (e.key === '%') {
      e.preventDefault();
      calcOperator('%');
      return;
    }

    // Enter = Equals
    if (e.key === 'Enter') {
      e.preventDefault();
      calcEquals();
      return;
    }

    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      calcBackspace();
      return;
    }

    // Escape = Clear
    if (e.key === 'Escape') {
      e.preventDefault();
      calcClear();
      return;
    }

    // Delete = Clear
    if (e.key === 'Delete') {
      e.preventDefault();
      calcClear();
      return;
    }

    // Prevent any other character from being typed directly
    if (e.key.length === 1) {
      e.preventDefault();
    }
  });

  // Prevent paste of non-numbers
  calcResultInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const cleaned = text.replace(/[^0-9.]/g, '');
    if (cleaned) {
      if (calcResetNext) {
        calcCurrent = cleaned;
        calcResetNext = false;
      } else {
        calcCurrent = calcCurrent === '0' ? cleaned : calcCurrent + cleaned;
      }
      calcUpdateDisplay();
    }
  });

  // Select all on focus
  calcResultInput.addEventListener('focus', () => {
    setTimeout(() => calcResultInput.select(), 10);
  });
}

// Close calculator when clicking outside
document.addEventListener('click', (e) => {
  if (calcPanel.classList.contains('active') &&
      !calcPanel.contains(e.target) &&
      !fabContainer.contains(e.target)) {
    calcPanel.classList.remove('active');
    calcOpen = false;
  }
});

// ── Add ripple to calc buttons ──
document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.add('calc-ripple');
    setTimeout(() => btn.classList.remove('calc-ripple'), 400);
  });
});

// ═══════════════════════════════════════════
// 🎉 CONFETTI SYSTEM
// ═══════════════════════════════════════════

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#00e5ff', '#b388ff', '#00e676', '#ffab40', '#ff1744', '#e040fb', '#40c4ff'];
  const PIECE_COUNT = 120;

  for (let i = 0; i < PIECE_COUNT; i++) {
    pieces.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -18 - 4,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.25 + Math.random() * 0.15,
      opacity: 1,
      decay: 0.008 + Math.random() * 0.008,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function animateConfetti() {
    if (frame > maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    frame++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      p.opacity -= p.decay;
      if (p.opacity < 0) p.opacity = 0;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    requestAnimationFrame(animateConfetti);
  }

  animateConfetti();
}

// ═══════════════════════════════════════════
// 🔊 SOUND EFFECTS (Web Audio API)
// ═══════════════════════════════════════════

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'click':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
        break;

      case 'tick':
        osc.frequency.value = 1200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
        break;

      case 'success':
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
        break;

      case 'celebrate':
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.24);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
        break;

      case 'warning':
        osc.frequency.value = 300;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        break;

      case 'delete':
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
        break;
    }
  } catch (e) {
    // Audio not supported, silently fail
  }
}

// ═══════════════════════════════════════════
// 🧲 MAGNETIC BUTTONS
// ═══════════════════════════════════════════

function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ═══════════════════════════════════════════
// 💫 RIPPLE EFFECT ON BUTTONS
// ═══════════════════════════════════════════

function initRippleButtons() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      btn.style.setProperty('--ripple-x', x + '%');
      btn.style.setProperty('--ripple-y', y + '%');
      btn.classList.add('ripple-active');
      setTimeout(() => btn.classList.remove('ripple-active'), 500);
    });
  });
}

// ═══════════════════════════════════════════
// ⬆️ SCROLL TO TOP BUTTON
// ═══════════════════════════════════════════

function initScrollTopBtn() {
  const btn = document.getElementById('scroll-top-btn');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
}

document.addEventListener("keydown", function (event) {
    if (event.key.toLowerCase() === "t") {
        document.getElementById("scroll-top-btn").click();
    }
});

// ═══════════════════════════════════════════
// 🌟 LOGO ANIMATION
// ═══════════════════════════════════════════

document.getElementById('logo-icon').addEventListener('click', () => {
  playSound('celebrate');
  launchConfetti();
});

// ═══════════════════════════════════════════
// 🎨 SHORTCUT HINT CLICK
// ═══════════════════════════════════════════

document.getElementById('shortcut-hint').addEventListener('click', () => {
  toggleCmdPalette();
});
