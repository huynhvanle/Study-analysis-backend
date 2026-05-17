(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;
  const root = document.getElementById('content');
  if (!root) return;

  const currentUserId = Number(window.StudyAdmin.getUserId?.() || 0);
  const searchInput = root.querySelector('#memSearch');
  const emailSearchInput = root.querySelector('#memEmailSearch');
  const planFilter = root.querySelector('#memPlanFilter');
  const statusFilter = root.querySelector('#memStatusFilter');
  const summaryEl = root.querySelector('#memSummary');
  const tableEl = root.querySelector('#memTable');
  const reloadBtn = root.querySelector('#memReload');
  const clearFiltersBtn = root.querySelector('#memClearFilters');
  const plusModal = root.querySelector('#memPlusModal');
  const plusTableEl = root.querySelector('#memPlusTable');
  const plusSummaryEl = root.querySelector('#memPlusSummary');
  const plusSearchInput = root.querySelector('#memPlusSearch');
  const openPlusApprovalBtn = root.querySelector('#memOpenPlusApproval');

  let usersAll = [];
  let filteredUsers = [];
  let filteredPlusUsers = [];
  let searchTimer;

  function roleVi(r) {
    const x = String(r || '').trim().toUpperCase();
    if (x === 'ADMIN') return 'Quản trị';
    if (x === 'INSTRUCTOR') return 'Giảng viên';
    if (x === 'STUDENT') return 'Học viên';
    return x || '—';
  }

  function planCode(value) {
    return String(value || 'FREE').trim().toUpperCase() || 'FREE';
  }

  function planVi(value) {
    return planCode(value) === 'PLUS' ? 'Plus' : 'Free';
  }

  function statusCode(value) {
    return String(value || 'ACTIVE').trim().toUpperCase() || 'ACTIVE';
  }

  function statusVi(value) {
    return statusCode(value) === 'INACTIVE' ? 'Dừng hoạt động' : 'Hoạt động';
  }

  function normalizeUser(user) {
    return {
      ...user,
      plan: planCode(user?.plan),
      status: statusCode(user?.status),
      plusUpgradeRequested: !!user?.plusUpgradeRequested,
      email: user?.email || '',
      name: user?.name || '',
    };
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('vi-VN');
  }

  function updateSummary() {
    if (!summaryEl) return;
    const total = usersAll.length;
    const visible = filteredUsers.length;
    summaryEl.textContent = `Hiển thị ${visible}/${total} tài khoản trong hệ thống.`;
  }

  function updatePlusSummary() {
    if (!plusSummaryEl) return;
    const total = getPlusEligibleUsers().length;
    const visible = filteredPlusUsers.length;
    plusSummaryEl.textContent = `Hiển thị ${visible}/${total} học viên đã gửi yêu cầu nâng cấp Plus.`;
  }

  function userMatches(user, query) {
    if (!query) return true;
    const needle = query.toLowerCase();
    const hay = [
      String(user.id || ''),
      user.username || '',
      user.name || '',
      roleVi(user.role),
      planVi(user.plan),
      statusVi(user.status),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  }

  function selectedUserById(userId) {
    return usersAll.find((item) => Number(item.id) === Number(userId)) || null;
  }

  function getPlusEligibleUsers() {
    return usersAll.filter(
      (user) =>
        String(user.role || '').toUpperCase() === 'STUDENT' &&
        planCode(user.plan) !== 'PLUS' &&
        !!user.plusUpgradeRequested
    );
  }

  function applyFilters() {
    const query = String(searchInput?.value || '').trim();
    const emailQuery = String(emailSearchInput?.value || '').trim().toLowerCase();
    const plan = planCode(planFilter?.value || '');
    const status = statusCode(statusFilter?.value || '');

    filteredUsers = usersAll.filter((user) => {
      if (planFilter?.value && user.plan !== plan) return false;
      if (statusFilter?.value && user.status !== status) return false;
      if (emailQuery && !String(user.email || '').toLowerCase().includes(emailQuery)) return false;
      return userMatches(user, query);
    });
    renderTable(filteredUsers);
    updateSummary();
  }

  function applyPlusFilters() {
    const query = String(plusSearchInput?.value || '').trim().toLowerCase();
    filteredPlusUsers = getPlusEligibleUsers().filter((user) => {
      if (!query) return true;
      return [user.username || '', user.name || '', user.email || '', String(user.id || '')]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
    renderPlusTable(filteredPlusUsers);
    updatePlusSummary();
  }

  function renderTable(list) {
    if (!tableEl) return;
    if (!usersAll.length) {
      tableEl.innerHTML = '<p class="muted">Chưa có người dùng.</p>';
      return;
    }
    if (!Array.isArray(list) || !list.length) {
      tableEl.innerHTML = '<p class="muted">Không có tài khoản khớp bộ lọc.</p>';
      return;
    }

    tableEl.innerHTML =
      `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Loại tài khoản</th><th>Trạng thái</th><th>Tên</th><th>Email</th><th></th></tr></thead><tbody>` +
      list
        .map((user) => {
          const isCurrentUser = Number(user.id) === currentUserId;
          const isActive = statusCode(user.status) === 'ACTIVE';
          const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE';
          const statusActionLabel = isActive ? 'Ngừng hoạt động' : 'Hoạt động';
          return (
            `<tr data-user-id="${user.id}">` +
            `<td>${user.id}</td>` +
            `<td>${escapeHtml(user.username || '')}</td>` +
            `<td>${escapeHtml(roleVi(user.role))}</td>` +
            `<td>${escapeHtml(planVi(user.plan))}${user.plusUpgradeRequested ? '<div class="muted" style="margin-top:0.2rem;font-size:0.76rem">Đã yêu cầu Plus</div>' : ''}</td>` +
            `<td>${escapeHtml(statusVi(user.status))}</td>` +
            `<td>${escapeHtml(user.name || '—')}</td>` +
            `<td>${escapeHtml(user.email || '—')}</td>` +
            `<td class="admin-user-actions-cell">` +
            `<div class="admin-user-actions">` +
            `<button type="button" class="btn btn-sm ${isActive ? 'btn-ghost' : 'btn-primary'} admin-user-status-btn" data-action="mem-toggle-status" data-next-status="${nextStatus}" data-user-id="${user.id}" ${
              isCurrentUser ? 'disabled title="Không thể tự đổi trạng thái tài khoản đang đăng nhập."' : ''
            }>${statusActionLabel}</button>` +
            `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-action="mem-delete" data-user-id="${user.id}" ${
              isCurrentUser ? 'disabled title="Không thể xoá tài khoản đang đăng nhập."' : ''
            } data-confirm="Bạn có chắc muốn xoá tài khoản #${user.id} không? Hành động này không thể hoàn tác.">Xoá</button>` +
            `</div>` +
            `</td>` +
            `</tr>`
          );
        })
        .join('') +
      `</tbody></table></div>`;
  }

  function renderPlusTable(list) {
    if (!plusTableEl) return;
    if (!getPlusEligibleUsers().length) {
      plusTableEl.innerHTML = '<p class="muted">Hiện chưa có học viên nào gửi yêu cầu nâng cấp Plus.</p>';
      return;
    }
    if (!Array.isArray(list) || !list.length) {
      plusTableEl.innerHTML = '<p class="muted">Không có học viên khớp bộ lọc.</p>';
      return;
    }

    plusTableEl.innerHTML =
      `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tên đăng nhập</th><th>Tên</th><th>Email</th><th>Trạng thái</th><th></th></tr></thead><tbody>` +
      list
        .map(
          (user) =>
            `<tr data-plus-user-id="${user.id}">` +
            `<td>${user.id}</td>` +
            `<td>${escapeHtml(user.username || '')}</td>` +
            `<td>${escapeHtml(user.name || '—')}</td>` +
            `<td>${escapeHtml(user.email || '—')}</td>` +
            `<td>${escapeHtml(statusVi(user.status))}</td>` +
            `<td class="admin-user-actions-cell"><button type="button" class="btn btn-sm btn-primary" data-action="mem-approve-plus" data-user-id="${user.id}">Phê duyệt Plus</button></td>` +
            `</tr>`
        )
        .join('') +
      `</tbody></table></div>`;
  }

  async function loadAll() {
    if (tableEl) tableEl.innerHTML = '<p class="muted">Đang tải…</p>';
    showAppAlert('');
    try {
      const list = await request('users', { method: 'GET' });
      usersAll = (Array.isArray(list) ? list : [])
        .map(normalizeUser)
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      applyFilters();
      applyPlusFilters();
    } catch (e) {
      usersAll = [];
      filteredUsers = [];
      filteredPlusUsers = [];
      if (tableEl) tableEl.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      if (plusTableEl) plusTableEl.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      updateSummary();
      updatePlusSummary();
    }
  }

  async function openPlusModal() {
    if (!plusModal) return;
    plusModal.classList.remove('hidden');
    plusModal.setAttribute('aria-hidden', 'false');
    if (plusTableEl) {
      plusTableEl.innerHTML = '<p class="muted">Đang tải…</p>';
    }
    try {
      await loadAll();
    } catch {
      /* loadAll already renders the error state */
    }
  }

  function closePlusModal() {
    if (!plusModal || plusModal.classList.contains('hidden')) return;
    plusModal.classList.add('hidden');
    plusModal.setAttribute('aria-hidden', 'true');
  }

  if (reloadBtn) {
    reloadBtn.addEventListener('click', loadAll);
  }
  openPlusApprovalBtn?.addEventListener('click', () => {
    openPlusModal();
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFilters(), 120);
    });
  }
  if (emailSearchInput) {
    emailSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFilters(), 120);
    });
  }
  planFilter?.addEventListener('change', applyFilters);
  statusFilter?.addEventListener('change', applyFilters);
  plusSearchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyPlusFilters(), 120);
  });
  clearFiltersBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (emailSearchInput) emailSearchInput.value = '';
    if (planFilter) planFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    applyFilters();
  });

  tableEl?.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const userId = Number(target.dataset.userId);
    if (!userId) return;

    if (target.dataset.action === 'mem-toggle-status') {
      event.preventDefault();
      const user = selectedUserById(userId);
      if (!user) {
        showAppAlert('Không tìm thấy người dùng để cập nhật trạng thái.', 'error');
        return;
      }
      if (userId === currentUserId) {
        showAppAlert('Không thể tự đổi trạng thái tài khoản đang đăng nhập.', 'error');
        return;
      }
      const nextStatus = statusCode(target.dataset.nextStatus);
      const actionLabel = nextStatus === 'ACTIVE' ? 'kích hoạt' : 'ngừng hoạt động';
      const ok = window.confirm(`Bạn có chắc muốn ${actionLabel} tài khoản #${user.id} không?`);
      if (!ok) return;
      showAppAlert('');
      try {
        await request(`users/${userId}`, { method: 'PUT', body: { status: nextStatus } });
        showAppAlert('Đã cập nhật trạng thái tài khoản.', 'ok');
        await loadAll();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
      return;
    }

    if (target.dataset.action === 'mem-delete') {
      if (userId === currentUserId) {
        showAppAlert('Không thể xoá tài khoản đang đăng nhập.', 'error');
        return;
      }
      event.preventDefault();
      showAppAlert('');
      try {
        await request(`users/${userId}`, { method: 'DELETE' });
        showAppAlert('Đã xoá tài khoản.', 'ok');
        await loadAll();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    }
  });

  plusTableEl?.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action="mem-approve-plus"]');
    if (!target) return;
    const userId = Number(target.dataset.userId);
    if (!userId) {
      showAppAlert('Thiếu mã người dùng.', 'error');
      return;
    }
    const user = selectedUserById(userId);
    if (!user) {
      showAppAlert('Không tìm thấy người dùng để cấp Plus.', 'error');
      return;
    }
    const ok = window.confirm(`Phê duyệt gói Plus cho tài khoản #${user.id} (${user.username || 'user'})?`);
    if (!ok) return;
    showAppAlert('');
    try {
        await request(`users/${userId}`, { method: 'PUT', body: { plan: 'PLUS', plusUpgradeRequested: false } });
      showAppAlert('Đã phê duyệt tài khoản Plus.', 'ok');
      await openPlusModal();
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  ['#memPlusModalClose', '#memPlusModalBackdrop', '#memPlusCancel'].forEach((selector) => {
    const element = root.querySelector(selector);
    if (element) {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        closePlusModal();
      });
    }
  });

  loadAll();
})();
