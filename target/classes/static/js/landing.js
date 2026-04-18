(function () {
  'use strict';

  const STORAGE_KEY = 'study_analysis_session';

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

  function hasValidSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.token || s.userId == null) return false;
      return !isTokenExpired(s.token);
    } catch {
      return false;
    }
  }

  function ready() {
    const primary = document.getElementById('landingCtaPrimary');
    const navLogin = document.getElementById('landingNavLogin');
    const hint = document.getElementById('landingSessionHint');

    if (hasValidSession()) {
      if (primary) {
        primary.textContent = 'Vào ứng dụng';
        primary.setAttribute('aria-label', 'Vào ứng dụng StudyHub');
      }
      if (navLogin) {
        navLogin.textContent = 'Vào ứng dụng';
      }
      if (hint) {
        hint.hidden = false;
        hint.textContent = 'Bạn đang có phiên đăng nhập — nhấn để vào dashboard.';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
