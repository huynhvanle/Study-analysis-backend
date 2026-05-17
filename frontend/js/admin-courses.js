(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;
  const root = document.getElementById('content');
  if (!root) return;

  const hid = root.querySelector('#adCreatedByUserId');
  if (hid) hid.value = String(window.StudyAdmin.getUserId() ?? '');

  const adCat = root.querySelector('#adCat');
  const adCourseModal = root.querySelector('#adCourseModal');
  const adEditModal = root.querySelector('#adEditModal');
  const searchInput = root.querySelector('#adCourseSearch');
  const createCourseForm = root.querySelector('#adCourse');
  const editCourseForm = root.querySelector('#adCourseEdit');

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
      const u = url.includes('?') ? `${url}&_pv=${Date.now()}` : `${url}?_pv=${Date.now()}`;
      imgEl.onerror = () => {
        statusEl.textContent = 'Không tải được ảnh. Kiểm tra URL (404), quyền truy cập, hoặc bị chặn hotlink.';
        statusEl.style.color = 'var(--danger)';
      };
      imgEl.onload = () => {
        statusEl.textContent = 'Ảnh tải OK.';
        statusEl.style.color = 'var(--green)';
      };
      imgEl.src = u;
    }

    return { refresh: (url) => refreshPreview(img, status, url ?? inputEl.value) };
  }

  const createCoverInput = createCourseForm?.querySelector('[name="coverImageUrl"]') || null;
  const editCoverInput = editCourseForm?.querySelector('[name="coverImageUrl"]') || null;
  const createCoverPreview = setupCoverImagePreview(createCoverInput);
  const editCoverPreview = setupCoverImagePreview(editCoverInput);
  [createCoverInput, editCoverInput].forEach((inp) => {
    if (!inp) return;
    const pv = inp === createCoverInput ? createCoverPreview : editCoverPreview;
    const refresh = () => pv.refresh();
    inp.addEventListener('input', refresh);
    inp.addEventListener('change', refresh);
    inp.addEventListener('blur', refresh);
  });

  const catManagerModal = root.querySelector('#catManagerModal');
  const catBtnOpenManager = root.querySelector('#catBtnOpenManager');
  const catWrap = root.querySelector('#catTableWrap');
  const catModal = root.querySelector('#catModal');
  const catForm = root.querySelector('#catForm');
  const catTitleEl = root.querySelector('#catModalTitle');
  const catEditId = root.querySelector('#catEditId');
  const adLessonsModal = root.querySelector('#adLessonsModal');
  const adLessonsModalTitle = root.querySelector('#adLessonsModalTitle');
  const adLessonsList = root.querySelector('#adLessonsList');
  const adLessonForm = root.querySelector('#adLessonForm');
  const adLessonFormTitle = root.querySelector('#adLessonFormTitle');
  const adLessonEditId = root.querySelector('#adLessonEditId');
  const adLessonSubmitBtn = root.querySelector('#adLessonSubmitBtn');
  const adLessonCancelBtn = root.querySelector('#adLessonCancel');
  const adLessonKind = root.querySelector('#adLessonKind');
  const adLessonFieldsLesson = root.querySelector('#adLessonFieldsLesson');
  const adLessonFieldsQuiz = root.querySelector('#adLessonFieldsQuiz');
  const hasCatUi = !!(
    catManagerModal &&
    catBtnOpenManager &&
    catWrap &&
    catModal &&
    catForm &&
    catTitleEl &&
    catEditId
  );

  let catalogAll = [];
  let lastFiltered = [];
  let currentLessonsCourseId = 0;
  let lastCourseLessons = [];

  function getLockedQuizMessage() {
    return 'Quiz đã có kết quả làm bài nên không thể soạn câu hỏi hoặc xoá nữa.';
  }

  /** Sắp xếp theo bảng chữ cái (tên hiển thị). */
  function sortCategoriesByName(cats) {
    if (!Array.isArray(cats)) return [];
    return [...cats].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
    );
  }

  function selectedCategorySelectValues() {
    const create = root.querySelector('#adCreateCat');
    const edit = root.querySelector('#adEditCat');
    return {
      create: create ? create.value : '',
      edit: edit ? edit.value : '',
    };
  }

  async function fetchCategoriesAndFillSelects() {
    const prev = selectedCategorySelectValues();
    const cats = await request('course-categories', { method: 'GET' });
    const sorted = sortCategoriesByName(cats);
    const opts = sorted.map((x) => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
    const html = '<option value="">— Chọn danh mục —</option>' + opts;
    ['#adCreateCat', '#adEditCat'].forEach((sel) => {
      const el = root.querySelector(sel);
      if (el) el.innerHTML = html;
    });
    const c1 = root.querySelector('#adCreateCat');
    if (c1 && prev.create && [...c1.options].some((o) => o.value === prev.create)) {
      c1.value = prev.create;
    }
    const c2 = root.querySelector('#adEditCat');
    if (c2 && prev.edit && [...c2.options].some((o) => o.value === prev.edit)) {
      c2.value = prev.edit;
    }
  }

  function openCatModal(isEdit) {
    catModal.classList.remove('hidden');
    catModal.setAttribute('aria-hidden', 'false');
    catTitleEl.textContent = isEdit ? 'Sửa danh mục' : 'Thêm danh mục';
    catForm.querySelector('[name="name"]').focus();
  }

  function closeCatModal() {
    catModal.classList.add('hidden');
    catModal.setAttribute('aria-hidden', 'true');
  }

  function escCatManager(ev) {
    if (ev.key !== 'Escape') return;
    if (!catModal.classList.contains('hidden')) {
      closeCatModal();
      return;
    }
    closeCatManager();
  }

  function openCatManager() {
    if (catManagerModal.classList.contains('hidden')) {
      catManagerModal.classList.remove('hidden');
      catManagerModal.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', escCatManager);
    }
  }

  function closeCatManager() {
    if (catManagerModal.classList.contains('hidden')) return;
    closeCatModal();
    catManagerModal.classList.add('hidden');
    catManagerModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', escCatManager);
  }

  async function loadCatTable() {
    if (!catWrap) return;
    catWrap.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const list = sortCategoriesByName(await request('course-categories', { method: 'GET' }));
      if (!list.length) {
        catWrap.innerHTML = '<p class="muted">Chưa có danh mục.</p>';
        return;
      }
      catWrap.innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tên</th><th></th></tr></thead><tbody>` +
        list
          .map(
            (c) =>
              `<tr><td>${c.id}</td><td>${escapeHtml(c.name)}</td><td style="white-space:nowrap">
                <button type="button" class="btn btn-sm btn-ghost" data-cat-edit="${c.id}">Sửa</button>
                <button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-cat-del="${c.id}" data-confirm="Bạn có chắc muốn xoá danh mục #${c.id} không? Chỉ xoá được khi không còn khoá học nào đang dùng danh mục này.">Xoá</button>
              </td></tr>`
          )
          .join('') +
        `</tbody></table></div>`;
    } catch (e) {
      catWrap.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  async function afterCategoryMutation() {
    await fetchCategoriesAndFillSelects();
    await loadCatTable();
  }

  function escCloseCreateModal(ev) {
    if (ev.key === 'Escape') closeCreateCourseModal();
  }

  function escCloseEditModal(ev) {
    if (ev.key === 'Escape') closeEditModal();
  }

  function openCreateCourseModal() {
    adCourseModal.classList.remove('hidden');
    adCourseModal.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', escCloseCreateModal);
    const first = adCourseModal.querySelector('#adCourse input[name="title"]');
    if (first) first.focus();
    createCoverPreview.refresh();
  }

  function closeCreateCourseModal() {
    adCourseModal.classList.add('hidden');
    adCourseModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', escCloseCreateModal);
  }

  function openEditModal() {
    adEditModal.classList.remove('hidden');
    adEditModal.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', escCloseEditModal);
    const first = adEditModal.querySelector('#adCourseEdit [name="title"]');
    if (first) first.focus();
    editCoverPreview.refresh();
  }

  function closeEditModal() {
    adEditModal.classList.add('hidden');
    adEditModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', escCloseEditModal);
  }

  function fillEditForm(c) {
    const f = root.querySelector('#adCourseEdit');
    root.querySelector('#adEditCourseId').value = String(c.id);
    f.querySelector('[name="title"]').value = c.title || '';
    f.querySelector('[name="description"]').value = c.description || '';
    const catSel = f.querySelector('[name="categoryId"]');
    if (catSel && c.categoryId != null) {
      catSel.value = String(c.categoryId);
    }
    f.querySelector('[name="level"]').value = c.level || '';
    f.querySelector('[name="coverImageUrl"]').value = c.coverImageUrl || '';
    editCoverPreview.refresh(c.coverImageUrl || '');
    f.querySelector('[name="language"]').value = c.language || '';
    const st = f.querySelector('[name="status"]');
    if (c.status && st.querySelector(`option[value="${c.status}"]`)) {
      st.value = c.status;
    }
    const at = f.querySelector('[name="accessTier"]');
    if (at) {
      const v = c.accessTier || 'FREE';
      if (at.querySelector(`option[value="${v}"]`)) {
        at.value = v;
      }
    }
  }

  function courseMatches(c, q) {
    if (!q) return true;
    const needle = q.toLowerCase();
    const hay = [
      String(c.id),
      c.title || '',
      c.status || '',
      c.category || '',
      String(c.categoryId ?? ''),
      String(c.createdByUserId ?? ''),
      String(c.lessonCount ?? ''),
      c.accessTier || '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  }

  function applyFilter() {
    const q = searchInput && searchInput.value ? searchInput.value.trim() : '';
    lastFiltered = catalogAll.filter((c) => courseMatches(c, q));
    renderTable(lastFiltered);
  }

  function renderTable(list) {
    if (!catalogAll.length) {
      adCat.innerHTML = '<p class="muted">Chưa có khóa học.</p>';
      return;
    }
    if (!list.length) {
      adCat.innerHTML = '<p class="muted">Không khớp bộ lọc.</p>';
      return;
    }

    function titleCell(c) {
      return (
        `<div class="ad-course-title-inner"><span class="ad-course-title-text">${escapeHtml(c.title)}</span><span class="ad-course-title-actions">` +
        `<button type="button" class="btn btn-sm btn-ghost ad-course-row-lessons" data-course-id="${c.id}" title="Thêm, sửa, xoá bài học">Quản lí bài học</button>` +
        `<button type="button" class="btn btn-sm btn-ghost ad-course-row-edit" data-course-id="${c.id}" aria-label="Sửa khóa học #${c.id}">Sửa</button>` +
        `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger ad-course-row-delete" data-course-id="${c.id}" aria-label="Xoá khóa học #${c.id}" data-confirm="Bạn có chắc muốn xoá hẳn khoá học #${c.id} không? Ghi danh, tiến độ, quiz… liên quan cũng sẽ bị xoá.">Xoá</button>` +
        `</span></div>`
      );
    }

    adCat.innerHTML =
      `<div class="table-wrap"><table class="ad-course-table"><thead><tr><th>ID</th><th>Tiêu đề</th><th>Gói</th><th>Trạng thái</th><th>Bài học</th><th>Danh mục</th><th>Người tạo</th></tr></thead><tbody>` +
      list
        .map(
          (c) =>
            `<tr data-course-id="${c.id}"><td>${c.id}</td><td class="ad-course-title-cell">${titleCell(c)}</td><td>${escapeHtml(
              c.accessTier || 'FREE'
            )}</td><td>${escapeHtml(c.status || '')}</td><td>${c.lessonCount ?? '—'}</td><td>${escapeHtml(c.category || '')}</td><td>${c.createdByUserId}</td></tr>`
        )
        .join('') +
      `</tbody></table></div>`;
  }

  async function loadAdminCatalog() {
    adCat.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const list = await request('courses/management', { method: 'GET' });
      catalogAll = Array.isArray(list) ? list : [];
      applyFilter();
    } catch (e) {
      catalogAll = [];
      adCat.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  async function openEditForCourse(courseId) {
    window.location.href = `admin/course-edit.html?courseId=${encodeURIComponent(String(courseId))}`;
  }

  async function deleteCourseById(courseId) {
    if (!courseId) return;
    showAppAlert('');
    try {
      await request(`courses/management/${courseId}`, { method: 'DELETE' });
      showAppAlert('Đã xoá khóa học.', 'ok');
      closeEditModal();
      await loadAdminCatalog();
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  }

  function getCourseById(courseId) {
    return catalogAll.find((item) => Number(item.id) === Number(courseId)) || null;
  }

  function nextLessonOrderIndexFromCache() {
    const max = lastCourseLessons.length ? Math.max(...lastCourseLessons.map((x) => Number(x.orderIndex) || 0)) : 0;
    return max + 1;
  }

  function setLessonKindUi(kind, isEditing) {
    const normalizedKind = String(kind || 'lesson').trim().toLowerCase();
    const isQuiz = normalizedKind === 'quiz';
    const titleInput = adLessonForm?.querySelector?.('[name="title"]');
    const contentUrlInput = adLessonForm?.querySelector?.('[name="contentUrl"]');
    const quizTitleInput = adLessonForm?.querySelector?.('[name="quizTitle"]');

    if (adLessonKind) {
      adLessonKind.value = isQuiz ? 'quiz' : 'lesson';
      adLessonKind.disabled = !!isEditing;
    }
    if (adLessonFieldsLesson) adLessonFieldsLesson.classList.toggle('hidden', isQuiz);
    if (adLessonFieldsQuiz) adLessonFieldsQuiz.classList.toggle('hidden', !isQuiz);
    if (titleInput) titleInput.required = !isQuiz;
    if (contentUrlInput) contentUrlInput.required = !isQuiz;
    if (quizTitleInput) quizTitleInput.required = isQuiz;

    if (adLessonFormTitle) {
      adLessonFormTitle.textContent = isEditing ? 'Sửa bài học' : isQuiz ? 'Thêm bài kiểm tra' : 'Thêm bài học';
    }
    if (adLessonSubmitBtn) {
      adLessonSubmitBtn.textContent = isEditing ? 'Lưu thay đổi' : isQuiz ? 'Tạo bài kiểm tra' : 'Lưu bài học';
    }
    if (adLessonCancelBtn) {
      adLessonCancelBtn.textContent = isEditing ? 'Huỷ chỉnh sửa' : 'Đóng';
    }
  }

  function resetLessonForm(courseId) {
    if (!adLessonForm) return;
    adLessonForm.reset();
    if (adLessonEditId) adLessonEditId.value = '';
    const hiddenCourseId = root.querySelector('#adLessonsCourseId');
    if (hiddenCourseId) hiddenCourseId.value = String(courseId || currentLessonsCourseId || '');
    const orderInput = adLessonForm.querySelector('[name="orderIndex"]');
    if (orderInput) orderInput.value = String(nextLessonOrderIndexFromCache() || 1);
    const durationInput = adLessonForm.querySelector('[name="duration"]');
    if (durationInput) durationInput.value = '15';
    setLessonKindUi('lesson', false);
  }

  function fillLessonFormForEdit(row) {
    if (!adLessonForm || !row) return;
    const lessonId = Number(row.dataset.lessonId);
    if (!lessonId) return;
    adLessonForm.querySelector('[name="title"]').value = row.dataset.title || '';
    adLessonForm.querySelector('[name="contentUrl"]').value = row.dataset.contentUrl || '';
    adLessonForm.querySelector('[name="orderIndex"]').value = String(Number(row.dataset.orderIndex) || 1);
    adLessonForm.querySelector('[name="duration"]').value = String(Number(row.dataset.duration) || 15);
    if (adLessonEditId) adLessonEditId.value = String(lessonId);
    setLessonKindUi('lesson', true);
  }

  async function loadLessonsForCourse(courseId) {
    if (!adLessonsList) return;
    currentLessonsCourseId = Number(courseId) || 0;
    const course = getCourseById(currentLessonsCourseId);
    if (adLessonsModalTitle) {
      adLessonsModalTitle.textContent = course?.title
        ? `Quản lí bài học — ${course.title}`
        : `Quản lí bài học — khóa #${currentLessonsCourseId}`;
    }
    adLessonsList.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const list = await request(`courses/${currentLessonsCourseId}/lessons`, { method: 'GET' });
      lastCourseLessons = Array.isArray(list) ? list : [];
      if (!lastCourseLessons.length) {
        adLessonsList.innerHTML = '<p class="muted">Chưa có bài học.</p>';
        if (!Number(adLessonEditId?.value || 0)) resetLessonForm(currentLessonsCourseId);
        return;
      }

      adLessonsList.innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>Thứ tự</th><th>Tiêu đề</th><th>Phút</th><th>URL</th><th></th></tr></thead><tbody>` +
        lastCourseLessons
          .map((lesson) => {
            const kind = String(lesson.kind || 'VIDEO').toUpperCase();
            const isQuizLesson = kind === 'QUIZ';
            const quizLocked = isQuizLesson && !!lesson.hasQuizResults;
            const rawUrl = lesson.contentUrl ? String(lesson.contentUrl) : '';
            const shortUrl = rawUrl.length > 70 ? `${rawUrl.slice(0, 68)}…` : rawUrl;
            const actionCell =
              (isQuizLesson
                ? `<button type="button" class="btn btn-sm btn-ghost" data-action="open-quiz-questions" ${
                    quizLocked ? `disabled title="${escapeHtml(getLockedQuizMessage())}"` : ''
                  }>${quizLocked ? 'Đã khóa' : 'Soạn câu hỏi'}</button>`
                : `<button type="button" class="btn btn-sm btn-ghost" data-action="lesson-edit">Sửa</button>`) +
              `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-action="lesson-delete" ${
                quizLocked ? `disabled title="${escapeHtml(getLockedQuizMessage())}"` : ''
              } data-confirm="Bạn có chắc muốn xoá bài học #${lesson.id} không? Quiz/tiến độ liên quan cũng sẽ bị xoá.">Xoá</button>`;

            return (
              `<tr data-lesson-id="${lesson.id}"` +
              ` data-title="${escapeHtml(lesson.title || '')}"` +
              ` data-content-url="${escapeHtml(rawUrl)}"` +
              ` data-order-index="${Number(lesson.orderIndex) || 1}"` +
              ` data-duration="${Number(lesson.duration) || 15}"` +
              ` data-kind="${escapeHtml(kind)}"` +
              ` data-quiz-id="${Number(lesson.quizId) || 0}"` +
              ` data-quiz-locked="${quizLocked ? '1' : '0'}">` +
              `<td>${lesson.orderIndex}</td>` +
              `<td>${escapeHtml(lesson.title)}${
                isQuizLesson
                  ? `<div class="muted" style="margin-top:0.25rem;font-size:0.78rem">Bài kiểm tra${
                      quizLocked ? ' • Đã có kết quả làm bài' : ''
                    }</div>`
                  : ''
              }</td>` +
              `<td>${lesson.duration}</td>` +
              `<td>${isQuizLesson ? '<span class="muted">—</span>' : `<code style="font-size:0.75rem">${escapeHtml(shortUrl || '—')}</code>`}</td>` +
              `<td><div class="row" style="justify-content:flex-end;gap:0.4rem">${actionCell}</div></td>` +
              `</tr>`
            );
          })
          .join('') +
        `</tbody></table></div>`;

      if (!Number(adLessonEditId?.value || 0)) {
        resetLessonForm(currentLessonsCourseId);
      }
    } catch (e) {
      lastCourseLessons = [];
      adLessonsList.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  function escLessonsModal(ev) {
    if (ev.key === 'Escape') closeLessonsModal();
  }

  function closeLessonsModal() {
    if (!adLessonsModal || adLessonsModal.classList.contains('hidden')) return;
    adLessonsModal.classList.add('hidden');
    adLessonsModal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', escLessonsModal);
    resetLessonForm(currentLessonsCourseId);
  }

  function openLessonsModal(courseId) {
    if (!adLessonsModal) return;
    currentLessonsCourseId = Number(courseId) || 0;
    adLessonsModal.classList.remove('hidden');
    adLessonsModal.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', escLessonsModal);
    resetLessonForm(currentLessonsCourseId);
    loadLessonsForCourse(currentLessonsCourseId);
  }

  adCat.addEventListener('click', async (ev) => {
    const lessonsBtn = ev.target.closest('.ad-course-row-lessons');
    if (lessonsBtn) {
      ev.preventDefault();
      const id = Number(lessonsBtn.dataset.courseId);
      if (id) openLessonsModal(id);
      return;
    }
    const editBtn = ev.target.closest('.ad-course-row-edit');
    if (editBtn) {
      ev.preventDefault();
      const id = Number(editBtn.dataset.courseId);
      if (id) await openEditForCourse(id);
      return;
    }
    const delBtn = ev.target.closest('.ad-course-row-delete');
    if (delBtn) {
      ev.preventDefault();
      const id = Number(delBtn.dataset.courseId);
      if (id) await deleteCourseById(id);
    }
  });

  ['#adLessonsModalClose', '#adLessonsModalBackdrop'].forEach((sel) => {
    const el = root.querySelector(sel);
    if (el) el.addEventListener('click', closeLessonsModal);
  });

  adLessonsList?.addEventListener('click', async (ev) => {
    const target = ev.target.closest('[data-action]');
    if (!target) return;
    const row = target.closest('tr[data-lesson-id]');
    if (!row) return;
    const lessonId = Number(row.dataset.lessonId);
    if (!lessonId) return;
    const action = target.dataset.action;

    if (action === 'open-quiz-questions') {
      ev.preventDefault();
      if (row.dataset.quizLocked === '1') {
        showAppAlert(getLockedQuizMessage(), 'error');
        return;
      }
      const quizId = Number(row.dataset.quizId);
      if (!quizId) {
        showAppAlert('Bài kiểm tra này chưa có quiz.', 'error');
        return;
      }
      window.location.href = `admin/quiz-edit.html?quizId=${encodeURIComponent(String(quizId))}&courseId=${encodeURIComponent(
        String(currentLessonsCourseId)
      )}`;
      return;
    }

    if (action === 'lesson-delete') {
      ev.preventDefault();
      if (row.dataset.quizLocked === '1') {
        showAppAlert(getLockedQuizMessage(), 'error');
        return;
      }
      showAppAlert('');
      try {
        await request(`courses/${currentLessonsCourseId}/lessons/${lessonId}`, { method: 'DELETE' });
        showAppAlert('Đã xoá bài học.', 'ok');
        resetLessonForm(currentLessonsCourseId);
        await loadAdminCatalog();
        await loadLessonsForCourse(currentLessonsCourseId);
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
      return;
    }

    if (action === 'lesson-edit') {
      ev.preventDefault();
      fillLessonFormForEdit(row);
    }
  });

  if (adLessonKind) {
    adLessonKind.addEventListener('change', () => setLessonKindUi(adLessonKind.value, false));
  }

  if (adLessonForm) {
    adLessonForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(adLessonForm);
      const courseId = Number(fd.get('courseId')) || currentLessonsCourseId;
      if (!courseId) return;
      const editingId = Number(fd.get('lessonId') || 0);
      const kind = String(fd.get('kind') || 'lesson').trim().toLowerCase();
      try {
        if (editingId) {
          const body = {
            title: String(fd.get('title') || '').trim(),
            contentUrl: String(fd.get('contentUrl') || '').trim(),
            orderIndex: Number(fd.get('orderIndex')),
            duration: Number(fd.get('duration')),
          };
          await request(`courses/${courseId}/lessons/${editingId}`, { method: 'PUT', body });
          showAppAlert('Đã cập nhật bài học.', 'ok');
        } else if (kind === 'quiz') {
          const quizTitle = String(fd.get('quizTitle') || '').trim();
          if (!quizTitle) {
            showAppAlert('Vui lòng nhập tên bài kiểm tra.', 'error');
            return;
          }
          await request(`courses/${courseId}/lessons`, {
            method: 'POST',
            body: {
              title: quizTitle,
              kind: 'QUIZ',
              contentUrl: '',
              duration: Number(fd.get('duration') || 15),
              orderIndex: Number(fd.get('orderIndex')),
            },
          });
          showAppAlert('Đã tạo bài kiểm tra. Chọn "Soạn câu hỏi" để nhập câu hỏi.', 'ok');
        } else {
          const body = {
            title: String(fd.get('title') || '').trim(),
            contentUrl: String(fd.get('contentUrl') || '').trim(),
            orderIndex: Number(fd.get('orderIndex')),
            duration: Number(fd.get('duration')),
          };
          await request(`courses/${courseId}/lessons`, { method: 'POST', body });
          showAppAlert('Đã thêm bài học.', 'ok');
        }
        resetLessonForm(courseId);
        await loadAdminCatalog();
        await loadLessonsForCourse(courseId);
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  adLessonCancelBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (Number(adLessonEditId?.value || 0)) {
      resetLessonForm(currentLessonsCourseId);
      return;
    }
    closeLessonsModal();
  });

  root.querySelector('#adBtnOpenCreate').addEventListener('click', () => {
    const form = root.querySelector('#adCourse');
    form.reset();
    const st = form.querySelector('[name="status"]');
    if (st) st.value = 'PUBLISHED';
    const at = form.querySelector('[name="accessTier"]');
    if (at) at.value = 'FREE';
    if (hid) hid.value = String(window.StudyAdmin.getUserId() ?? '');
    root.querySelector('#adCourseOut').hidden = true;
    openCreateCourseModal();
  });
  ['#adCourseModalClose', '#adCourseModalCancel', '#adCourseModalBackdrop'].forEach((sel) => {
    root.querySelector(sel).addEventListener('click', () => closeCreateCourseModal());
  });

  ['#adEditModalClose', '#adEditModalCancel', '#adEditModalBackdrop'].forEach((sel) => {
    root.querySelector(sel).addEventListener('click', () => closeEditModal());
  });

  root.querySelector('#adCourse').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      description: fd.get('description') || null,
      categoryId: Number(fd.get('categoryId')),
      level: fd.get('level') || null,
      coverImageUrl: fd.get('coverImageUrl') || null,
      language: fd.get('language') || null,
      status: fd.get('status') || 'PUBLISHED',
      accessTier: fd.get('accessTier') || 'FREE',
      createdByUserId: Number(fd.get('createdByUserId')),
    };
    const pre = root.querySelector('#adCourseOut');
    try {
      await request('courses', { method: 'POST', body });
      pre.hidden = true;
      pre.textContent = '';
      showAppAlert('Đã tạo khóa học.', 'ok');
      e.target.reset();
      const st = e.target.querySelector('[name="status"]');
      if (st) st.value = 'PUBLISHED';
      if (hid) hid.value = String(window.StudyAdmin.getUserId() ?? '');
      closeCreateCourseModal();
      await loadAdminCatalog();
    } catch (err) {
      pre.hidden = true;
      showAppAlert(err.message, 'error');
    }
  });

  root.querySelector('#adCourseEdit').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const fd = new FormData(e.target);
    const id = Number(root.querySelector('#adEditCourseId').value);
    if (!id) {
      showAppAlert('Chưa có thông tin khóa học.', 'error');
      return;
    }
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
      closeEditModal();
      await loadAdminCatalog();
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  root.querySelector('#adCatLoad').addEventListener('click', loadAdminCatalog);

  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFilter(), 120);
    });
  }

  if (hasCatUi) {
    catBtnOpenManager.addEventListener('click', async () => {
      openCatManager();
      await loadCatTable();
    });
    ['#catManagerBackdrop', '#catManagerClose'].forEach((sel) => {
      root.querySelector(sel).addEventListener('click', closeCatManager);
    });
    root.querySelector('#catBtnAdd').addEventListener('click', () => {
      catForm.reset();
      catEditId.value = '';
      openCatModal(false);
    });
    root.querySelector('#catBtnReload').addEventListener('click', loadCatTable);
    ['#catModalClose', '#catModalCancel', '#catModalBackdrop'].forEach((sel) => {
      root.querySelector(sel).addEventListener('click', closeCatModal);
    });
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(catForm);
      const body = { name: fd.get('name') };
      const id = catEditId.value.trim();
      try {
        if (id) {
          await request(`course-categories/${id}`, { method: 'PUT', body });
          showAppAlert('Đã cập nhật danh mục.', 'ok');
        } else {
          await request('course-categories', { method: 'POST', body });
          showAppAlert('Đã thêm danh mục.', 'ok');
        }
        closeCatModal();
        await afterCategoryMutation();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
    catWrap.addEventListener('click', async (ev) => {
      const editBtn = ev.target.closest('[data-cat-edit]');
      const delBtn = ev.target.closest('[data-cat-del]');
      if (editBtn) {
        const id = editBtn.dataset.catEdit;
        try {
          const list = await request('course-categories', { method: 'GET' });
          const c = Array.isArray(list) ? list.find((x) => String(x.id) === String(id)) : null;
          if (!c) {
            showAppAlert('Không tìm thấy danh mục.', 'error');
            return;
          }
          catEditId.value = String(c.id);
          catForm.querySelector('[name="name"]').value = c.name || '';
          openCatModal(true);
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
        return;
      }
      if (delBtn) {
        const id = delBtn.dataset.catDel;
        if (!id) return;
        showAppAlert('');
        try {
          await request(`course-categories/${id}`, { method: 'DELETE' });
          showAppAlert('Đã xoá danh mục.', 'ok');
          await afterCategoryMutation();
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      }
    });
  }

  (async function bootstrap() {
    try {
      await fetchCategoriesAndFillSelects();
    } catch (err) {
      showAppAlert('Không tải được danh sách danh mục. Kiểm tra API /course-categories.', 'error');
    }
    await loadAdminCatalog();
  })();
})();
