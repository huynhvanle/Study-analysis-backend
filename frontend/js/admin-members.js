(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;

  function roleVi(r) {
    const x = String(r || '')
      .trim()
      .toUpperCase();
    if (x === 'ADMIN') return 'Quản trị';
    if (x === 'INSTRUCTOR') return 'Giảng viên';
    if (x === 'STUDENT') return 'Học viên';
    return x || '—';
  }
  const root = document.getElementById('content');
  if (!root) return;

  async function loadAll() {
    const out = root.querySelector('#memTable');
    try {
      const list = await request('users', { method: 'GET' });
      if (!Array.isArray(list) || !list.length) {
        out.innerHTML = '<p class="muted">Không có người dùng.</p>';
        return;
      }
      out.innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Gói</th><th>Tên</th><th>Email</th></tr></thead><tbody>` +
        list
          .map(
            (u) =>
                `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(roleVi(u.role))}</td><td>${escapeHtml(
                  u.plan || 'FREE'
                )}</td><td>${escapeHtml(u.name || '')}</td><td>${escapeHtml(u.email || '')}</td></tr>`
          )
          .join('') +
        `</tbody></table></div>`;
    } catch (e) {
      out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  root.querySelector('#memLoad').addEventListener('click', loadAll);
  root.querySelector('#memOne').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = e.target.userId.value;
    const pre = root.querySelector('#memPre');
    try {
      const u = await request(`users/${id}`, { method: 'GET' });
      pre.hidden = false;
      pre.textContent = JSON.stringify(u, null, 2);
    } catch (err) {
      pre.hidden = true;
      showAppAlert(err.message, 'error');
    }
  });
  loadAll();
})();
