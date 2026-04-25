;(async function () {
  'use strict';

  if (document.body.dataset.appShell !== 'student-mylearning-full') return;
  const app = window.StudyApp;
  if (!app) return;

  const { request, state, isAuthenticated, escapeHtml, escapeAttr } = app;

  const listEl = document.getElementById('myLearningList');
  const statusEl = document.getElementById('myLearningStatus');
  const form = document.getElementById('landingSearchForm');
  const qInput = form && form.querySelector('input[name="q"]');

  if (typeof app.syncLandingNav === 'function') {
    try {
      app.syncLandingNav();
    } catch {
      /* ignore */
    }
  }

  if (!isAuthenticated() || !state.userId) {
    return;
  }

  const PH = ['a', 'b', 'c', 'd', 'e', 'f'];

  /** Cùng ảnh mặc định với backend — dùng khi URL gốc 404/403. */
  const FALLBACK_COVER =
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&auto=format&fit=crop';

  /** Chuẩn hoá URL ảnh (relative / path tĩnh so với &lt;base&gt;). */
  function resolveMediaUrl(u) {
    if (u == null) return '';
    const s = String(u).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.startsWith('//') || s.startsWith('data:')) return s;
    if (s.startsWith('/')) {
      return window.location.origin + s;
    }
    try {
      return new URL(s, document.baseURI).href;
    } catch {
      return s;
    }
  }

  function wireCoverImgFallback(root) {
    if (!root) return;
    root.querySelectorAll('img.mylearning-cover-img').forEach((img) => {
      img.addEventListener('error', function onCoverErr() {
        const alreadyOnFallback = img.src && img.src.includes('photo-1503676260728');
        if (img.dataset.fallbackTried !== '1' && !alreadyOnFallback) {
          img.dataset.fallbackTried = '1';
          img.src = FALLBACK_COVER;
          return;
        }
        const w = img.closest('.mylearning-card-media');
        if (!w) return;
        const id = Number(w.getAttribute('data-course-id') || 0);
        const phClass = PH[id % 6];
        w.innerHTML = '';
        w.classList.add('mylearning-card-media--ph', `landing-course-thumb--${phClass}`);
        w.textContent = '📘';
      });
    });
  }

  function courseCard(c) {
    const id = c.courseId != null ? Number(c.courseId) : 0;
    const title = c.courseTitle || 'Khóa học';
    const href = `student/learn.html?courseId=${encodeURIComponent(String(id))}`;
    const rawCover = c.coverImageUrl && String(c.coverImageUrl).trim();
    const cover = rawCover ? resolveMediaUrl(rawCover) : '';
    const phClass = PH[id % 6];
    const total = Math.max(0, Number(c.totalLessons) || 0);
    const done = Math.max(0, Math.min(total, Number(c.completedLessons) || 0));
    const pct = total > 0 ? Math.min(100, Math.round((100 * done) / total)) : 0;
    const meta = [c.category, c.level].filter(Boolean).join(' · ');
    const metaHtml = meta ? `<p class="mylearning-card-sub">${escapeHtml(meta)}</p>` : '';
    const totalQz = Math.max(0, Number(c.totalQuizzes) || 0);
    const submitted = Math.max(0, Math.min(totalQz, Number(c.submittedQuizzes) || 0));
    let scoreLine = 'Điểm trung bình (quiz): —';
    if (totalQz === 0) {
      scoreLine = 'Quiz: chưa có bài kiểm tra trong khóa';
    } else if (c.courseQuizScorePercent != null && !Number.isNaN(Number(c.courseQuizScorePercent))) {
      const p = Math.min(100, Math.max(0, Number(c.courseQuizScorePercent)));
      scoreLine = `Điểm trung bình (quiz): ${p.toFixed(1)}% (đã nộp ${submitted}/${totalQz} quiz)`;
    } else {
      scoreLine = 'Điểm trung bình (quiz): — (chưa nộp đủ)';
    }
    const media = cover
      ? `<div class="mylearning-card-media" data-course-id="${escapeAttr(String(id))}" aria-hidden="true"><img class="mylearning-cover-img" src="${escapeAttr(
          cover
        )}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></div>`
      : `<div class="mylearning-card-media mylearning-card-media--ph landing-course-thumb--${phClass}" data-course-id="${escapeAttr(
          String(id)
        )}" aria-hidden="true">📘</div>`;
    return (
      `<li class="mylearning-card" role="listitem">` +
      `<a class="mylearning-card-link" href="${escapeAttr(href)}">` +
      media +
      `<div class="mylearning-card-body">` +
      `<h2 class="mylearning-card-title">${escapeHtml(title)}</h2>` +
      metaHtml +
      `<p class="mylearning-card-progress-line">Tiến độ: <strong>${done}</strong> / ${total} bài${total > 0 ? ` (${pct}%)` : ''}</p>` +
      (total > 0
        ? `<div class="mylearning-bar" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${pct}%"></span></div>`
        : '') +
      `<p class="mylearning-card-score">${escapeHtml(scoreLine)}</p>` +
      `</div></a></li>`
    );
  }

  async function load() {
    if (statusEl) statusEl.textContent = 'Đang tải…';
    if (listEl) listEl.innerHTML = '';
    try {
      const courses = await request(`learning/users/${state.userId}/my-courses`, { method: 'GET' });
      if (!Array.isArray(courses) || !courses.length) {
        if (statusEl) {
          statusEl.textContent =
            'Bạn chưa ghi danh khóa nào — vào Khám phá để chọn khóa.';
        }
        return;
      }
      if (statusEl) statusEl.textContent = '';
      if (!listEl) return;
      listEl.innerHTML = courses.map((c) => courseCard(c)).join('');
      wireCoverImgFallback(listEl);
    } catch (e) {
      if (statusEl) statusEl.textContent = e && e.message ? e.message : 'Không tải được danh sách khóa.';
    }
  }

  await load();

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = String(qInput && qInput.value ? qInput.value : '').trim();
      if (q) {
        try {
          sessionStorage.setItem('studyhub_explore_q', q);
        } catch {
          /* ignore */
        }
      }
      window.location.href = 'student/explore.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
})();
