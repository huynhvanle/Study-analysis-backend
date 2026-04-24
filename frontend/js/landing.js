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

  function typeLabelFromLevel(level) {
    const l = String(level || '').toLowerCase();
    if (/beginner|nhập môn|cơ bản|begin/.test(l)) return 'Chứng chỉ · Cơ bản';
    if (/advanced|nâng cao/.test(l)) return 'Chuyên ngành';
    if (/prof|professional|chuyên môn/.test(l)) return 'Chứng chỉ chuyên môn';
    return 'Khóa học';
  }

  function pseudoRating(id) {
    return (4.2 + (Number(id) % 8) / 10).toFixed(1);
  }

  function landingCourseCard(c) {
    const phClass = ['a', 'b', 'c', 'd', 'e', 'f'][Number(c.id) % 6];
    const cover = c.coverImageUrl && String(c.coverImageUrl).trim();
    const media = cover
      ? `<div class="landing-fcard-media"><img src="${escapeAttr(cover)}" alt="" loading="lazy" /></div>`
      : `<div class="landing-fcard-media landing-fcard-media--ph landing-course-thumb--${phClass}" aria-hidden="true"></div>`;
    const ty = typeLabelFromLevel(c.level);
    const stars = pseudoRating(c.id);
    return (
      `<article class="landing-fcard">` +
      media +
      `<div class="landing-fcard-body">` +
      `<h3 class="landing-fcard-title">${escapeHtml(c.title || 'Khóa học')}</h3>` +
      `<p class="landing-fcard-type">${escapeHtml(ty)}</p>` +
      `<div class="landing-fcard-rating" aria-label="Đánh giá ${stars} trên 5">` +
      `<span>${stars}</span>/5` +
      `</div>` +
      `</div></article>`
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
    return (
      `<a href="student/student.html" class="landing-fcard landing-mycard" data-course-id="${escapeAttr(c.courseId)}" role="listitem">` +
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
    const guestHint = document.getElementById('landingMyLearningGuestHint');
    const loggedIn = document.getElementById('landingMyCoursesLoggedIn');
    const grid = document.getElementById('landingMyCoursesGrid');
    const status = document.getElementById('landingMyCoursesStatus');
    if (!guestHint || !loggedIn || !grid || !status) return;

    if (!hasValidSession()) {
      guestHint.hidden = false;
      loggedIn.hidden = true;
      return;
    }

    guestHint.hidden = true;
    loggedIn.hidden = false;
    status.hidden = false;
    status.textContent = 'Đang tải khóa học của bạn…';
    grid.innerHTML = '';

    const uid = sessionUserId();
    if (uid == null) {
      status.textContent = 'Không đọc được phiên đăng nhập.';
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
      if (!Array.isArray(list) || !list.length) {
        status.hidden = false;
        status.textContent =
          'Bạn chưa ghi danh khóa nào — xem phần Khám phá danh mục bên dưới để chọn khóa.';
        return;
      }
      status.hidden = true;
      grid.innerHTML = list.map((c) => landingMyLearningCard(c)).join('');
      grid.querySelectorAll('a[data-course-id]').forEach((a) => {
        a.addEventListener('click', () => {
          try {
            sessionStorage.setItem('studyhub_classroom_course', String(a.getAttribute('data-course-id')));
          } catch {
            /* ignore */
          }
        });
      });
    } catch (e) {
      status.hidden = false;
      status.textContent = e.message || 'Lỗi tải dữ liệu.';
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
            `<a href="student/student.html" class="landing-cat-pill" data-cat-id="${escapeAttr(x.id)}">${escapeHtml(x.name)}</a>`
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
        '<a href="student/student.html" class="landing-cat-pill" data-cat-id="">Tất cả khóa học</a>';
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
    const hint = document.getElementById('landingSessionHint');
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
      if (hint) {
        hint.hidden = false;
        hint.textContent =
          'Bạn đã đăng nhập — mở menu góc phải, mục Thông tin → Hồ sơ & học tập để vào trang học tập (sidebar, dashboard như trước).';
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
          window.location.href = 'student/student.html';
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
