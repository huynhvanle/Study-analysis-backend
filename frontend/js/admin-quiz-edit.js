(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;
  if (!window.StudyAdmin) return;

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;

  const quizTitleEl = document.getElementById('adQuizTitle');
  const backLink = document.getElementById('adQuizBackLink');
  const form = document.getElementById('adQuestionForm');
  const listEl = document.getElementById('adQuestionsList');

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  const quizId = Number(getParam('quizId'));
  const courseId = Number(getParam('courseId'));

  if (backLink) {
    backLink.href = courseId
      ? `admin/course-edit.html?courseId=${encodeURIComponent(String(courseId))}&openQuiz=1`
      : 'admin/courses.html';
  }

  if (!quizId) {
    showAppAlert('Thiếu quizId trên URL. Ví dụ: admin/quiz-edit.html?quizId=1', 'error');
    if (listEl) listEl.innerHTML = '<p class="muted">Thiếu quizId.</p>';
    return;
  }
  async function loadQuizTitle() {
    // Không có endpoint GET /quizzes/{id}, nên lấy từ lesson quiz list bằng cách này:
    // best-effort: title sẽ được hiển thị bằng quizId nếu không lấy được.
    if (quizTitleEl) quizTitleEl.textContent = `#${quizId}`;
  }

  function renderQuestions(items) {
    if (!listEl) return;
    if (!Array.isArray(items) || !items.length) {
      listEl.innerHTML = '<p class="muted">Chưa có câu hỏi nào.</p>';
      return;
    }

    listEl.innerHTML =
      `<div class="table-wrap"><table><thead><tr><th>Thứ tự</th><th>Câu hỏi</th><th>Đáp án</th><th>Đúng</th><th></th></tr></thead><tbody>` +
      items
        .map((q) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const correct = opts.find((o) => o.correct);
          const optText = opts
            .map((o) => `<div><strong>${escapeHtml(o.code)}</strong>: ${escapeHtml(o.content || '')}</div>`)
            .join('');
          return (
            `<tr data-qid="${q.id}">` +
            `<td>${q.orderIndex ?? '—'}</td>` +
            `<td>${escapeHtml(q.prompt || '')}</td>` +
            `<td>${optText || '—'}</td>` +
            `<td>${correct ? escapeHtml(correct.code) : '—'}</td>` +
            `<td style="white-space:nowrap">` +
            `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-action="q-del" data-confirm="Bạn có chắc muốn xoá câu hỏi này không?">Xoá</button>` +
            `</td>` +
            `</tr>`
          );
        })
        .join('') +
      `</tbody></table></div>`;
  }

  async function loadQuestions() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="muted">Đang tải…</p>';
    try {
      const items = await request(`quizzes/${quizId}/questions`, { method: 'GET' });
      renderQuestions(items);
      // default next order index
      if (form) {
        const max = Array.isArray(items) && items.length ? Math.max(...items.map((x) => Number(x.orderIndex) || 0)) : 0;
        const oi = form.querySelector('[name="orderIndex"]');
        if (oi) oi.value = String(max + 1);
      }
    } catch (e) {
      listEl.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(form);
      const body = {
        prompt: fd.get('prompt'),
        orderIndex: Number(fd.get('orderIndex') || 1),
        optionA: fd.get('optionA'),
        optionB: fd.get('optionB'),
        optionC: fd.get('optionC'),
        optionD: fd.get('optionD'),
        correctCode: fd.get('correctCode'),
      };
      try {
        await request(`quizzes/${quizId}/questions`, { method: 'POST', body });
        showAppAlert('Đã thêm câu hỏi.', 'ok');
        form.reset();
        await loadQuestions();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  if (listEl) {
    listEl.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action="q-del"]');
      if (!btn) return;
      const row = ev.target.closest('tr[data-qid]');
      const qid = Number(row?.dataset?.qid);
      if (!qid) return;
      ev.preventDefault();
      showAppAlert('');
      try {
        await request(`quiz-questions/${qid}`, { method: 'DELETE' });
        showAppAlert('Đã xoá câu hỏi.', 'ok');
        await loadQuestions();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  loadQuizTitle();
  loadQuestions();
})();

