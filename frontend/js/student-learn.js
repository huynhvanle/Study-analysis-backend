(function () {
  'use strict';

  if (document.body.dataset.appShell !== 'student-learn') return;
  const app = window.StudyApp;
  if (!app) return;

  const { request, state, isAuthenticated, showAppAlert, escapeHtml, lessonPlayerHtml } = app;

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  const courseId = Number(getParam('courseId'));
  const initialLessonId = Number(getParam('lessonId'));

  const courseTitleEl = document.getElementById('learnCourseTitle');
  const courseSubEl = document.getElementById('learnCourseSub');
  const listEl = document.getElementById('learnLessonList');
  const lessonTitleEl = document.getElementById('learnLessonTitle');
  const playerEl = document.getElementById('learnPlayer');
  const btnDone = document.getElementById('btnMarkDone');
  const backBtn = document.getElementById('btnBackToClassroom');

  let activeCourse = null;
  let activeLesson = null;
  let studySession = null;

  const STUDY_LOG_MIN_MS = 15000;

  function getApiRoot() {
    const meta = document.querySelector('meta[name="api-root"]');
    const raw = meta?.getAttribute('content')?.trim() ?? '';
    return raw.replace(/\/$/, '');
  }

  function buildApiUrl(path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    const root = getApiRoot();
    if (!root) return cleanPath;
    if (/^https?:\/\//i.test(root)) return `${root}/${cleanPath}`;
    const prefix = root.startsWith('/') ? root : `/${root}`;
    return `${prefix}/${cleanPath}`;
  }

  function beginStudySession(lesson, mode, extra) {
    if (!lesson || !lesson.lessonId || !state.userId) {
      studySession = null;
      return;
    }
    const now = Date.now();
    studySession = {
      mode: mode || 'lesson',
      lessonId: Number(lesson.lessonId),
      quizId: extra?.quizId != null ? Number(extra.quizId) : null,
      activeMs: 0,
      lastVisibleAt: document.visibilityState === 'hidden' ? null : now,
    };
  }

  function snapshotStudySessionMs(session) {
    if (!session) return 0;
    let activeMs = Number(session.activeMs) || 0;
    if (session.lastVisibleAt != null) {
      activeMs += Math.max(0, Date.now() - session.lastVisibleAt);
    }
    return activeMs;
  }

  function pauseStudySession() {
    if (!studySession || studySession.lastVisibleAt == null) return;
    studySession.activeMs = snapshotStudySessionMs(studySession);
    studySession.lastVisibleAt = null;
  }

  function resumeStudySession() {
    if (!studySession || studySession.lastVisibleAt != null) return;
    studySession.lastVisibleAt = Date.now();
  }

  function buildStudyLogBody(session, options) {
    if (!session || !state.userId || !session.lessonId) return null;
    const opts = options || {};
    if (session.mode === 'quiz' && opts.score == null) return null;

    const elapsedMs = snapshotStudySessionMs(session);
    if (elapsedMs < STUDY_LOG_MIN_MS && !opts.forceMinimumMinute) {
      return null;
    }

    const body = {
      userId: Number(state.userId),
      lessonId: Number(session.lessonId),
      timeSpent: Math.max(1, Math.round(elapsedMs / 60000)),
    };
    if (opts.score != null && Number.isFinite(Number(opts.score))) {
      body.score = Number(opts.score);
    }
    return body;
  }

  function sendStudyLogKeepalive(body) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
      }
      fetch(buildApiUrl('study-logs'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  async function flushStudySession(options) {
    if (!studySession) return;
    const currentSession = studySession;
    studySession = null;
    const body = buildStudyLogBody(currentSession, options);
    if (!body) return;

    if (options?.keepalive) {
      sendStudyLogKeepalive(body);
      return;
    }

    try {
      await request('study-logs', { method: 'POST', body });
    } catch {
      /* keep study log failure silent for learning flow */
    }
  }

  async function switchToLesson(lesson, options) {
    const opts = options || {};
    const currentLessonId = Number(activeLesson?.lessonId || 0);
    const nextLessonId = Number(lesson?.lessonId || 0);
    if (!opts.force && currentLessonId && nextLessonId && currentLessonId === nextLessonId) {
      return;
    }
    if (!opts.skipFlush) {
      await flushStudySession();
    }
    renderLesson(lesson);
  }

  function updateDoneButton(lesson) {
    if (!btnDone) return;
    if (!lesson) {
      btnDone.disabled = true;
      btnDone.textContent = 'Đánh dấu hoàn thành';
      btnDone.style.display = 'none';
      return;
    }
    const completed = !!lesson.completed;
    // Quiz: submit already marks done, so hide the button as well.
    btnDone.style.display = completed ? 'none' : '';
    btnDone.disabled = completed;
    btnDone.textContent = completed ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành';
  }

  function renderLessonList(lessons) {
    if (!listEl) return;
    if (!Array.isArray(lessons) || lessons.length === 0) {
      listEl.innerHTML = '<p class="muted" style="margin:0.75rem">Chưa có bài học.</p>';
      return;
    }
    listEl.innerHTML = lessons
      .map((l) => {
        const lid = Number(l.lessonId);
        const kind = String(l.kind || '').toUpperCase();
        const isQuiz = kind === 'QUIZ' || (Number(l.quizCount) > 0 && String(l.contentUrl || '').startsWith('about:blank'));
        const locked = !l.unlocked;
        const done = !!l.completed;
        const pill = locked
          ? `<span class="learn-pill locked">Khoá</span>`
          : done
            ? `<span class="learn-pill done">Xong</span>`
            : `<span class="learn-pill">${isQuiz ? 'Quiz' : 'Video'}</span>`;
        return `
          <button type="button" class="learn-lesson-item ${activeLesson && activeLesson.lessonId === lid ? 'active' : ''}"
            data-lesson-id="${lid}" ${locked ? 'disabled' : ''} title="${locked ? 'Hoàn thành bài trước để mở khóa' : ''}">
            <div>
              <div class="learn-lesson-item-title">${escapeHtml(l.orderIndex)}. ${escapeHtml(l.title || '')}</div>
              <div class="learn-lesson-item-meta">${escapeHtml(l.durationMinutes ?? '—')} phút · Quiz: ${escapeHtml(
          l.quizCount ?? 0
        )}</div>
            </div>
            <div>${pill}</div>
          </button>
        `;
      })
      .join('');
  }

  function renderLesson(lesson) {
    activeLesson = lesson;
    if (lessonTitleEl) lessonTitleEl.textContent = lesson?.title || '—';
    updateDoneButton(lesson);
    if (!playerEl) return;

    if (!lesson) {
      playerEl.innerHTML = '<p class="muted" style="margin:0">Chọn một bài ở danh sách bên trái.</p>';
      return;
    }

    const kind = String(lesson.kind || '').toUpperCase();
    const isQuiz =
      kind === 'QUIZ' || (Number(lesson.quizCount) > 0 && String(lesson.contentUrl || '').startsWith('about:blank'));
    if (isQuiz) {
      renderQuizLesson(lesson);
      return;
    }

    playerEl.innerHTML = lessonPlayerHtml(lesson.contentUrl || '') || '<p class="muted" style="margin:0">Chưa có URL nội dung.</p>';
    beginStudySession(lesson, 'lesson');
  }

  async function renderQuizLesson(lesson) {
    if (!playerEl) return;
    playerEl.innerHTML = '<p class="muted" style="margin:0">Đang tải quiz…</p>';
    try {
      const quizzes = await request(`lessons/${lesson.lessonId}/quizzes`, { method: 'GET' });
      if (!Array.isArray(quizzes) || quizzes.length === 0) {
        playerEl.innerHTML = '<div class="card"><p class="muted" style="margin:0">Bài quiz này chưa có quiz.</p></div>';
        return;
      }
      const quiz = quizzes[0]; // hệ thống hiện đang dùng 1 quiz / 1 lesson QUIZ
      const quizId = Number(quiz.id);
      if (!quizId) throw new Error('QuizId không hợp lệ.');

      function reviewDetailsHtml(results) {
        if (!Array.isArray(results) || !results.length) return '';
        return (
          `<div style="display:grid; gap:0.85rem; margin-top:0.9rem">` +
          results
            .map((item, idx) => {
              const chosen = item?.chosenOptionCode
                ? `<strong>${escapeHtml(item.chosenOptionCode)}</strong>: ${escapeHtml(item.chosenOptionContent || '')}`
                : '<span class="muted">Bạn chưa chọn đáp án cho câu này.</span>';
              const correct = item?.correctOptionCode
                ? `<strong>${escapeHtml(item.correctOptionCode)}</strong>: ${escapeHtml(item.correctOptionContent || '')}`
                : '<span class="muted">Chưa có đáp án đúng được cấu hình.</span>';
              const explanation = item?.explanation
                ? `<div style="margin-top:0.55rem; padding:0.65rem 0.75rem; border-radius:12px; background:#f8fafc; border:1px solid var(--border)"><div class="muted" style="font-size:0.78rem; margin-bottom:0.2rem">Giải thích</div>${escapeHtml(item.explanation)}</div>`
                : '';
              return `
                <div class="card" style="margin:0">
                  <div class="row" style="justify-content:space-between; align-items:flex-start; gap:0.75rem; flex-wrap:wrap">
                    <div>
                      <div class="muted" style="font-size:0.8rem; margin-bottom:0.2rem">Câu ${idx + 1}</div>
                      <div style="font-weight:650">${escapeHtml(item?.prompt || '')}</div>
                    </div>
                    <span class="learn-pill ${item?.correct ? 'done' : 'locked'}">${item?.correct ? 'Đúng' : 'Sai'}</span>
                  </div>
                  <div style="margin-top:0.7rem; display:grid; gap:0.45rem">
                    <div><span class="muted">Bạn chọn:</span> ${chosen}</div>
                    <div><span class="muted">Đáp án đúng:</span> ${correct}</div>
                  </div>
                  ${explanation}
                </div>
              `;
            })
            .join('') +
          `</div>`
        );
      }

      function scoreOnlyHtml(score, noteHtml) {
        return `
          <div class="card">
            <div class="muted" style="font-size:0.82rem">Quiz</div>
            <div style="font-family:var(--font-display); font-weight:800; font-size:1.05rem">${escapeHtml(quiz.title || `#${quizId}`)}</div>
            <p class="muted" style="margin:0.65rem 0 0">Bạn đã nộp quiz này rồi (chỉ được làm 1 lần).</p>
            <div style="margin-top:0.9rem; display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap">
              <div>
                <div class="muted" style="font-size:0.82rem">Điểm gần nhất</div>
                <div style="font-family:var(--font-display); font-weight:850; font-size:1.15rem">${
                  Number.isFinite(score) ? score.toFixed(1) : '—'
                } / 100</div>
              </div>
            </div>
            ${noteHtml || ''}
          </div>
        `;
      }

      function reviewHtml(review, fallbackScore) {
        const score = review?.score != null ? Number(review.score) : fallbackScore;
        const counts =
          review?.detailsAvailable && review?.correctAnswers != null && review?.totalQuestions != null
            ? `<div class="muted" style="font-size:0.9rem">Đúng: <strong>${review.correctAnswers}</strong> / ${review.totalQuestions}</div>`
            : '';
        const note = review?.detailsAvailable
          ? ''
          : `<p class="muted" style="margin:0.75rem 0 0">Bài làm này chưa có dữ liệu đáp án chi tiết để xem lại.</p>`;
        return `
          <div class="card">
            <div class="muted" style="font-size:0.82rem">Quiz</div>
            <div style="font-family:var(--font-display); font-weight:800; font-size:1.05rem">${escapeHtml(quiz.title || `#${quizId}`)}</div>
            <p class="muted" style="margin:0.65rem 0 0">Bạn đã nộp quiz này rồi (chỉ được làm 1 lần).</p>
            <div style="margin-top:0.9rem; display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap">
              <div>
                <div class="muted" style="font-size:0.82rem">Điểm gần nhất</div>
                <div style="font-family:var(--font-display); font-weight:850; font-size:1.15rem">${
                  Number.isFinite(score) ? score.toFixed(1) : '—'
                } / 100</div>
              </div>
              ${counts}
            </div>
            ${note}
          </div>
          ${review?.detailsAvailable ? reviewDetailsHtml(review.results) : ''}
        `;
      }

      // If already submitted, show locked state + latest score.
      try {
        const latest = await request(`quizzes/${quizId}/users/${state.userId}/latest-score`, { method: 'GET' });
        if (latest != null) {
          const score = Number(latest);
          // Already submitted => completed => hide "mark done"
          lesson.completed = true;
          if (activeLesson && Number(activeLesson.lessonId) === Number(lesson.lessonId)) activeLesson.completed = true;
          updateDoneButton(lesson);
          try {
            const review = await request(`quizzes/${quizId}/users/${state.userId}/review`, { method: 'GET' });
            if (review?.reviewAllowed) {
              playerEl.innerHTML = reviewHtml(review, score);
            } else {
              playerEl.innerHTML = scoreOnlyHtml(
                score,
                '<p class="muted" style="margin:0.75rem 0 0">Nâng cấp lên <strong>StudyHub Plus</strong> để xem đáp án đúng, đáp án bạn đã chọn và giải thích chi tiết sau khi làm quiz.</p>'
              );
            }
          } catch {
            playerEl.innerHTML = scoreOnlyHtml(
              score,
              '<p class="muted" style="margin:0.75rem 0 0">Nâng cấp lên <strong>StudyHub Plus</strong> để xem đáp án đúng, đáp án bạn đã chọn và giải thích chi tiết sau khi làm quiz.</p>'
            );
          }
          return;
        }
      } catch {
        // ignore: endpoint optional / older backend
      }

      const questions = await request(`quizzes/${quizId}/take`, { method: 'GET' });
      if (!Array.isArray(questions) || questions.length === 0) {
        playerEl.innerHTML =
          '<div class="card"><p class="muted" style="margin:0">Quiz chưa có câu hỏi. Hãy nhờ admin soạn câu hỏi.</p></div>';
        return;
      }

      const qHtml = questions
        .map((q, idx) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const optHtml = opts
            .map(
              (o) => `
              <label data-q="${q.id}" data-opt="${o.id}" style="display:flex; gap:0.55rem; align-items:flex-start; padding:0.5rem 0.55rem; border:1px solid var(--border); border-radius:12px; background:#fff; cursor:pointer">
                <input type="radio" name="q_${q.id}" value="${o.id}" style="margin-top:0.15rem" required />
                <span style="min-width:0">
                  <strong style="display:inline-block; width:1.6rem">${escapeHtml(o.code || '')}</strong>
                  <span>${escapeHtml(o.content || '')}</span>
                </span>
              </label>
            `
            )
            .join('');
          return `
            <div class="card" style="margin:0 0 0.85rem">
              <div class="muted" style="font-size:0.8rem; margin-bottom:0.25rem">Câu ${idx + 1}</div>
              <div style="font-weight:650; margin-bottom:0.65rem">${escapeHtml(q.prompt || '')}</div>
              <div style="display:grid; gap:0.55rem">${optHtml}</div>
            </div>
          `;
        })
        .join('');

      playerEl.innerHTML = `
        <div class="card" style="margin-bottom:0.9rem">
          <div class="row" style="justify-content:space-between; align-items:flex-start; gap:0.75rem; flex-wrap:wrap">
            <div>
              <div class="muted" style="font-size:0.82rem">Quiz</div>
              <div style="font-family:var(--font-display); font-weight:800; font-size:1.05rem">${escapeHtml(
                quiz.title || `#${quizId}`
              )}</div>
            </div>
            <div class="muted" style="font-size:0.82rem">Chọn 1 đáp án cho mỗi câu.</div>
          </div>
        </div>
        <form id="stuQuizTakeForm" data-quiz-id="${quizId}">
          ${qHtml}
          <div class="row" style="justify-content:flex-end; gap:0.6rem">
            <button type="submit" class="btn btn-primary">Nộp bài</button>
          </div>
        </form>
        <div id="stuQuizResult" class="card hidden" style="margin-top:0.9rem"></div>
      `;
      beginStudySession(lesson, 'quiz', { quizId });

      const form = playerEl.querySelector('#stuQuizTakeForm');
      const resultEl = playerEl.querySelector('#stuQuizResult');
      const submitBtn = form.querySelector('button[type="submit"]');

      function lockQuizUi() {
        form.querySelectorAll('input[type="radio"]').forEach((i) => (i.disabled = true));
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Đã nộp';
        }
      }

      function paintAnswers(results) {
        if (!Array.isArray(results)) return;
        // remove old marks
        form.querySelectorAll('[data-opt]').forEach((el) => {
          el.style.borderColor = 'var(--border)';
          el.style.background = '#fff';
          el.style.color = '';
        });

        const byQuestion = new Map(results.map((r) => [Number(r.questionId), r]));
        questions.forEach((q) => {
          const r = byQuestion.get(Number(q.id));
          if (!r) return;
          const chosenId = Number(r.chosenOptionId || 0);
          const correctId = Number(r.correctOptionId || 0);
          if (correctId) {
            const correctEl = form.querySelector(`[data-q="${q.id}"][data-opt="${correctId}"]`);
            if (correctEl) {
              correctEl.style.borderColor = 'var(--green)';
              correctEl.style.background = 'var(--green-soft)';
            }
          }
          if (chosenId && chosenId !== correctId) {
            const chosenEl = form.querySelector(`[data-q="${q.id}"][data-opt="${chosenId}"]`);
            if (chosenEl) {
              chosenEl.style.borderColor = 'var(--danger)';
              chosenEl.style.background = 'var(--danger-soft)';
            }
          }
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAppAlert('');
        if (submitBtn?.disabled) return;
        const answers = questions.map((q) => {
          const chosen = form.querySelector(`input[name="q_${q.id}"]:checked`);
          return { questionId: Number(q.id), optionId: Number(chosen?.value) };
        });
        try {
          const resp = await request(`quizzes/${quizId}/submit`, {
            method: 'POST',
            body: { userId: state.userId, answers },
          });
          await flushStudySession({
            score: resp?.score,
            forceMinimumMinute: true,
          });
          lockQuizUi();
          if (resp?.reviewAllowed && resp?.detailsAvailable) {
            paintAnswers(resp?.results);
          }
          if (resultEl) {
            resultEl.classList.remove('hidden');
            const score = resp?.score != null ? Number(resp.score) : NaN;
            if (resp?.reviewAllowed && resp?.detailsAvailable) {
              resultEl.innerHTML =
                `<div style="display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap">
                  <div>
                    <div class="muted" style="font-size:0.82rem">Kết quả</div>
                    <div style="font-family:var(--font-display); font-weight:850; font-size:1.15rem">${
                      Number.isFinite(score) ? score.toFixed(1) : '—'
                    } / 100</div>
                  </div>
                  <div class="muted" style="font-size:0.9rem">
                    Đúng: <strong>${resp?.correctAnswers ?? 0}</strong> / ${resp?.totalQuestions ?? questions.length}
                  </div>
                </div>` + reviewDetailsHtml(resp?.results);
            } else {
              resultEl.innerHTML = `
                <div style="display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap">
                  <div>
                    <div class="muted" style="font-size:0.82rem">Kết quả</div>
                    <div style="font-family:var(--font-display); font-weight:850; font-size:1.15rem">${
                      Number.isFinite(score) ? score.toFixed(1) : '—'
                    } / 100</div>
                  </div>
                </div>
                <p class="muted" style="margin:0.75rem 0 0">Tài khoản hiện tại chỉ xem được điểm. Nâng cấp lên <strong>StudyHub Plus</strong> để xem đáp án đúng, đáp án bạn đã chọn và giải thích chi tiết.</p>
              `;
            }
          }

          // Quiz: nộp bài xong thì tự đánh dấu hoàn thành lesson.
          try {
            await request('progress', {
              method: 'PUT',
              body: { userId: state.userId, lessonId: Number(lesson.lessonId), completed: true },
            });
            // cập nhật state local để sidebar hiện "Xong" ngay
            if (activeCourse && Array.isArray(activeCourse.lessons)) {
              const it = activeCourse.lessons.find((x) => Number(x.lessonId) === Number(lesson.lessonId));
              if (it) it.completed = true;
            }
            if (activeLesson && Number(activeLesson.lessonId) === Number(lesson.lessonId)) {
              activeLesson.completed = true;
            }
            updateDoneButton(lesson);
            renderLessonList(Array.isArray(activeCourse?.lessons) ? activeCourse.lessons : []);
          } catch {
            // ignore progress failures (quiz submit already done)
          }

          showAppAlert('Đã nộp bài.', 'ok');
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      });
    } catch (e) {
      playerEl.innerHTML = '<div class="card"><p class="muted" style="margin:0">' + escapeHtml(e.message) + '</p></div>';
    }
  }

  async function markDone() {
    if (!activeLesson || !activeLesson.lessonId) return;
    if (activeLesson.completed) return;
    showAppAlert('');
    try {
      await flushStudySession({ forceMinimumMinute: true });
      await request('progress', {
        method: 'PUT',
        body: { userId: state.userId, lessonId: Number(activeLesson.lessonId), completed: true },
      });
      showAppAlert('Đã lưu tiến độ bài học.', 'ok');
      activeLesson.completed = true;
      if (activeCourse && Array.isArray(activeCourse.lessons)) {
        const it = activeCourse.lessons.find((x) => Number(x.lessonId) === Number(activeLesson.lessonId));
        if (it) it.completed = true;
      }
      updateDoneButton(activeLesson);
      renderLessonList(Array.isArray(activeCourse?.lessons) ? activeCourse.lessons : []);
      await load();
    } catch (e) {
      showAppAlert(e.message, 'error');
    }
  }

  async function load() {
    if (!listEl) return;
    listEl.innerHTML = '<p class="muted" style="margin:0.75rem">Đang tải…</p>';
    try {
      const courses = await request(`learning/users/${state.userId}/my-courses`, { method: 'GET' });
      const list = Array.isArray(courses) ? courses : [];
      activeCourse = list.find((c) => Number(c.courseId) === courseId) || null;
      if (!activeCourse) {
        listEl.innerHTML =
          '<p class="muted" style="margin:0.75rem">Không có khóa này trong lớp của bạn. Có thể bạn chưa ghi danh, hoặc khóa yêu cầu <strong>gói StudyHub Plus</strong> và tài khoản hiện tại chưa đủ điều kiện.</p>';
        return;
      }

      if (courseTitleEl) courseTitleEl.textContent = activeCourse.courseTitle || '—';
      if (courseSubEl)
        courseSubEl.textContent = `${activeCourse.category || ''}${activeCourse.level ? ' · ' + activeCourse.level : ''}`.trim() || '—';

      const lessons = Array.isArray(activeCourse.lessons) ? activeCourse.lessons : [];
      // Choose initial lesson: query -> first unlocked -> first.
      const pick =
        lessons.find((l) => Number(l.lessonId) === initialLessonId && l.unlocked) ||
        lessons.find((l) => l.unlocked) ||
        lessons[0] ||
        null;

      activeLesson = pick;
      renderLessonList(lessons);
      await switchToLesson(pick, { skipFlush: true, force: true });
    } catch (e) {
      listEl.innerHTML = '<p class="muted" style="margin:0.75rem">' + escapeHtml(e.message) + '</p>';
    }
  }

  const learnSearchForm = document.getElementById('learnNavSearchForm');
  if (learnSearchForm) {
    learnSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(learnSearchForm);
      const q = String(fd.get('q') || '').trim();
      try {
        sessionStorage.setItem('studyhub_explore_q', q);
      } catch {
        /* ignore */
      }
      window.location.href = 'student/explore.html?q=' + encodeURIComponent(q);
    });
  }

  if (!isAuthenticated()) {
    window.location.replace('index.html?auth=1');
    return;
  }
  if (!courseId) {
    showAppAlert('Thiếu courseId trên URL. Ví dụ: student/learn.html?courseId=1', 'error');
  }


  if (btnDone) btnDone.addEventListener('click', markDone);
  if (backBtn) {
    backBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const href = backBtn.getAttribute('href') || 'student/my-learning.html';
      await flushStudySession();
      window.location.href = href;
    });
  }
  if (listEl) {
    listEl.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-lesson-id]');
      if (!btn) return;
      const lid = Number(btn.dataset.lessonId);
      if (!lid || !activeCourse) return;
      const lessons = Array.isArray(activeCourse.lessons) ? activeCourse.lessons : [];
      const lesson = lessons.find((l) => Number(l.lessonId) === lid);
      if (!lesson || !lesson.unlocked) return;
      await switchToLesson(lesson);
      renderLessonList(lessons);
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('lessonId', String(lid));
        history.replaceState({}, '', u.toString());
      } catch {
        /* ignore */
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pauseStudySession();
    } else {
      resumeStudySession();
    }
  });
  window.addEventListener('pagehide', () => {
    void flushStudySession({ keepalive: true });
  });
  window.addEventListener('beforeunload', () => {
    void flushStudySession({ keepalive: true });
  });

  load();
})();

