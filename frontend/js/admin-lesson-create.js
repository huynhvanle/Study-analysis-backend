(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  if (!window.StudyAdmin) return;
  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;

  const form = document.getElementById('adLessonCreateForm');
  const courseLabel = document.getElementById('adLessonCourseLabel');
  const backLink = document.getElementById('adLessonBackLink');
  const cancelBtn = document.getElementById('adLessonCancelBtn');
  const kindSel = document.getElementById('adLessonKind');
  const lessonFields = document.getElementById('adLessonFieldsLesson');
  const quizFields = document.getElementById('adLessonFieldsQuiz');
  const submitBtn = document.getElementById('adLessonSubmit');

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
  const QUIZ_LESSON_TITLE = 'Kiểm tra / luyện tập';

  function toCourseEditUrl() {
    return `admin/course-edit.html?courseId=${encodeURIComponent(String(courseId || ''))}`;
  }

  function setKindUi(kind) {
    const isQuiz = kind === 'quiz';
    if (lessonFields) lessonFields.classList.toggle('hidden', isQuiz);
    if (quizFields) quizFields.classList.toggle('hidden', !isQuiz);
    if (submitBtn) submitBtn.textContent = isQuiz ? 'Tạo bài kiểm tra' : 'Lưu bài học';

    // toggle required attributes
    const title = form?.querySelector?.('[name="title"]');
    const contentUrl = form?.querySelector?.('[name="contentUrl"]');
    const orderIndex = form?.querySelector?.('[name="orderIndex"]');
    const duration = form?.querySelector?.('[name="duration"]');
    const quizTitle = form?.querySelector?.('[name="quizTitle"]');
    if (title) title.required = !isQuiz;
    if (contentUrl) contentUrl.required = !isQuiz;
    if (orderIndex) orderIndex.required = !isQuiz;
    if (duration) duration.required = !isQuiz;
    if (quizTitle) quizTitle.required = isQuiz;
  }

  // New model: quiz is its OWN lesson (kind=QUIZ), no URL needed.

  async function loadCourseMeta() {
    if (backLink) backLink.href = courseId ? toCourseEditUrl() : 'admin/courses.html';
    if (cancelBtn) cancelBtn.addEventListener('click', () => (window.location.href = backLink.href));

    if (!courseId) {
      if (courseLabel) courseLabel.textContent = '#—';
      showAppAlert('Thiếu courseId trên URL. Hãy quay lại và mở lại từ trang khóa học.', 'error');
      return;
    }

    try {
      const c = await request(`courses/${courseId}`, { method: 'GET' });
      if (courseLabel) {
        const t = c?.title ? `#${courseId} — ${c.title}` : `#${courseId}`;
        courseLabel.innerHTML = escapeHtml(t);
      }
    } catch {
      if (courseLabel) courseLabel.textContent = `#${courseId}`;
    }

    try {
      const list = await request(`courses/${courseId}/lessons`, { method: 'GET' });
      const arr = Array.isArray(list) ? list : [];
      const nextOrder = arr.length ? Math.max(...arr.map((x) => Number(x.orderIndex) || 0)) + 1 : 1;
      const oi = form?.querySelector?.('[name="orderIndex"]');
      if (oi) oi.value = String(nextOrder);
    } catch {
      // ignore
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      if (!courseId) return;

      const fd = new FormData(form);
      const kind = String(fd.get('kind') || 'lesson');

      try {
        if (kind === 'quiz') {
          const quizTitle = String(fd.get('quizTitle') || '').trim();
          if (!quizTitle) {
            showAppAlert('Vui lòng nhập tên bài kiểm tra.', 'error');
            return;
          }
          // Create a QUIZ lesson; backend auto-creates 1 quiz with same title.
          const nextOrder = (function () {
            try {
              const oi = form?.querySelector?.('[name="orderIndex"]')?.value;
              const n = Number(oi);
              return Number.isFinite(n) && n > 0 ? n : 1;
            } catch {
              return 1;
            }
          })();

          const lesson = await request(`courses/${courseId}/lessons`, {
            method: 'POST',
            body: { title: quizTitle, kind: 'QUIZ', contentUrl: '', duration: 15, orderIndex: nextOrder },
          });
          showAppAlert('Đã tạo bài kiểm tra.', 'ok');
          window.location.href =
            toCourseEditUrl() +
            `&openQuiz=1&quizId=${encodeURIComponent(String(lesson?.quizId || ''))}&lessonId=${encodeURIComponent(
              String(lesson?.id || '')
            )}`;
          return;
        }

        const body = {
          title: String(fd.get('title') || '').trim(),
          contentUrl: String(fd.get('contentUrl') || '').trim(),
          orderIndex: Number(fd.get('orderIndex') || 1),
          duration: Number(fd.get('duration') || 15),
        };

        await request(`courses/${courseId}/lessons`, { method: 'POST', body });
        showAppAlert('Đã thêm bài học.', 'ok');
        window.location.href = toCourseEditUrl();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  if (kindSel) {
    kindSel.addEventListener('change', () => setKindUi(kindSel.value));
    setKindUi(kindSel.value);
  } else {
    setKindUi('lesson');
  }

  loadCourseMeta();
})();

