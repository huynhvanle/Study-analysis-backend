(function () {
  'use strict';

  const STORAGE_KEY = 'study_analysis_session';

  function isTokenExpired(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return false;
    }
  }

  function hasValidSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s.token || s.userId == null) return false;
      return !isTokenExpired(s.token);
    } catch {
      return false;
    }
  }

  function getApiRoot() {
    const meta = document.querySelector('meta[name="api-root"]');
    const raw = (meta && meta.getAttribute('content')) || '';
    return raw.replace(/\/$/, '');
  }

  function apiUrl(path) {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const root = getApiRoot();
    if (!root) return p;
    if (root.startsWith('http://') || root.startsWith('https://')) {
      return root + '/' + p;
    }
    const base = root.startsWith('/') ? root : '/' + root;
    return base + '/' + p;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function authHeaders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const s = JSON.parse(raw);
      if (!s.token) return {};
      return { Authorization: 'Bearer ' + s.token };
    } catch {
      return {};
    }
  }

  function sessionUserId() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s.userId != null ? Number(s.userId) : null;
    } catch {
      return null;
    }
  }

  function displayNameFromLocalSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 'bạn';
      const s = JSON.parse(raw);
      const n = s.name && String(s.name).trim();
      if (n) return n;
      const u = s.username && String(s.username).trim();
      if (u) return u;
      return 'bạn';
    } catch {
      return 'bạn';
    }
  }

  function lessonKindLabelVi(kind) {
    const k = String(kind || '').toUpperCase();
    if (k === 'QUIZ' || k.includes('QUIZ')) return 'Quiz';
    if (k === 'VIDEO' || k.includes('VIDEO')) return 'Video';
    return 'Bài học';
  }

  function lessonUpNextMeta(lesson) {
    const k = lessonKindLabelVi(lesson && lesson.kind);
    const m = lesson && lesson.durationMinutes != null ? Number(lesson.durationMinutes) : null;
    if (m != null && !Number.isNaN(m) && m > 0) {
      return k + ' · ' + m + ' phút';
    }
    return k;
  }

  /**
   * Chọn khóa + bài tiếp theo: bài mở khóa đầu tiên chưa xong; nếu mọi bài đã xong thì gợi ý xem lại bài đầu.
   */
  function pickContinueState(courses) {
    if (!Array.isArray(courses) || !courses.length) return null;
    for (const c of courses) {
      const lessons = Array.isArray(c.lessons) ? c.lessons : [];
      if (!lessons.length) continue;
      const total = Math.max(1, Number(c.totalLessons) || lessons.length);
      const done = Math.min(total, Math.max(0, Number(c.completedLessons) || 0));
      const percent = Math.min(100, Math.round((done / total) * 100));
      const next = lessons.find((l) => l.unlocked && !l.completed);
      if (next) {
        return { course: c, nextLesson: next, percent, allComplete: false };
      }
    }
    const c = courses[0];
    const lessons = Array.isArray(c.lessons) ? c.lessons : [];
    if (!lessons.length) return null;
    const first = lessons[0];
    const total = Math.max(1, Number(c.totalLessons) || lessons.length);
    return { course: c, nextLesson: first, percent: 100, allComplete: true };
  }

  function setContinueRing(percent) {
    const ring = document.getElementById('landingContinueRing');
    const label = document.getElementById('landingContinuePct');
    const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (ring) ring.style.setProperty('--pct', String(p));
    if (label) label.textContent = Math.round(p * 100) + '%';
  }

  function fillWelcomeAndContinue(courses) {
    const nameEl = document.getElementById('landingWelcomeName');
    const lead = document.getElementById('landingWelcomeLead');
    const outer = document.getElementById('landingContinueOuter');
    if (document.body.dataset.appShell !== 'study-landing' || !nameEl || !lead) return;
    nameEl.textContent = displayNameFromLocalSession();
    if (!outer) return;
    if (!Array.isArray(courses) || !courses.length) {
      lead.textContent = 'Khám phá danh mục hoặc khóa nổi bật phía dưới để bắt đầu ghi danh.';
      outer.hidden = true;
      return;
    }
    const st = pickContinueState(courses);
    if (!st) {
      lead.textContent = 'Xem lớp học bên dưới khi bài học đã sẵn sàng.';
      outer.hidden = true;
      return;
    }
    const c = st.course;
    const les = st.nextLesson;
    lead.textContent = st.allComplete
      ? 'Bạn đã xong tất cả bài — có thể ôn lại hoặc thử thêm thử thách quiz.'
      : 'Đây là bài nên mở tiếp theo theo thứ tự lộ trình.';
    outer.hidden = false;
    setContinueRing(st.percent);
    const tEl = document.getElementById('landingContinueCourseTitle');
    if (tEl) tEl.textContent = c.courseTitle || 'Khóa học';
    const meta = document.getElementById('landingContinueCourseMeta');
    if (meta) {
      const m = [c.category, c.level].filter(Boolean).join(' · ');
      meta.textContent = m || '';
    }
    const lessonTitle = document.getElementById('landingContinueLessonTitle');
    if (lessonTitle) lessonTitle.textContent = (les && les.title) || 'Bài học';
    const lessonMeta = document.getElementById('landingContinueLessonMeta');
    if (lessonMeta) lessonMeta.textContent = les ? lessonUpNextMeta(les) : '';
    const cta = document.getElementById('landingContinueCta');
    if (cta) {
      cta.textContent = st.allComplete ? 'Xem lại bài' : 'Học tiếp';
      const courseId = c.courseId != null ? String(c.courseId) : '';
      const lessonId = les && les.lessonId != null ? String(les.lessonId) : '';
      cta.href =
        'student/learn.html?courseId=' + encodeURIComponent(courseId) + '&lessonId=' + encodeURIComponent(lessonId);
    }
  }

  function typeLabelFromLevel(level) {
    const l = String(level || '').toLowerCase();
    if (/beginner|nhập môn|cơ bản|begin/.test(l)) return 'Chứng chỉ · Cơ bản';
    if (/advanced|nâng cao/.test(l)) return 'Chuyên ngành';
    if (/prof|professional|chuyên môn/.test(l)) return 'Chứng chỉ chuyên môn';
    return 'Khóa học';
  }

  function courseTierPill(c) {
    const plus = String(c.accessTier || 'FREE').toUpperCase() === 'PLUS';
    const cls = plus ? 'course-tier-pill course-tier-pill--plus' : 'course-tier-pill course-tier-pill--free';
    const label = plus ? 'Plus' : 'Free';
    const title = plus ? 'Cần gói StudyHub Plus' : 'Miễn phí';
    return `<span class="landing-fcard-tier ${cls}" title="${escapeAttr(title)}">${escapeHtml(label)}</span>`;
  }

  function providerLine(c) {
    const cat = c.category && String(c.category).trim();
    const name = cat || 'StudyHub';
    const initial = cat && cat.length ? String(cat).charAt(0).toUpperCase() : 'S';
    return (
      `<div class="landing-fcard-provider">` +
      `<span class="landing-fcard-provider-logo" aria-hidden="true">${escapeHtml(initial)}</span>` +
      `<span>${escapeHtml(name)}</span>` +
      `</div>`
    );
  }

  function coursePublicHref(c) {
    if (window.StudyApp && typeof window.StudyApp.coursePublicUrl === 'function') {
      return window.StudyApp.coursePublicUrl(c);
    }
    const s = c.slug && String(c.slug).trim();
    if (s) return 'student/course.html?slug=' + encodeURIComponent(s);
    if (c.id != null) return 'student/course.html?id=' + encodeURIComponent(String(c.id));
    return 'student/explore.html';
  }

  function landingCourseCard(c) {
    const phClass = ['a', 'b', 'c', 'd', 'e', 'f'][Number(c.id) % 6];
    const cover = c.coverImageUrl && String(c.coverImageUrl).trim();
    const mediaInner = cover
      ? `<div class="landing-fcard-media"><img src="${escapeAttr(cover)}" alt="" loading="lazy" /></div>`
      : `<div class="landing-fcard-media landing-fcard-media--ph landing-course-thumb--${phClass}" aria-hidden="true"></div>`;
    const media =
      `<div class="landing-fcard-media-wrap">` + courseTierPill(c) + mediaInner + `</div>`;
    const ty = typeLabelFromLevel(c.level);
    const t = escapeHtml(c.title || 'Khóa học');
    const ar = (c.title || 'Khóa học') + ' — mô tả & ghi danh trên trang khóa học';
    const href = coursePublicHref(c);
    return (
      `<a class="landing-fcard landing-fcard--link" href="${escapeAttr(href)}" aria-label="${escapeAttr(ar)}">` +
      media +
      `<div class="landing-fcard-body">` +
      providerLine(c) +
      `<h3 class="landing-fcard-title">${t}</h3>` +
      `<p class="landing-fcard-type">${escapeHtml(ty)}</p>` +
      `</div></a>`
    );
  }

  function landingMyLearningCard(c) {
    const phClass = ['a', 'b', 'c', 'd', 'e', 'f'][Number(c.courseId) % 6];
    const media = `<div class="landing-fcard-media landing-fcard-media--ph landing-course-thumb--${phClass}" aria-hidden="true"></div>`;
    const title = escapeHtml(c.courseTitle || 'Khóa học');
    const total = Number(c.totalLessons) || 0;
    const done = Number(c.completedLessons) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const meta = [c.category, c.level].filter(Boolean).join(' · ');
    const metaHtml = meta ? `<p class="landing-fcard-type">${escapeHtml(meta)}</p>` : '';
    const learnHref = `student/learn.html?courseId=${encodeURIComponent(String(c.courseId))}`;
    return (
      `<a href="${escapeAttr(learnHref)}" class="landing-fcard landing-mycard" data-course-id="${escapeAttr(c.courseId)}" role="listitem">` +
      media +
      `<div class="landing-fcard-body">` +
      `<h3 class="landing-fcard-title">${title}</h3>` +
      metaHtml +
      `<p class="landing-mycard-progress-text">${done}/${total} bài đã hoàn thành</p>` +
      `<div class="landing-mycard-progress" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${pct}%"></span></div>` +
      `</div></a>`
    );
  }

  async function loadLandingMyCourses() {
    if (document.body.dataset.appShell !== 'study-landing') return;
    const welcomeBlock = document.getElementById('landingWelcomeBlock');
    const guestHint = document.getElementById('landingMyLearningGuestHint');
    const loggedIn = document.getElementById('landingMyCoursesLoggedIn');
    const grid = document.getElementById('landingMyCoursesGrid');
    const status = document.getElementById('landingMyCoursesStatus');
    if (!guestHint || !loggedIn || !grid || !status) return;

    if (!hasValidSession()) {
      if (welcomeBlock) welcomeBlock.hidden = true;
      const outer = document.getElementById('landingContinueOuter');
      if (outer) outer.hidden = true;
      guestHint.hidden = false;
      loggedIn.hidden = true;
      return;
    }

    if (welcomeBlock) welcomeBlock.hidden = false;
    const lead0 = document.getElementById('landingWelcomeLead');
    if (lead0) lead0.textContent = 'Đang tải gợi ý học tiếp…';
    const nameHead = document.getElementById('landingWelcomeName');
    if (nameHead) nameHead.textContent = displayNameFromLocalSession();
    const outer0 = document.getElementById('landingContinueOuter');
    if (outer0) outer0.hidden = true;

    guestHint.hidden = true;
    loggedIn.hidden = false;
    status.hidden = false;
    status.textContent = 'Đang tải khóa học của bạn…';
    grid.innerHTML = '';

    const uid = sessionUserId();
    if (uid == null) {
      status.textContent = 'Không đọc được phiên đăng nhập.';
      if (lead0) lead0.textContent = 'Không đọc được phiên đăng nhập.';
      return;
    }

    try {
      const res = await fetch(apiUrl('learning/users/' + uid + '/my-courses'), {
        method: 'GET',
        credentials: 'same-origin',
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error('Không tải được danh sách khóa đang học.');
      const list = await res.json();
      fillWelcomeAndContinue(Array.isArray(list) ? list : []);
      if (!Array.isArray(list) || !list.length) {
        status.hidden = false;
        status.textContent =
          'Bạn chưa ghi danh khóa nào — xem phần Khám phá danh mục bên dưới để chọn khóa.';
        return;
      }
      status.hidden = true;
      grid.innerHTML = list.map((c) => landingMyLearningCard(c)).join('');
    } catch (e) {
      status.hidden = false;
      status.textContent = e.message || 'Lỗi tải dữ liệu.';
      const lead = document.getElementById('landingWelcomeLead');
      if (lead) lead.textContent = e.message || 'Không tải được gợi ý học tiếp.';
      const outer = document.getElementById('landingContinueOuter');
      if (outer) outer.hidden = true;
    }
  }

  async function loadLandingCategoryPills() {
    const mount = document.getElementById('landingCategoryPills');
    const loading = document.getElementById('landingCatPillsLoading');
    if (!mount) return;
    try {
      const res = await fetch(apiUrl('course-categories'), { method: 'GET', credentials: 'same-origin' });
      if (!res.ok) throw new Error('cat');
      const cats = await res.json();
      if (loading) loading.remove();
      const items = [{ id: '', name: 'Tất cả' }].concat(
        (Array.isArray(cats) ? cats : []).map((x) => ({
          id: String(x.id),
          name: x.name,
        }))
      );
      mount.innerHTML = items
        .map(
          (x) =>
            `<a href="student/explore.html" class="landing-cat-pill" data-cat-id="${escapeAttr(x.id)}">${escapeHtml(x.name)}</a>`
        )
        .join('');
      mount.querySelectorAll('a[data-cat-id]').forEach((a) => {
        a.addEventListener('click', () => {
          const id = a.getAttribute('data-cat-id');
          try {
            if (id) sessionStorage.setItem('studyhub_landing_cat', id);
            else sessionStorage.removeItem('studyhub_landing_cat');
          } catch {
            /* ignore */
          }
        });
      });
    } catch {
      if (loading) loading.remove();
      mount.innerHTML =
        '<a href="student/explore.html" class="landing-cat-pill" data-cat-id="">Tất cả khóa học</a>';
      const a = mount.querySelector('a[data-cat-id]');
      if (a) {
        a.addEventListener('click', () => {
          try {
            sessionStorage.removeItem('studyhub_landing_cat');
          } catch {
            /* ignore */
          }
        });
      }
    }
  }

  async function loadLandingCatalog() {
    const grid = document.getElementById('landingCatalogGrid');
    const loading = document.getElementById('landingCatalogLoading');
    if (!grid) return;
    try {
      const res = await fetch(apiUrl('courses'), { method: 'GET', credentials: 'same-origin' });
      if (!res.ok) throw new Error('Không tải được danh sách khóa học.');
      const list = await res.json();
      if (loading) loading.remove();
      if (!Array.isArray(list) || !list.length) {
        grid.innerHTML =
          '<p class="landing-featured-empty" role="status">Chưa có khóa học công khai. Hãy thử lại sau.</p>';
        return;
      }
      const take = list.slice(0, 12);
      grid.innerHTML = take.map((c) => landingCourseCard(c)).join('');
    } catch (e) {
      if (loading) loading.remove();
      grid.innerHTML =
        '<p class="landing-featured-empty" role="alert">' + escapeHtml(e.message || 'Lỗi tải') + '</p>';
    }
  }

  function ready() {
    const primary = document.getElementById('landingCtaPrimary');
    const navLogin = document.getElementById('landingNavLogin');
    const joinBtn = document.getElementById('landingJoinBtn');
    const form = document.getElementById('landingSearchForm');
    const searchHint = document.getElementById('landingSearchHint');

    if (hasValidSession() && document.body.dataset.appShell === 'study-landing') {
      const exploreLabel = 'Xem khóa học nổi bật';
      const exploreHref = '#landing-featured-heading';
      if (primary) {
        primary.textContent = exploreLabel;
        primary.setAttribute('aria-label', 'Cuộn tới phần khóa học nổi bật');
        primary.href = exploreHref;
      }
      if (navLogin) {
        navLogin.textContent = exploreLabel;
        navLogin.href = exploreHref;
      }
      if (joinBtn) {
        joinBtn.textContent = 'Hồ sơ & học tập';
        joinBtn.href = 'student/student.html';
      }
    }

    if (form && searchHint) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = form.querySelector('input[name="q"]');
        const q = input && input.value ? String(input.value).trim() : '';
        if (hasValidSession()) {
          try {
            sessionStorage.setItem('studyhub_explore_q', q);
          } catch {
            /* ignore */
          }
          window.location.href = 'student/explore.html?q=' + encodeURIComponent(q);
          return;
        }
        searchHint.hidden = false;
        searchHint.textContent =
          'Đăng nhập để tìm và ghi danh khóa học — hoặc dùng nút Đăng nhập phía trên.';
      });
    }

    loadLandingCategoryPills();
    loadLandingMyCourses();
    loadLandingCatalog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
