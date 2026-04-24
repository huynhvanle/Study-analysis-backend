(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const grid = document.getElementById('admStats');
  if (!grid) return;

  (async function load() {
    let users = 0;
    let courses = 0;
    try {
      const u = await window.StudyAdmin.request('users', { method: 'GET' });
      users = Array.isArray(u) ? u.length : 0;
    } catch {
      /* ignore */
    }
    try {
      const c = await window.StudyAdmin.request('courses/management', { method: 'GET' });
      courses = Array.isArray(c) ? c.length : 0;
    } catch {
      /* ignore */
    }
    const uid = window.StudyAdmin.getUserId();
    grid.innerHTML = `
      <div class="stat"><div class="stat-value">${users}</div><div class="stat-label">Tài khoản đã đăng ký</div></div>
      <div class="stat"><div class="stat-value">${courses}</div><div class="stat-label">Khóa trong hệ thống</div></div>
      <div class="stat"><div class="stat-value">${uid}</div><div class="stat-label">Mã nhân sự của bạn</div></div>
    `;
  })();
})();
