(function () {
  'use strict';

  const STORAGE_KEY = 'study_analysis_session';

  const state = {
    token: null,
    userId: null,
    username: null,
    role: null,
    name: null,
    email: null,
  };

  function normalizeRole(r) {
    return String(r || '')
      .trim()
      .toUpperCase();
  }

  function roleLabelVi(role) {
    const r = normalizeRole(role);
    if (r === 'ADMIN') return 'Quản trị';
    if (r === 'INSTRUCTOR') return 'Giảng viên';
    if (r === 'STUDENT') return 'Học viên';
    return r || '—';
  }

  function isStaff() {
    const r = normalizeRole(state.role);
    return r === 'ADMIN' || r === 'INSTRUCTOR';
  }

  function isAuthenticated() {
    return !!(state.token && state.userId != null && !isTokenExpired(state.token));
  }

  function isTokenExpired(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return false;
    }
  }

  function getApiRoot() {
    const meta = document.querySelector('meta[name="api-root"]');
    const raw = meta?.getAttribute('content')?.trim() ?? '';
    return raw.replace(/\/$/, '');
  }

  function buildUrl(path) {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const root = getApiRoot();
    if (!root) return p;
    const base = root.replace(/\/$/, '');
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base}/${p}`;
    }
    const prefix = base.startsWith('/') ? base : `/${base}`;
    return `${prefix}/${p}`;
  }

  async function request(path, options) {
    options = options || {};
    const url = buildUrl(path);
    const headers = { ...(options.headers || {}) };
    let body = options.body;
    if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    const res = await fetch(url, { ...options, headers, body });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { _raw: text };
      }
    }
    if (!res.ok) {
      const msg = data?.messgase || data?.message || data?._raw || res.statusText;
      const err = new Error(msg || `HTTP ${res.status}`);
      if (data != null && typeof data.code === 'number') {
        err.code = data.code;
      }
      throw err;
    }
    return data;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      state.token = s.token || null;
      state.userId = s.userId ?? null;
      state.username = s.username || null;
      state.role = s.role || null;
      state.name = s.name || null;
      state.email = s.email || null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearSession() {
    state.token = state.userId = state.username = state.role = state.name = state.email = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function showAppAlert(msg, type) {
    const el = document.getElementById('alert');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      el.className = 'banner';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.className = 'banner ' + (type === 'ok' ? 'ok' : 'error');
  }

  function updateTopbar() {
    const badge = document.getElementById('roleBadge');
    const r = normalizeRole(state.role);
    if (badge) {
      badge.textContent = roleLabelVi(state.role);
      badge.className = 'role-badge admin-role-badge ' + (isStaff() ? 'staff' : 'student');
    }

    const initial = (state.name || state.username || '?').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
    const un = document.getElementById('userDisplayName');
    if (un) un.textContent = state.name || state.username || 'Người dùng';
    const uid = document.getElementById('userDisplayId');
    if (uid) uid.textContent = 'ID ' + state.userId;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setAdminPage(title, desc) {
    const pt = document.getElementById('pageTitle');
    const pd = document.getElementById('pageDesc');
    if (pt) pt.textContent = title;
    if (pd) pd.textContent = desc;
    const bc = document.getElementById('adminBreadcrumb');
    if (bc) {
      bc.innerHTML = `<span class="admin-bc-item">Quản trị</span><span class="admin-bc-sep" aria-hidden="true">/</span><span class="admin-bc-item admin-bc-current">${escapeHtml(title)}</span>`;
    }
  }

  function buildAdminNav(activeId) {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.replaceChildren();
    const items = [
      { id: 'home', href: 'admin.html', label: 'Tổng quan', icon: '' },
      { id: 'members', href: 'admin/members.html', label: 'Thành viên', icon: '' },
      { id: 'courses', href: 'admin/courses.html', label: 'Khóa học', icon: '' },
    ];
    items.forEach((item) => {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'sidebar-nav-link' + (activeId === item.id ? ' active' : '');
      a.innerHTML = item.icon
        ? `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`
        : `<span class="nav-label">${item.label}</span>`;
      nav.appendChild(a);
    });
    const back = document.createElement('a');
    back.href = 'student/student.html';
    back.className = 'btn btn-ghost btn-sm';
    back.style.marginTop = '0.75rem';
    back.style.display = 'block';
    back.textContent = '← Trang học viên';
    nav.appendChild(back);
  }

  function handleLogoutClick() {
    clearSession();
    showAppAlert('');
    window.location.href = 'index.html';
  }

  function initAdminPage(cfg) {
    loadSession();
    if (!isAuthenticated()) {
      window.location.replace('index.html?auth=1');
      return;
    }
    if (!isStaff()) {
      window.location.replace('index.html');
      return;
    }
    updateTopbar();
    buildAdminNav(cfg.active || 'home');
    setAdminPage(cfg.title || 'Quản trị', cfg.desc || '—');
    document.querySelectorAll('.js-logout').forEach((btn) => btn.addEventListener('click', handleLogoutClick));
    bindGlobalDeleteConfirm();
  }

  function bindGlobalDeleteConfirm() {
    if (window.__studyAdminDeleteConfirmBound) return;
    window.__studyAdminDeleteConfirmBound = true;

    document.addEventListener(
      'click',
      (ev) => {
        const el = ev.target?.closest?.('button, a');
        if (!el) return;

        // Allow bypass for non-delete actions
        if (el.dataset?.confirmBypass === '1') return;

        const text = (el.textContent || '').trim().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const dataAction = String(el.dataset?.action || '').toLowerCase();

        const looksLikeDelete =
          text === 'xoá' ||
          text === 'xóa' ||
          aria.includes('xoá') ||
          aria.includes('xóa') ||
          dataAction.includes('delete') ||
          el.hasAttribute('data-cat-del') ||
          el.classList.contains('student-dropdown-item--danger') ||
          el.classList.contains('ad-course-row-delete');

        if (!looksLikeDelete) return;

        // Prevent double prompting: first click prompts, second click proceeds.
        if (el.dataset._confirmedDeleteClick === '1') {
          delete el.dataset._confirmedDeleteClick;
          return;
        }

        const msg =
          (el.dataset?.confirm && String(el.dataset.confirm).trim()) ||
          'Bạn có chắc muốn xoá mục này không?';

        const ok = window.confirm(msg);
        if (!ok) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          return;
        }

        el.dataset._confirmedDeleteClick = '1';
        // Let other handlers run on this same click.
      },
      true
    );
  }

  window.StudyAdmin = {
    state,
    request,
    showAppAlert,
    escapeHtml,
    initAdminPage,
    getUserId: function () {
      return state.userId;
    },
  };

  if (document.body.dataset.appShell === 'admin') {
    const cfg = window.__ADMIN_PAGE__ || { active: 'home', title: 'Quản trị', desc: '—' };
    initAdminPage(cfg);
  }
})();
