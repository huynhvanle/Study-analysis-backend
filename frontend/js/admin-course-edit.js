(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  try {
    if (!window.StudyAdmin) {
      throw new Error('Thiếu StudyAdmin. Kiểm tra admin-common.js đã load chưa.');
    }
  } catch (e) {
    const el = document.getElementById('alert');
    if (el) {
      el.hidden = false;
      el.textContent = e.message || String(e);
      el.className = 'banner error';
    }
    return;
  }

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;
  const root = document.getElementById('content');
  if (!root) return;

  function getCourseIdFromQuery() {
    try {
      const u = new URL(window.location.href);
      const v = u.searchParams.get('courseId');
      const id = Number(v);
      return Number.isFinite(id) && id > 0 ? id : 0;
    } catch {
      return 0;
    }
  }

  const courseId = getCourseIdFromQuery();
  const form = document.getElementById('adCourseEditPage');
  const idEl = document.getElementById('adEditCourseIdPage');
  const catSel = document.getElementById('adEditCatPage');

  const missing = [];
  if (!form) missing.push('#adCourseEditPage');
  if (!catSel) missing.push('#adEditCatPage');
  if (missing.length) {
    showAppAlert('Thiếu phần tử UI: ' + missing.join(', '), 'error');
    return;
  }

  function setupCoverImagePreview(inputEl) {
    if (!inputEl) return { refresh: () => {} };
    const field = inputEl.closest('.field') || inputEl.parentElement;
    if (!field) return { refresh: () => {} };
    if (field.querySelector('[data-cover-preview="1"]')) {
      const existing = field.querySelector('[data-cover-preview="1"]');
      const img = existing.querySelector('img');
      const status = existing.querySelector('[data-cover-status="1"]');
      return { refresh: (url) => refreshPreview(img, status, url ?? inputEl.value) };
    }

    const wrap = document.createElement('div');
    wrap.dataset.coverPreview = '1';
    wrap.style.marginTop = '0.5rem';
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = '120px 1fr';
    wrap.style.gap = '0.75rem';
    wrap.style.alignItems = 'start';

    const img = document.createElement('img');
    img.alt = 'Xem trước ảnh bìa';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.style.width = '120px';
    img.style.height = '72px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '12px';
    img.style.border = '2px solid var(--border)';
    img.style.background = '#f8fafc';

    const meta = document.createElement('div');
    meta.style.minWidth = '0';
    const status = document.createElement('div');
    status.dataset.coverStatus = '1';
    status.className = 'muted';
    status.style.fontSize = '0.82rem';
    status.style.lineHeight = '1.35';
    status.textContent = 'Nhập URL ảnh để xem trước.';
    const hint = document.createElement('div');
    hint.className = 'muted';
    hint.style.fontSize = '0.78rem';
    hint.style.marginTop = '0.15rem';
    hint.textContent = 'Nếu hiện dấu “?” thường là URL lỗi hoặc bị chặn hotlink.';

    meta.appendChild(status);
    meta.appendChild(hint);
    wrap.appendChild(img);
    wrap.appendChild(meta);
    field.appendChild(wrap);

    function refreshPreview(imgEl, statusEl, rawUrl) {
      const url = rawUrl ? String(rawUrl).trim() : '';
      if (!url) {
        imgEl.removeAttribute('src');
        statusEl.textContent = 'Nhập URL ảnh để xem trước.';
        statusEl.style.color = '';
        return;
      }
      statusEl.textContent = 'Đang tải ảnh…';
      statusEl.style.color = '';
      const busted = url.includes('?') ? `${url}&_pv=${Date.now()}` : `${url}?_pv=${Date.now()}`;
      imgEl.onerror = () => {
        statusEl.textContent = 'Không tải được ảnh. Kiểm tra URL (404), quyền truy cập, hoặc bị chặn hotlink.';
        statusEl.style.color = 'var(--danger)';
      };
      imgEl.onload = () => {
        statusEl.textContent = 'Ảnh tải OK.';
        statusEl.style.color = 'var(--green)';
      };
      imgEl.src = busted;
    }

    return { refresh: (url) => refreshPreview(img, status, url ?? inputEl.value) };
  }

  const coverInput = form.querySelector('[name="coverImageUrl"]');
  const coverPreview = setupCoverImagePreview(coverInput);
  if (coverInput) {
    const refresh = () => coverPreview.refresh();
    coverInput.addEventListener('input', refresh);
    coverInput.addEventListener('change', refresh);
    coverInput.addEventListener('blur', refresh);
  }

  async function loadCategoriesAndFillSelect(selectedId) {
    const cats = await request('course-categories', { method: 'GET' });
    const sorted = Array.isArray(cats)
      ? [...cats].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
        )
      : [];
    const opts = sorted.map((x) => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
    catSel.innerHTML = '<option value="">— Chọn danh mục —</option>' + opts;
    if (selectedId != null && String(selectedId)) {
      catSel.value = String(selectedId);
    }
  }

  function fillCourseForm(course) {
    if (idEl) idEl.value = String(course.id);
    form.querySelector('[name="title"]').value = course.title || '';
    form.querySelector('[name="description"]').value = course.description || '';
    form.querySelector('[name="level"]').value = course.level || '';
    form.querySelector('[name="coverImageUrl"]').value = course.coverImageUrl || '';
    coverPreview.refresh(course.coverImageUrl || '');
    form.querySelector('[name="language"]').value = course.language || '';
    const statusSelect = form.querySelector('[name="status"]');
    if (course.status && statusSelect.querySelector(`option[value="${course.status}"]`)) {
      statusSelect.value = course.status;
    }
    const tierSelect = form.querySelector('[name="accessTier"]');
    if (tierSelect) {
      const tier = course.accessTier || 'FREE';
      if (tierSelect.querySelector(`option[value="${tier}"]`)) {
        tierSelect.value = tier;
      }
    }
  }

  async function bootstrap() {
    if (!courseId) {
      showAppAlert('Thiếu courseId trên URL. Ví dụ: admin/course-edit.html?courseId=1', 'error');
      form.setAttribute('aria-disabled', 'true');
      return;
    }

    showAppAlert('');
    try {
      const course = await request(`courses/management/${courseId}`, { method: 'GET' });
      await loadCategoriesAndFillSelect(course.categoryId);
      fillCourseForm(course);
    } catch (e) {
      showAppAlert(e.message, 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');

    const id = Number(idEl.value);
    if (!id) {
      showAppAlert('Chưa có thông tin khóa học.', 'error');
      return;
    }

    const fd = new FormData(form);
    const body = {
      title: fd.get('title'),
      description: fd.get('description') || null,
      categoryId: Number(fd.get('categoryId')),
      level: fd.get('level') || null,
      coverImageUrl: fd.get('coverImageUrl') || null,
      language: fd.get('language') || null,
      status: fd.get('status') || null,
      accessTier: fd.get('accessTier') || 'FREE',
    };

    try {
      await request(`courses/${id}`, { method: 'PUT', body });
      showAppAlert('Đã cập nhật khóa học.', 'ok');
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  bootstrap();
})();

