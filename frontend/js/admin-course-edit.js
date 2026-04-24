(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  // Nếu script lỗi runtime sớm, show ra banner để dễ debug.
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

  function shouldOpenQuizFromQuery() {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get('openQuiz') === '1';
    } catch {
      return false;
    }
  }

  const courseId = getCourseIdFromQuery();
  const form = document.getElementById('adCourseEditPage');
  const idEl = document.getElementById('adEditCourseIdPage');
  const catSel = document.getElementById('adEditCatPage');
  const lessonsMount = document.getElementById('adLessonsListPage');
  const lessonAddPageLink = document.getElementById('adLessonAddPageLink');
  const lessonModal = document.getElementById('adLessonModal');
  const lessonModalTitle = document.getElementById('adLessonModalTitle');
  const lessonForm = document.getElementById('adLessonFormPage');
  const lessonEditIdEl = document.getElementById('adLessonEditId');
  const lessonSubmitBtn = document.getElementById('adLessonSubmitBtn');
  const lessonCancelBtn = document.getElementById('adLessonEditCancel');
  // Legacy (gộp quiz vào 1 lesson đặc biệt) — sẽ bỏ dần.
  const quizModal = document.getElementById('adCourseQuizModal');
  const quizModalTitle = document.getElementById('adCourseQuizModalTitle');
  const quizList = document.getElementById('adCourseQuizList');
  const quizCreateForm = document.getElementById('adCourseQuizCreate');
  const quizResultForm = document.getElementById('adCourseQuizResult');

  // Guard: nếu thiếu element quan trọng thì báo luôn.
  const missing = [];
  if (!form) missing.push('#adCourseEditPage');
  if (!catSel) missing.push('#adEditCatPage');
  if (!lessonsMount) missing.push('#adLessonsListPage');
  if (!lessonModal) missing.push('#adLessonModal');
  if (!lessonForm) missing.push('#adLessonFormPage');
  if (!lessonCancelBtn) missing.push('#adLessonEditCancel');
  if (missing.length) {
    showAppAlert('Thiếu phần tử UI: ' + missing.join(', '), 'error');
    return;
  }

  if (lessonAddPageLink) {
    lessonAddPageLink.href = `admin/lesson-create.html?courseId=${encodeURIComponent(String(courseId || ''))}`;
    lessonAddPageLink.addEventListener('click', (ev) => {
      if (!courseId) {
        ev.preventDefault();
        showAppAlert('Thiếu courseId trên URL.', 'error');
      }
    });
  }

  let lastLessons = [];

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

  function fillCourseForm(c) {
    if (idEl) idEl.value = String(c.id);
    form.querySelector('[name="title"]').value = c.title || '';
    form.querySelector('[name="description"]').value = c.description || '';
    form.querySelector('[name="level"]').value = c.level || '';
    form.querySelector('[name="coverImageUrl"]').value = c.coverImageUrl || '';
    form.querySelector('[name="language"]').value = c.language || '';
    const st = form.querySelector('[name="status"]');
    if (c.status && st.querySelector(`option[value="${c.status}"]`)) {
      st.value = c.status;
    }
  }

  async function loadLessons() {
    lessonsMount.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const list = await request(`courses/${courseId}/lessons`, { method: 'GET' });
      lastLessons = Array.isArray(list) ? list : [];
      if (!lastLessons.length) {
        lessonsMount.innerHTML = '<p class="muted">Chưa có bài học.</p>';
        quizLessonId = 0;
        quizLessonOrderIndex = 0;
        return;
      }

      lessonsMount.innerHTML =
        `<div class="table-wrap"><table><thead><tr><th>Thứ tự</th><th>Tiêu đề</th><th>Phút</th><th>URL</th><th></th></tr></thead><tbody>` +
        lastLessons
          .map((l) => {
            const kind = String(l.kind || 'VIDEO').toUpperCase();
            const isQuizLesson = kind === 'QUIZ';
            const u = l.contentUrl ? String(l.contentUrl) : '';
            const short = u.length > 70 ? `${u.slice(0, 68)}…` : u;
            const actionCell =
              (isQuizLesson
                ? `<button type="button" class="btn btn-sm btn-ghost" data-action="open-quiz-questions">Soạn câu hỏi</button>`
                : '') +
              `<button type="button" class="btn btn-sm btn-ghost" data-action="lesson-edit">Sửa</button>` +
              `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-action="lesson-delete" data-confirm="Bạn có chắc muốn xoá bài học #${l.id} không? Quiz/tiến độ liên quan cũng sẽ bị xoá.">Xoá</button>`;
            return (
              `<tr data-lesson-id="${l.id}"` +
              ` data-title="${escapeHtml(l.title || '')}"` +
              ` data-content-url="${escapeHtml(u)}"` +
              ` data-order-index="${Number(l.orderIndex) || 1}"` +
              ` data-duration="${Number(l.duration) || 15}">` +
              ` data-kind="${escapeHtml(kind)}"` +
              ` data-quiz-id="${Number(l.quizId) || 0}">` +
              `<td>${l.orderIndex}</td>` +
              `<td>${escapeHtml(l.title)}${isQuizLesson ? `<div class="muted" style="margin-top:0.25rem;font-size:0.78rem">Bài kiểm tra</div>` : ''}</td>` +
              `<td>${l.duration}</td>` +
              `<td>${isQuizLesson ? '<span class="muted">—</span>' : `<code style="font-size:0.75rem">${escapeHtml(short || '—')}</code>`}</td>` +
              `<td><div class="row" style="justify-content:flex-end;gap:0.4rem">${actionCell}</div></td>` +
              `</tr>`
            );
          })
          .join('') +
        `</tbody></table></div>`;
    } catch (e) {
      lessonsMount.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  function nextLessonOrderIndexFromCache() {
    const max = lastLessons.length ? Math.max(...lastLessons.map((x) => Number(x.orderIndex) || 0)) : 0;
    return max + 1;
  }

  function openLessonModal(title) {
    if (!lessonModal) return;
    // Debug friendly: confirm handler reached
    try {
      showAppAlert('', '');
    } catch {
      /* ignore */
    }
    if (lessonModalTitle) lessonModalTitle.textContent = title;
    lessonModal.classList.remove('hidden');
    lessonModal.setAttribute('aria-hidden', 'false');
    // Force visibility in case inline styles override CSS.
    lessonModal.style.display = 'flex';
    lessonModal.style.visibility = 'visible';
    lessonModal.style.opacity = '1';
    lessonModal.style.pointerEvents = 'auto';
  }

  function closeLessonModal() {
    if (!lessonModal) return;
    lessonModal.classList.add('hidden');
    lessonModal.setAttribute('aria-hidden', 'true');
    lessonModal.style.display = 'none';
  }

  async function nextLessonOrderIndex() {
    // giữ lại để tương thích, nhưng ưu tiên dùng cache cho UX nhanh
    return nextLessonOrderIndexFromCache() || 1;
  }

  function resetLessonFormToCreate(nextOrderIndex) {
    if (!lessonForm) return;
    lessonForm.reset();
    if (lessonEditIdEl) lessonEditIdEl.value = '';
    if (lessonSubmitBtn) lessonSubmitBtn.textContent = 'Lưu';
    const oi = lessonForm.querySelector('[name="orderIndex"]');
    if (oi) oi.value = String(nextOrderIndex || 1);
  }

  function fillLessonFormForEdit(l) {
    if (!lessonForm) return;
    lessonForm.querySelector('[name="title"]').value = l.title || '';
    lessonForm.querySelector('[name="contentUrl"]').value = l.contentUrl || '';
    lessonForm.querySelector('[name="orderIndex"]').value = String(l.orderIndex ?? 1);
    lessonForm.querySelector('[name="duration"]').value = String(l.duration ?? 15);
    if (lessonEditIdEl) lessonEditIdEl.value = String(l.id);
    if (lessonSubmitBtn) lessonSubmitBtn.textContent = 'Lưu thay đổi';
  }

  function openCreateLesson() {
    const next = nextLessonOrderIndexFromCache();
    resetLessonFormToCreate(next);
    openLessonModal('Thêm bài học');
  }

  function openEditLesson(lessonId, row) {
    const l = {
      id: Number(lessonId) || 0,
      title: row?.dataset?.title || '',
      contentUrl: row?.dataset?.contentUrl || '',
      orderIndex: Number(row?.dataset?.orderIndex) || 1,
      duration: Number(row?.dataset?.duration) || 15,
    };
    if (!l.id) return;
    fillLessonFormForEdit(l);
    openLessonModal('Sửa bài học');
  }

  if (lessonsMount) {
    lessonsMount.addEventListener('click', async (ev) => {
      const row = ev.target.closest('tr[data-lesson-id]');
      if (!row) return;
      const lessonId = Number(row.dataset.lessonId);
      if (!lessonId) return;
      const act = ev.target.closest('[data-action]')?.dataset?.action;
      if (!act) return;

      if (act === 'open-quiz-questions') {
        ev.preventDefault();
        const quizId = Number(row.dataset.quizId);
        if (!quizId) {
          showAppAlert('Bài kiểm tra này chưa có quiz.', 'error');
          return;
        }
        window.location.href = `admin/quiz-edit.html?quizId=${encodeURIComponent(String(quizId))}&courseId=${encodeURIComponent(
          String(courseId)
        )}`;
        return;
      }

      if (act === 'lesson-delete') {
        ev.preventDefault();
        showAppAlert('');
        try {
          await request(`courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' });
          showAppAlert('Đã xoá bài học.', 'ok');
          await loadLessons();
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
        return;
      }

      if (act === 'lesson-edit') {
        ev.preventDefault();
        openEditLesson(lessonId, row);
      }
    });
  }

  // Legacy helpers kept for compatibility with older HTML that still contains quiz modal.
  async function loadQuizzesForCourse() {
    if (quizList) quizList.innerHTML = '<p class="muted">Tính năng cũ đã được thay thế. Mỗi bài kiểm tra sẽ là một bài riêng trong danh sách bài học.</p>';
  }

  function escQuizModal(ev) {
    if (ev.key === 'Escape') closeQuizModal();
  }

  function closeQuizModal() {
    if (!quizModal || quizModal.classList.contains('hidden')) return;
    quizModal.classList.add('hidden');
    quizModal.setAttribute('aria-hidden', 'true');
    quizModal.style.display = 'none';
    document.removeEventListener('keydown', escQuizModal);
  }

  function openQuizModal() {
    if (!quizModal) return;
    if (quizModalTitle) {
      quizModalTitle.textContent = 'Bài kiểm tra';
    }
    quizModal.classList.remove('hidden');
    quizModal.setAttribute('aria-hidden', 'false');
    // Force visibility in case CSS/inline overrides.
    quizModal.style.display = 'flex';
    quizModal.style.visibility = 'visible';
    quizModal.style.opacity = '1';
    quizModal.style.pointerEvents = 'auto';
    document.addEventListener('keydown', escQuizModal);
    loadQuizzesForCourse();
  }

  ['#adCourseQuizModalClose', '#adCourseQuizModalBackdrop'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('click', closeQuizModal);
  });

  // Quiz được mở từ dòng "Kiểm tra / luyện tập" trong bảng bài học.

  async function bootstrap() {
    if (!courseId) {
      showAppAlert('Thiếu courseId trên URL. Ví dụ: admin/course-edit.html?courseId=1', 'error');
      root.querySelector('#adCourseEditPage')?.setAttribute('aria-disabled', 'true');
      return;
    }
    showAppAlert('');
    try {
      const c = await request(`courses/management/${courseId}`, { method: 'GET' });
      await loadCategoriesAndFillSelect(c.categoryId);
      fillCourseForm(c);
      await loadLessons();
      if (shouldOpenQuizFromQuery()) {
        // Prefer jumping straight to the quiz editor when quizId is provided.
        try {
          const u = new URL(window.location.href);
          const qid = Number(u.searchParams.get('quizId'));
          if (qid) {
            window.location.href = `admin/quiz-edit.html?quizId=${encodeURIComponent(String(qid))}&courseId=${encodeURIComponent(
              String(courseId)
            )}`;
            return;
          }
        } catch {
          // ignore
        }
        openQuizModal();
      }
    } catch (e) {
      showAppAlert(e.message, 'error');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const id = Number(idEl.value);
    if (!id) {
      showAppAlert('Thiếu ID khóa học.', 'error');
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
    };
    try {
      await request(`courses/${id}`, { method: 'PUT', body });
      showAppAlert('Đã cập nhật khóa học.', 'ok');
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  lessonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const fd = new FormData(lessonForm);
    const editingId = lessonEditIdEl && lessonEditIdEl.value ? Number(lessonEditIdEl.value) : 0;
    const body = {
      title: fd.get('title'),
      contentUrl: fd.get('contentUrl'),
      orderIndex: Number(fd.get('orderIndex')),
      duration: Number(fd.get('duration')),
    };
    try {
      if (editingId) {
        await request(`courses/${courseId}/lessons/${editingId}`, { method: 'PUT', body });
        showAppAlert('Đã cập nhật bài học.', 'ok');
      } else {
        await request(`courses/${courseId}/lessons`, { method: 'POST', body });
        showAppAlert('Đã thêm bài học.', 'ok');
      }
      closeLessonModal();
      await loadLessons();
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  ['#adLessonModalClose', '#adLessonModalBackdrop'].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('click', closeLessonModal);
  });

  if (lessonCancelBtn) {
    lessonCancelBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      closeLessonModal();
    });
  }

  // legacy create-form removed; quiz is created when creating a QUIZ lesson.

  if (quizResultForm) {
    quizResultForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(quizResultForm);
      try {
        await request('quiz-results', {
          method: 'POST',
          body: {
            userId: Number(fd.get('userId')),
            quizId: Number(fd.get('quizId')),
            score: Number(fd.get('score')),
          },
        });
        showAppAlert('Đã lưu điểm.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  // legacy list handler removed

  bootstrap();
})();

