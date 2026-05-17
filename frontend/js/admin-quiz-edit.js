(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;
  if (!window.StudyAdmin) return;

  const { request, showAppAlert, escapeHtml } = window.StudyAdmin;

  const quizTitleEl = document.getElementById('adQuizTitle');
  const editLockNoticeEl = document.getElementById('adQuizEditLockNotice');
  const backLink = document.getElementById('adQuizBackLink');
  const form = document.getElementById('adQuestionForm');
  const importForm = document.getElementById('adImportForm');
  const importFileInput = document.getElementById('adImportFile');
  const importSubmitBtn = document.getElementById('adImportSubmit');
  const importResultEl = document.getElementById('adImportResult');
  const listEl = document.getElementById('adQuestionsList');
  let quizEditState = { editable: true, hasSubmittedResults: false };
  let isImportSubmitting = false;
  let currentQuestions = [];
  const importFieldLabels = {
    orderIndex: 'Thứ tự',
    prompt: 'Câu hỏi',
    explanation: 'Giải thích',
    optionA: 'Đáp án A',
    optionB: 'Đáp án B',
    optionC: 'Đáp án C',
    optionD: 'Đáp án D',
    correctCode: 'Đáp án đúng',
    header: 'Dòng tiêu đề',
    row: 'Dữ liệu',
    sheet: 'Sheet',
  };

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

  function getQuizLockedMessage() {
    return 'Quiz đã có kết quả làm bài nên không thể thêm, xoá hoặc import câu hỏi nữa.';
  }

  function setDisabledForForm(targetForm, disabled) {
    if (!targetForm) return;
    targetForm.querySelectorAll('input, textarea, select, button').forEach((el) => {
      el.disabled = !!disabled;
    });
  }

  function syncEditLockNotice() {
    if (!editLockNoticeEl) return;
    if (quizEditState.editable) {
      editLockNoticeEl.hidden = true;
      editLockNoticeEl.innerHTML = '';
      return;
    }
    editLockNoticeEl.hidden = false;
    editLockNoticeEl.className = 'banner error';
    editLockNoticeEl.textContent = getQuizLockedMessage();
  }

  function applyQuestionFormState() {
    setDisabledForForm(form, !quizEditState.editable);
  }

  function applyImportFormState() {
    if (!importForm) return;
    const disabled = !quizEditState.editable || isImportSubmitting;
    importForm.querySelectorAll('input, button').forEach((el) => {
      el.disabled = !!disabled;
    });
    if (importSubmitBtn) {
      if (!quizEditState.editable) {
        importSubmitBtn.textContent = 'Quiz đã khóa';
      } else {
        importSubmitBtn.textContent = isImportSubmitting ? 'Đang import...' : 'Import Excel';
      }
    }
  }

  function applyQuizEditState() {
    syncEditLockNotice();
    applyQuestionFormState();
    applyImportFormState();
    renderQuestions(currentQuestions);
  }

  async function loadQuizTitle() {
    // Không có endpoint GET /quizzes/{id}, nên lấy từ lesson quiz list bằng cách này:
    // best-effort: title sẽ được hiển thị bằng quizId nếu không lấy được.
    if (quizTitleEl) quizTitleEl.textContent = `#${quizId}`;
  }

  function renderImportResult(result) {
    if (!importResultEl) return;
    if (!result) {
      importResultEl.hidden = true;
      importResultEl.innerHTML = '';
      return;
    }

    const errors = Array.isArray(result.errors) ? result.errors : [];
    const hasErrors = errors.length > 0;
    const summaryText = hasErrors
      ? `Import chưa thành công cho file ${escapeHtml(result.fileName || 'Excel')}. Sửa các lỗi bên dưới rồi thử lại.`
      : `Đã import thành công ${Number(result.createdQuestions) || 0} câu hỏi từ file ${escapeHtml(result.fileName || 'Excel')}.`;
    const stats = [
      { label: 'Tổng dòng', value: Number(result.totalRows) || 0 },
      { label: 'Hợp lệ', value: Number(result.validRows) || 0 },
      { label: 'Đã tạo', value: Number(result.createdQuestions) || 0 },
    ];

    const errorsHtml = hasErrors
      ? `<div>
          <h4 class="admin-quiz-import-errors-title">Lỗi cần sửa</h4>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Cột</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                ${errors
                  .map((item) => {
                    const rowNumber = Number(item?.rowNumber);
                    const fieldKey = String(item?.field || '').trim();
                    const fieldLabel = importFieldLabels[fieldKey] || fieldKey || 'Trường';
                    return (
                      '<tr>' +
                      `<td>${Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber : '—'}</td>` +
                      `<td>${escapeHtml(fieldLabel)}</td>` +
                      `<td>${escapeHtml(item?.message || 'Dữ liệu không hợp lệ.')}</td>` +
                      '</tr>'
                    );
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>`
      : '';

    importResultEl.hidden = false;
    importResultEl.innerHTML =
      `<div class="banner ${hasErrors ? 'error' : 'ok'}" style="margin-bottom:0">${summaryText}</div>` +
      `<div class="admin-quiz-import-stats">` +
      stats
        .map(
          (item) =>
            `<div class="admin-quiz-import-stat">` +
            `<span class="admin-quiz-import-stat-label">${escapeHtml(item.label)}</span>` +
            `<strong class="admin-quiz-import-stat-value">${escapeHtml(item.value)}</strong>` +
            `</div>`
        )
        .join('') +
      `</div>` +
      errorsHtml;
  }

  function setImportSubmitting(isSubmitting) {
    isImportSubmitting = !!isSubmitting;
    applyImportFormState();
  }

  function renderQuestions(items) {
    if (!listEl) return;
    currentQuestions = Array.isArray(items) ? items : [];
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
            `<td>${escapeHtml(q.prompt || '')}${
              q.explanation ? `<div class="muted" style="margin-top:0.35rem;font-size:0.8rem">Giải thích: ${escapeHtml(q.explanation)}</div>` : ''
            }</td>` +
            `<td>${optText || '—'}</td>` +
            `<td>${correct ? escapeHtml(correct.code) : '—'}</td>` +
            `<td style="white-space:nowrap">` +
            (quizEditState.editable
              ? `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-action="q-del" data-confirm="Bạn có chắc muốn xoá câu hỏi này không?">Xoá</button>`
              : `<button type="button" class="btn btn-sm btn-ghost" disabled title="${escapeHtml(getQuizLockedMessage())}">Đã khóa</button>`) +
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

  async function loadQuizEditState() {
    if (courseId) {
      try {
        const lessons = await request(`courses/${courseId}/lessons`, { method: 'GET' });
        const matchedLesson = Array.isArray(lessons)
          ? lessons.find((item) => Number(item?.quizId) === quizId)
          : null;
        if (matchedLesson) {
          quizEditState = {
            editable: !matchedLesson?.hasQuizResults,
            hasSubmittedResults: !!matchedLesson?.hasQuizResults,
          };
          applyQuizEditState();
          return;
        }
      } catch {
        // Ignore and fall back to the dedicated endpoint below.
      }
    }

    try {
      const state = await request(`quizzes/${quizId}/edit-state`, { method: 'GET' });
      quizEditState = {
        editable: !!state?.editable,
        hasSubmittedResults: !!state?.hasSubmittedResults,
      };
    } catch {
      quizEditState = { editable: true, hasSubmittedResults: false };
    } finally {
      applyQuizEditState();
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      if (!quizEditState.editable) {
        showAppAlert(getQuizLockedMessage(), 'error');
        return;
      }
      const fd = new FormData(form);
      const body = {
        prompt: fd.get('prompt'),
        explanation: fd.get('explanation'),
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

  if (importFileInput) {
    importFileInput.addEventListener('change', () => {
      renderImportResult(null);
    });
  }

  if (importForm) {
    importForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      renderImportResult(null);
      if (!quizEditState.editable) {
        showAppAlert(getQuizLockedMessage(), 'error');
        return;
      }

      const file = importFileInput?.files?.[0];
      if (!file) {
        showAppAlert('Vui lòng chọn file .xlsx để import.', 'error');
        return;
      }

      const payload = new FormData();
      payload.append('file', file);
      setImportSubmitting(true);
      try {
        const result = await request(`quizzes/${quizId}/questions/import`, {
          method: 'POST',
          body: payload,
        });
        const errors = Array.isArray(result?.errors) ? result.errors : [];
        renderImportResult(result);
        if (errors.length) {
          showAppAlert(`Import chưa thành công. Có ${errors.length} lỗi trong file Excel cần sửa.`, 'error');
          return;
        }

        showAppAlert(`Đã import ${Number(result?.createdQuestions) || 0} câu hỏi từ file Excel.`, 'ok');
        importForm.reset();
        await loadQuestions();
      } catch (err) {
        renderImportResult(null);
        showAppAlert(err.message, 'error');
      } finally {
        setImportSubmitting(false);
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
      if (!quizEditState.editable) {
        showAppAlert(getQuizLockedMessage(), 'error');
        return;
      }
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
  loadQuizEditState();
  loadQuestions();
})();

