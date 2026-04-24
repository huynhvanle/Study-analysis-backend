(function () {
  'use strict';

  const STORAGE_KEY = 'study_analysis_session';

  const state = {
    token: null,
    userId: null,
    username: null,
    role: null,
    name: null,
    email: null,
  };

  let activeView = '';

  function normalizeRole(r) {
    return String(r || '')
      .trim()
      .toUpperCase();
  }

  /** Staff: full catalog & member management. Matches backend role strings. */
  function isStaff() {
    const r = normalizeRole(state.role);
    return r === 'ADMIN' || r === 'INSTRUCTOR';
  }

  /** Nhãn hiển thị vai trò (API vẫn dùng mã tiếng Anh). */
  function roleLabelVi(role) {
    const r = normalizeRole(role);
    if (r === 'ADMIN') return 'Quản trị';
    if (r === 'INSTRUCTOR') return 'Giảng viên';
    if (r === 'STUDENT') return 'Học viên';
    return r || '—';
  }

  function isAuthenticated() {
    return !!(state.token && state.userId != null && !isTokenExpired(state.token));
  }

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

  function getApiRoot() {
    const meta = document.querySelector('meta[name="api-root"]');
    const raw = meta?.getAttribute('content')?.trim() ?? '';
    return raw.replace(/\/$/, '');
  }

  function buildUrl(path) {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const root = getApiRoot();
    if (!root) return p;
    const base = root.replace(/\/$/, '');
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base}/${p}`;
    }
    const prefix = base.startsWith('/') ? base : `/${base}`;
    return `${prefix}/${p}`;
  }

  async function request(path, options = {}) {
    const url = buildUrl(path);
    const headers = { ...(options.headers || {}) };
    let body = options.body;
    if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    const res = await fetch(url, { ...options, headers, body });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { _raw: text };
      }
    }
    if (!res.ok) {
      const msg = data?.messgase || data?.message || data?._raw || res.statusText;
      const err = new Error(msg || `HTTP ${res.status}`);
      if (data != null && typeof data.code === 'number') {
        err.code = data.code;
      }
      throw err;
    }
    return data;
  }

  function gateErrorMessage(err) {
    if (err && err.message) return err.message;
    return 'Có lỗi xảy ra. Thử lại sau.';
  }

  function setGateLoading(form, loading) {
    const btn = form.querySelector('.gate-submit');
    if (!btn) return;
    if (!btn.dataset.defaultLabel) {
      btn.dataset.defaultLabel = btn.textContent.trim();
    }
    btn.disabled = !!loading;
    btn.textContent = loading ? 'Đang xử lý…' : btn.dataset.defaultLabel;
    btn.setAttribute('aria-busy', loading ? 'true' : 'false');
  }

  function unwrap(data) {
    if (data && typeof data === 'object' && 'result' in data && data.result !== undefined) {
      return data.result;
    }
    return data;
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      state.token = s.token || null;
      state.userId = s.userId ?? null;
      state.username = s.username || null;
      state.role = s.role || null;
      state.name = s.name || null;
      state.email = s.email || null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function saveSession() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: state.token,
        userId: state.userId,
        username: state.username,
        role: state.role,
        name: state.name,
        email: state.email,
      })
    );
  }

  function clearSession() {
    state.token = state.userId = state.username = state.role = state.name = state.email = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function applyAuth(r) {
    if (!r) return;
    state.token = r.token || null;
    state.userId = r.userId ?? null;
    state.username = r.username || null;
    state.role = r.role || null;
    state.name = r.name || null;
    state.email = r.email || null;
    saveSession();
  }

  function showGateAlert(msg, type) {
    const el = document.getElementById('gateAlert');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      el.className = 'gate-alert';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.className = 'gate-alert ' + (type === 'ok' ? 'ok' : 'error');
  }

  function showAppAlert(msg, type) {
    const el = document.getElementById('alert');
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      el.className = 'banner';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.className = 'banner ' + (type === 'ok' ? 'ok' : 'error');
  }

  function syncLandingNavForSession() {
    const guest = document.getElementById('landingNavGuest');
    const stud = document.getElementById('landingNavStudent');
    if (!guest || !stud) return;
    const showStudent = isAuthenticated() && !isStaff();
    guest.hidden = showStudent;
    stud.hidden = !showStudent;
  }

  function stripAuthQueryFromUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    url.searchParams.delete('tab');
    const qs = url.searchParams.toString();
    window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
  }

  /** Xóa dữ liệu form đăng nhập/đăng ký (và chạy lại sau 1 frame để vượt autofill trình duyệt). */
  function resetGateForms() {
    document.getElementById('formLogin')?.reset();
    document.getElementById('formRegister')?.reset();
    showGateAlert('');
    document.querySelector('.gate-tab[data-tab="login"]')?.click();
    const lu = document.getElementById('loginUser');
    const lp = document.getElementById('loginPass');
    const ru = document.getElementById('regUser');
    const rp = document.getElementById('regPass');
    const rp2 = document.getElementById('regPass2');
    [lu, lp, ru, rp, rp2].forEach((el) => {
      if (el) el.value = '';
    });
    requestAnimationFrame(() => {
      [lu, lp, ru, rp, rp2].forEach((el) => {
        if (el) el.value = '';
      });
    });
  }

  /** Sau đăng xuất: về landing, không mở modal, không giữ ?auth=1 (tránh form còn dữ liệu). */
  function exitToLandingGuestAfterLogout() {
    resetGateForms();
    document.getElementById('gate')?.classList.add('hidden');
    document.body.removeAttribute('data-app-view');
    const appEl = document.getElementById('app');
    appEl?.classList.remove('app--landing-style', 'app--embedded-student');
    appEl?.classList.add('hidden');
    appEl?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('student-app-open');
    document.getElementById('landingGuestMarketing')?.classList.remove('hidden');
    document.getElementById('landingRoot')?.classList.remove('hidden');
    updateTopbar();
    syncLandingNavForSession();
    stripAuthQueryFromUrl();
  }

  function showGate() {
    document.body.removeAttribute('data-app-view');
    const appEl = document.getElementById('app');
    appEl?.classList.remove('app--landing-style', 'app--embedded-student');
    document.body.classList.remove('student-app-open');
    document.getElementById('landingGuestMarketing')?.classList.remove('hidden');
    document.getElementById('gate')?.classList.remove('hidden');
    appEl?.classList.add('hidden');
    appEl?.setAttribute('aria-hidden', 'true');
    document.getElementById('landingRoot')?.classList.remove('hidden');
    syncLandingNavForSession();
  }

  function showAppShell() {
    document.getElementById('gate')?.classList.add('hidden');
    const appRoot = document.getElementById('app');
    if (!appRoot) return;

    const shell = document.body.dataset.appShell || '';
    const adminShell = shell === 'admin';

    appRoot.classList.remove('hidden');
    appRoot.setAttribute('aria-hidden', 'false');
    document.body.dataset.appView = isStaff() ? 'staff' : 'student';

    document.body.classList.remove('student-app-open');
    appRoot.classList.remove('app--embedded-student');
    if (adminShell) {
      appRoot.classList.remove('app--landing-style');
      appRoot.classList.add('app--admin-dashboard');
    } else {
      appRoot.classList.remove('app--admin-dashboard');
      appRoot.classList.toggle('app--landing-style', !isStaff());
    }

    updateTopbar();
    buildNav();
    if (!activeView || (NAV.find((n) => n.id === activeView)?.staffOnly && !isStaff())) {
      activeView = isStaff() ? 'admin-home' : 'student-home';
    }
    const item = NAV.find((n) => n.id === activeView);
    if (item && ((item.staffOnly && !isStaff()) || (item.studentOnly && isStaff() && !item.allowStaff))) {
      activeView = isStaff() ? 'admin-home' : 'student-home';
    }
    showView(activeView);
  }

  function updateTopbar() {
    const badge = document.getElementById('roleBadge');
    const r = normalizeRole(state.role);
    if (badge) {
      badge.textContent = roleLabelVi(state.role);
      badge.className = 'role-badge ' + (isStaff() ? 'staff' : 'student');
    }

    const shell = document.body.dataset.appShell || '';
    const sub = document.querySelector('.topbar-sub');
    if (sub) {
      if (shell === 'admin') {
        sub.textContent = 'Quản trị nền tảng';
      } else if (shell === 'student') {
        sub.textContent = 'Học trực tuyến · theo dõi tiến độ';
      } else if (isStaff()) {
        sub.textContent = 'Phân tích học tập';
      } else {
        sub.textContent = 'Học trực tuyến · theo dõi tiến độ';
      }
    }

    const initial = (state.name || state.username || '?').charAt(0).toUpperCase();
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = initial;
    const un = document.getElementById('userDisplayName');
    if (un) un.textContent = state.name || state.username || 'Người dùng';
    const uid = document.getElementById('userDisplayId');
    if (uid) uid.textContent = 'ID ' + state.userId;

    const lav = document.getElementById('landingUserAvatar');
    if (lav) lav.textContent = initial;
    const lun = document.getElementById('landingUserDisplayName');
    if (lun) lun.textContent = state.name || state.username || 'Người dùng';
    const lui = document.getElementById('landingUserDisplayId');
    if (lui) lui.textContent = 'ID ' + state.userId;
    const lrb = document.getElementById('landingRoleBadge');
    if (lrb) {
      lrb.textContent = roleLabelVi(state.role);
      lrb.className = 'role-badge ' + (isStaff() ? 'staff' : 'student');
    }
    syncLandingNavForSession();
  }

  /**
   * staffOnly: visible only to ADMIN / INSTRUCTOR
   * studentOnly: primary learner tools (staff can open if allowStaff)
   */
  const NAV = [
    { id: 'student-home', label: 'Tổng quan', icon: '', desc: 'Tóm tắt học tập và số liệu nhanh.', studentOnly: true, allowStaff: true },
    { id: 'student-explore', label: 'Khám phá khóa học', icon: '', desc: 'Xem danh mục công khai và ghi danh.', studentOnly: true, allowStaff: true },
    {
      id: 'student-classroom',
      label: 'Lớp của tôi',
      icon: '',
      desc: '',
      studentOnly: true,
      allowStaff: true,
    },
    { id: 'student-learn', label: 'Bài học & quiz', icon: '', desc: 'Nhập ID thủ công: bài học và quiz.', studentOnly: true, allowStaff: true },
    { id: 'student-track', label: 'Tiến độ & nhật ký', icon: '', desc: 'Đánh dấu hoàn thành và ghi nhật ký học.', studentOnly: true, allowStaff: true },
    { id: 'student-coach', label: 'Gợi ý học tập', icon: '', desc: 'Gợi ý cải thiện điểm dựa trên dữ liệu của bạn.', studentOnly: true, allowStaff: true },
    { id: 'admin-home', label: 'Tổng quan', icon: '', desc: 'Thống kê nhanh nền tảng.', staffOnly: true },
    { id: 'admin-members', label: 'Thành viên', icon: '', desc: 'Danh sách tài khoản người dùng.', staffOnly: true },
    { id: 'admin-courses', label: 'Khóa học', icon: '', desc: 'Tạo, sửa, xuất bản khóa học; danh mục qua nút trên trang.', staffOnly: true },
    { id: 'admin-content', label: 'Quiz & điểm', icon: '', desc: 'Tạo quiz và nhập điểm.', staffOnly: true },
  ];

  function navIconAndLabel(item) {
    const icon = item.icon ? `<span class="nav-icon">${item.icon}</span>` : '';
    return icon + `<span class="nav-label">${item.label}</span>`;
  }

  /** Multi-page admin shell — matches `frontend/admin/*.html` and `admin.html`. */
  const ADMIN_PAGE_HREF = {
    'admin-home': 'admin.html',
    'admin-members': 'admin/members.html',
    'admin-courses': 'admin/courses.html',
    'admin-content': 'admin/quizzes.html',
  };

  function appendStaffNavLinks(targetNav) {
    NAV.filter((n) => n.staffOnly).forEach((item) => {
      const href = ADMIN_PAGE_HREF[item.id];
      if (!href) return;
      const a = document.createElement('a');
      a.href = href;
      a.className = 'sidebar-nav-link';
      a.innerHTML = navIconAndLabel(item);
      targetNav.appendChild(a);
    });
  }

  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.replaceChildren();

    if (document.body.dataset.appShell === 'admin') {
      appendStaffNavLinks(nav);
      const back = document.createElement('a');
      back.href = 'student/student.html';
      back.className = 'btn btn-ghost btn-sm';
      back.style.marginTop = '0.75rem';
      back.style.display = 'block';
      back.textContent = '← Trang học viên';
      nav.appendChild(back);
      return;
    }

    const learn = document.createElement('div');
    learn.className = 'nav-section-title';
    learn.textContent = 'Học tập';
    nav.appendChild(learn);

    NAV.filter((n) => n.studentOnly).forEach((item) => {
      if (!isStaff() && item.staffOnly) return;
      nav.appendChild(navButton(item));
    });

    if (isStaff()) {
      const staff = document.createElement('div');
      staff.className = 'nav-section-title';
      staff.textContent = 'Quản trị';
      nav.appendChild(staff);
      appendStaffNavLinks(nav);
    }

    if (document.body.dataset.appShell === 'student') {
      const home = document.createElement('a');
      home.href = 'student/study-landing.html';
      home.className = 'btn btn-ghost btn-sm';
      home.style.marginTop = '0.75rem';
      home.style.display = 'block';
      home.textContent = '← Trang chủ';
      nav.appendChild(home);
    }
  }

  function navButton(item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.view = item.id;
    b.innerHTML = navIconAndLabel(item);
    b.addEventListener('click', () => showView(item.id));
    return b;
  }

  function setPage(title, desc) {
    document.getElementById('pageTitle').textContent = title;
    const pd = document.getElementById('pageDesc');
    if (pd) {
      const t = desc == null ? '' : String(desc).trim();
      if (!t) {
        pd.textContent = '';
        pd.hidden = true;
      } else {
        pd.hidden = false;
        pd.textContent = t;
      }
    }
    const bc = document.getElementById('adminBreadcrumb');
    if (bc && document.body.dataset.appShell === 'admin') {
      bc.innerHTML = `<span class="admin-bc-item">Quản trị</span><span class="admin-bc-sep" aria-hidden="true">/</span><span class="admin-bc-item admin-bc-current">${escapeHtml(title)}</span>`;
    }
  }

  function highlightNav() {
    document.querySelectorAll('.sidebar-nav button').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === activeView);
    });
  }

  function requireStaff() {
    if (!isStaff()) {
      showAppAlert('Khu vực này chỉ dành cho nhân sự (vai trò Quản trị hoặc Giảng viên).', 'error');
      showView('student-home');
      return false;
    }
    return true;
  }

  function showView(id) {
    const item = NAV.find((n) => n.id === id);
    if (!item) return;
    if (item.staffOnly && !isStaff()) {
      showAppAlert('Bạn không có quyền mở trang này.', 'error');
      return;
    }
    activeView = id;
    highlightNav();
    showAppAlert('');
    setPage(item.label, item.desc);
    const content = document.getElementById('content');
    switch (id) {
      case 'student-home':
        renderStudentHome(content);
        break;
      case 'student-explore':
        renderStudentExplore(content);
        break;
      case 'student-classroom':
        renderStudentClassroom(content);
        break;
      case 'student-learn':
        renderStudentLearn(content);
        break;
      case 'student-track':
        renderStudentTrack(content);
        break;
      case 'student-coach':
        renderStudentCoach(content);
        break;
      case 'admin-home':
        if (!requireStaff()) return;
        renderAdminHome(content);
        break;
      case 'admin-members':
        if (!requireStaff()) return;
        renderAdminMembers(content);
        break;
      case 'admin-courses':
        if (!requireStaff()) return;
        renderAdminCourses(content);
        break;
      case 'admin-content':
        if (!requireStaff()) return;
        renderAdminContent(content);
        break;
      default:
        break;
    }
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
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

  /**
   * Chuẩn hoá URL bài học → iframe YouTube/Vimeo hoặc thẻ video (mp4/webm).
   * Các trang thường chỉ có thể mở tab mới (không nhúng iframe).
   */
  function resolveLessonEmbed(rawUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw) return { type: 'empty' };
    let u;
    try {
      u = new URL(raw);
    } catch {
      return { type: 'link', href: raw };
    }
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id && /^[\w-]{11}$/.test(id)) {
        return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
      }
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) {
        return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${v}` };
      }
      let em = u.pathname.match(/^\/embed\/([\w-]{11})/);
      if (em) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${em[1]}` };
      em = u.pathname.match(/^\/shorts\/([\w-]{11})/);
      if (em) return { type: 'iframe', src: `https://www.youtube-nocookie.com/embed/${em[1]}` };
    }

    if (host === 'vimeo.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) {
        return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
      }
    }
    if (host === 'player.vimeo.com' && u.pathname.startsWith('/video/')) {
      return { type: 'iframe', src: u.origin + u.pathname + (u.search || '') };
    }

    const pathQ = u.pathname + u.search;
    if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(pathQ)) {
      return { type: 'video', src: raw };
    }

    return { type: 'link', href: raw };
  }

  function lessonPlayerHtml(rawUrl) {
    const r = resolveLessonEmbed(rawUrl);
    if (r.type === 'iframe') {
      return `<div class="lesson-player"><iframe src="${escapeAttr(r.src)}" title="Nội dung bài học" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    if (r.type === 'video') {
      return `<div class="lesson-player lesson-player--file"><video controls preload="metadata" src="${escapeAttr(r.src)}"></video></div>`;
    }
    if (r.type === 'empty') {
      return '';
    }
    const href = escapeAttr(r.href);
    return `<p style="margin:0"><a href="${href}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-ghost">Mở trong tab mới</a></p>`;
  }

  /* ---------- Student views ---------- */

  async function renderStudentHome(content) {
    content.replaceChildren();
    const wrap = el(`
      <div>
        <span class="perm-hint student">Không gian học viên · dữ liệu theo tài khoản của bạn (mã người dùng ${state.userId})</span>
        <div class="stat-grid" id="stuStats"></div>
      </div>
    `);
    content.appendChild(wrap);
    const grid = content.querySelector('#stuStats');
    try {
      const summary = await request(`users/${state.userId}/study-summary`, { method: 'GET' });
      grid.innerHTML = `
        <div class="stat"><div class="stat-value">${summary.enrolledCourses ?? 0}</div><div class="stat-label">Khóa đã ghi danh</div></div>
        <div class="stat"><div class="stat-value">${summary.lessonsCompleted ?? 0}</div><div class="stat-label">Bài đã hoàn thành</div></div>
        <div class="stat"><div class="stat-value">${summary.averageQuizScore != null ? summary.averageQuizScore.toFixed(1) : '—'}</div><div class="stat-label">Điểm quiz trung bình</div></div>
        <div class="stat"><div class="stat-value">${summary.totalStudyMinutes ?? 0}</div><div class="stat-label">Phút học đã ghi nhận</div></div>
      `;
    } catch {
      grid.innerHTML = '<p class="muted">Không tải được tóm tắt. Hãy ghi danh khóa học và cập nhật tiến độ để xem số liệu.</p>';
    }
  }

  async function renderStudentExplore(content) {
    content.replaceChildren();
    let pendingQ = sessionStorage.getItem('studyhub_explore_q');
    if (pendingQ !== null) {
      sessionStorage.removeItem('studyhub_explore_q');
    }
    const initialQ = pendingQ != null ? pendingQ : '';

    let categoriesList = [];
    try {
      const cats = await request('course-categories', { method: 'GET' });
      categoriesList = Array.isArray(cats) ? cats : [];
    } catch {
      categoriesList = [];
    }

    content.appendChild(
      el(`
      <div class="course-explore course-explore--coursera">
        <p class="perm-hint student">Khám phá danh mục công khai và ghi danh (mã người dùng ${state.userId}).</p>
        <section class="explore-hero-section" aria-labelledby="exploreCatHeading">
          <h2 id="exploreCatHeading" class="explore-section-title">Khám phá theo chủ đề</h2>
          <div id="exCategoryPills" class="explore-category-pills" role="tablist" aria-label="Danh mục"></div>
        </section>
        <section class="explore-catalog-section" aria-labelledby="explorePopularHeading">
          <h2 id="explorePopularHeading" class="explore-section-title">Khóa học nổi bật</h2>
          <div id="exFilterChips" class="explore-filter-chips" role="group" aria-label="Lọc theo danh mục"></div>
          <div class="explore-search-card card">
            <div class="explore-search-inner">
              <label for="exSearch" class="visually-hidden">Từ khóa</label>
              <input type="search" id="exSearch" class="explore-search-input" placeholder="Tìm kỹ năng, công nghệ hoặc chủ đề…" value="${escapeAttr(initialQ)}" autocomplete="off" />
              <button type="button" class="btn btn-primary" id="exLoad">Tìm kiếm</button>
            </div>
            <p class="muted course-explore-hint" style="margin:0.65rem 0 0;font-size:0.82rem">Có <strong>từ khóa</strong> → tìm trên server; không thì lọc theo chủ đề đã chọn.</p>
          </div>
          <div id="exCatalog" class="course-card-grid course-card-grid--coursera" aria-live="polite"></div>
          <div class="explore-more-wrap">
            <button type="button" class="btn btn-outline-landing explore-more-btn" id="exShowMore" hidden>Xem thêm</button>
          </div>
        </section>
      </div>
    `)
    );

    const catalog = content.querySelector('#exCatalog');
    const pillsMount = content.querySelector('#exCategoryPills');
    const chipsMount = content.querySelector('#exFilterChips');
    const exShowMore = content.querySelector('#exShowMore');

    let activeCategoryId = '';
    try {
      const fromLanding = sessionStorage.getItem('studyhub_landing_cat');
      if (fromLanding !== null) {
        sessionStorage.removeItem('studyhub_landing_cat');
        activeCategoryId = String(fromLanding);
      }
    } catch {
      /* ignore */
    }
    let allLoadedCourses = [];
    let visibleCount = 8;
    const PAGE = 8;

    function phClass(id) {
      return `course-card-media--ph${Number(id) % 6}`;
    }

    function courseCard(c) {
      const desc = c.description ? String(c.description) : '';
      const short = desc.length > 140 ? `${desc.slice(0, 140)}…` : desc;
      const cover =
        c.coverImageUrl && String(c.coverImageUrl).trim()
          ? `<div class="course-card-media"><img src="${escapeAttr(c.coverImageUrl)}" alt="" loading="lazy" /></div>`
          : `<div class="course-card-media course-card-media--ph ${phClass(c.id)}" aria-hidden="true"></div>`;
      const stats = [];
      if (c.lessonCount != null) stats.push(`${c.lessonCount} bài học`);
      if (c.totalDurationMinutes != null && c.totalDurationMinutes > 0) {
        stats.push(`~${c.totalDurationMinutes} phút`);
      }
      const statsRow =
        stats.length > 0 ? `<p class="course-card-stats">${stats.join(' · ')}</p>` : '';
      const provider = escapeHtml(c.category ? `StudyHub · ${c.category}` : 'StudyHub');
      return `
      <article class="course-card course-card--coursera">
        ${cover}
        <div class="course-card-body">
          <div class="course-card-provider-row">
            <span class="course-card-provider-name">${provider}</span>
          </div>
          <h3 class="course-card-title">${escapeHtml(c.title)}</h3>
          ${statsRow}
          <p class="course-card-desc">${escapeHtml(short || 'Khám phá nội dung do đội ngũ biên soạn.')}</p>
          <p class="course-card-type-label">Khóa học</p>
          <button type="button" class="btn btn-primary course-card-cta" data-enroll-course="${c.id}">Ghi danh</button>
        </div>
      </article>`;
    }

    function renderPillsAndChips() {
      const items = [{ id: '', name: 'Tất cả' }].concat(
        categoriesList.map((x) => ({ id: String(x.id), name: x.name }))
      );
      const mkPill = (item) => {
        const active = activeCategoryId === item.id;
        return `<button type="button" role="tab" class="explore-cat-pill${active ? ' explore-cat-pill--active' : ''}" data-ex-cat="${item.id}" aria-selected="${active}">${escapeHtml(item.name)}</button>`;
      };
      const mkChip = (item) => {
        const active = activeCategoryId === item.id;
        return `<button type="button" class="explore-chip${active ? ' explore-chip--active' : ''}" data-ex-cat="${item.id}">${escapeHtml(item.name)}</button>`;
      };
      pillsMount.innerHTML = items.map(mkPill).join('');
      chipsMount.innerHTML = items.map(mkChip).join('');
    }

    function setActiveCategory(id) {
      activeCategoryId = id;
      renderPillsAndChips();
    }

    function renderCatalogSlice() {
      const slice = allLoadedCourses.slice(0, visibleCount);
      if (!slice.length) {
        catalog.innerHTML = '<p class="muted">Không có khóa học phù hợp. Thử từ khóa khác hoặc chọn chủ đề khác.</p>';
        exShowMore.hidden = true;
        return;
      }
      catalog.innerHTML = slice.map((c) => courseCard(c)).join('');
      exShowMore.hidden = visibleCount >= allLoadedCourses.length;
    }

    async function loadCourses() {
      catalog.innerHTML = '<p class="muted">Đang tải…</p>';
      exShowMore.hidden = true;
      const q = content.querySelector('#exSearch').value.trim();
      let path;
      if (q) {
        path = `courses/search?q=${encodeURIComponent(q)}`;
      } else if (activeCategoryId) {
        path = `courses?categoryId=${encodeURIComponent(activeCategoryId)}`;
      } else {
        path = 'courses';
      }
      try {
        const list = await request(path, { method: 'GET' });
        allLoadedCourses = Array.isArray(list) ? list : [];
        visibleCount = PAGE;
        renderCatalogSlice();
      } catch (e) {
        allLoadedCourses = [];
        catalog.innerHTML = `<p class="muted">${escapeHtml(e.message)}</p>`;
      }
    }

    function onCategoryPick(id) {
      content.querySelector('#exSearch').value = '';
      setActiveCategory(id);
      loadCourses();
    }

    renderPillsAndChips();

    pillsMount.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-ex-cat]');
      if (!btn) return;
      onCategoryPick(btn.dataset.exCat);
    });
    chipsMount.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-ex-cat]');
      if (!btn) return;
      onCategoryPick(btn.dataset.exCat);
    });

    content.querySelector('#exLoad').addEventListener('click', () => {
      loadCourses();
    });

    exShowMore.addEventListener('click', () => {
      visibleCount += PAGE;
      renderCatalogSlice();
    });

    catalog.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-enroll-course]');
      if (!btn) return;
      const courseId = Number(btn.dataset.enrollCourse);
      if (!courseId) return;
      showAppAlert('');
      try {
        await request('enrollments', {
          method: 'POST',
          body: { userId: state.userId, courseId },
        });
        showAppAlert('Đã ghi danh — vào <strong>Lớp của tôi</strong> để học.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });

    await loadCourses();
  }

  async function renderStudentClassroom(content) {
    content.replaceChildren();
    const shell = el(`
      <div>
        <div id="classroomMount"><p class="muted">Đang tải…</p></div>
      </div>
    `);
    content.appendChild(shell);
    const mount = content.querySelector('#classroomMount');
    const QUIZ_LESSON_TITLE = 'Kiểm tra / luyện tập';

    if (!content.querySelector('#stuQuizModal')) {
      content.appendChild(
        el(`
        <div id="stuQuizModal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="stuQuizModalTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="stuQuizModalBackdrop" role="presentation"></div>
          <div class="admin-modal-panel admin-modal-panel--wide">
            <button type="button" class="admin-modal-close" id="stuQuizModalClose" aria-label="Đóng">×</button>
            <h2 id="stuQuizModalTitle" class="admin-modal-title">Kiểm tra / luyện tập</h2>
            <div id="stuQuizList" style="margin-top:0.75rem"></div>
          </div>
        </div>
      `)
      );
    }

    const quizModal = content.querySelector('#stuQuizModal');
    const quizList = content.querySelector('#stuQuizList');
    let activeLessonId = 0;

    async function load() {
      mount.innerHTML = '<p class="muted">Đang tải…</p>';
      try {
        const courses = await request(`learning/users/${state.userId}/my-courses`, { method: 'GET' });
        if (!Array.isArray(courses) || courses.length === 0) {
          mount.innerHTML =
            '<div class="card"><p class="muted">Bạn chưa ghi danh khóa nào. Vào mục <strong>Khám phá khóa học</strong> để chọn khóa.</p></div>';
          return;
        }

        mount.innerHTML = courses
          .map((c) => {
            const pct =
              c.totalLessons > 0 ? Math.round((100 * c.completedLessons) / c.totalLessons) : 0;
            const lessonBlocks = (c.lessons || [])
              .map((l) => {
                const lockNote = l.unlocked
                  ? ''
                  : ' <span class="muted" style="font-size:0.78rem">(chưa mở khóa)</span>';
                const isQuizLesson = String(l.title || '').trim() === QUIZ_LESSON_TITLE;
                const player = !l.unlocked
                  ? '<p class="muted" style="margin:0">Hoàn thành bài trước để xem nội dung.</p>'
                  : isQuizLesson
                    ? `<button type="button" class="btn btn-primary" data-action="open-quiz" data-lesson-id="${l.lessonId}">Vào bài kiểm tra</button>`
                    : lessonPlayerHtml(l.contentUrl);
                const doneBtn =
                  l.completed && l.unlocked
                    ? '<span class="muted">Đã hoàn thành</span>'
                    : l.unlocked
                      ? `<button type="button" class="btn btn-sm btn-primary" data-action="complete-lesson" data-lesson-id="${l.lessonId}">Đánh dấu hoàn thành</button>`
                      : '<span class="muted">—</span>';
                return `<article class="lesson-block ${l.unlocked ? '' : 'lesson-block--locked'}" data-lesson-id="${l.lessonId}">
                  <div class="lesson-block-head">
                    <h3 class="lesson-block-title"><span class="lesson-block-order">${l.orderIndex}.</span> ${escapeHtml(l.title)}${lockNote}</h3>
                    <p class="lesson-block-meta muted" style="margin:0.35rem 0 0;font-size:0.88rem">Quiz: ${l.quizCount} · Đã xong: ${l.completed ? 'Có' : 'Chưa'}</p>
                  </div>
                  <div class="lesson-block-player">${player}</div>
                  <div class="lesson-block-actions">${doneBtn}</div>
                </article>`;
              })
              .join('');

            return `
            <section class="card classroom-course-card" style="margin-bottom:1.25rem">
              <h2>${escapeHtml(c.courseTitle)}</h2>
              <p class="muted" style="margin:0 0 0.75rem">${escapeHtml(c.category || '')} · ${escapeHtml(c.level || '')}</p>
              <p style="margin:0 0 1rem;font-size:0.9rem"><strong>Tiến độ:</strong> ${c.completedLessons}/${c.totalLessons} bài (${pct}%)</p>
              <div class="classroom-lesson-list">${lessonBlocks}</div>
            </section>`;
          })
          .join('');
      } catch (e) {
        mount.innerHTML = `<div class="card"><p class="muted">${escapeHtml(e.message)}</p></div>`;
      }
    }

    mount.addEventListener('click', async (ev) => {
      const openQuiz = ev.target.closest('[data-action="open-quiz"]');
      if (openQuiz?.dataset.lessonId) {
        ev.preventDefault();
        const lid = Number(openQuiz.dataset.lessonId);
        if (!lid) return;
        activeLessonId = lid;
        if (quizModal) {
          quizModal.classList.remove('hidden');
          quizModal.setAttribute('aria-hidden', 'false');
        }
        if (quizList) {
          quizList.innerHTML = '<p class="muted">Đang tải…</p>';
          try {
            const list = await request(`lessons/${lid}/quizzes`, { method: 'GET' });
            if (!Array.isArray(list) || !list.length) {
              quizList.innerHTML = '<p class="muted">Chưa có quiz.</p>';
            } else {
              quizList.innerHTML =
                `<div class="table-wrap"><table><thead><tr><th>Quiz</th><th style="width:220px">Điểm (0–100)</th><th></th></tr></thead><tbody>` +
                list
                  .map(
                    (q) =>
                      `<tr data-quiz-id="${q.id}">` +
                      `<td>${escapeHtml(q.title || '')}</td>` +
                      `<td><input type="number" step="0.1" min="0" max="100" value="80" style="width:100%; padding:0.45rem 0.55rem; border:2px solid var(--border); border-radius:10px; font:inherit; background:#fafcff" /></td>` +
                      `<td style="white-space:nowrap"><button type="button" class="btn btn-sm btn-accent" data-action="submit-quiz-score">Nộp điểm</button></td>` +
                      `</tr>`
                  )
                  .join('') +
                `</tbody></table></div>`;
            }
          } catch (err) {
            quizList.innerHTML = '<p class="muted">' + escapeHtml(err.message) + '</p>';
          }
        }
        return;
      }

      const doneEl = ev.target.closest('[data-action="complete-lesson"]');
      if (doneEl?.dataset.lessonId) {
        showAppAlert('');
        try {
          await request('progress', {
            method: 'PUT',
            body: {
              userId: state.userId,
              lessonId: Number(doneEl.dataset.lessonId),
              completed: true,
            },
          });
          showAppAlert('Đã lưu tiến độ bài học.', 'ok');
          await load();
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      }
    });

    if (quizList) {
      quizList.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('[data-action="submit-quiz-score"]');
        if (!btn) return;
        const row = ev.target.closest('tr[data-quiz-id]');
        if (!row) return;
        const quizId = Number(row.dataset.quizId);
        const input = row.querySelector('input[type="number"]');
        const score = input ? Number(input.value) : NaN;
        if (!quizId || !Number.isFinite(score)) return;
        showAppAlert('');
        try {
          await request('quiz-results', {
            method: 'POST',
            body: { userId: state.userId, quizId, score },
          });
          showAppAlert('Đã lưu điểm quiz.', 'ok');
          // đánh dấu tiến độ bài "Kiểm tra / luyện tập" là hoàn thành (tuỳ chọn)
          if (activeLessonId) {
            await request('progress', {
              method: 'PUT',
              body: { userId: state.userId, lessonId: activeLessonId, completed: true },
            });
            await load();
          }
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      });
    }

    function closeQuizModal() {
      if (!quizModal) return;
      quizModal.classList.add('hidden');
      quizModal.setAttribute('aria-hidden', 'true');
      activeLessonId = 0;
    }
    ['#stuQuizModalClose', '#stuQuizModalBackdrop'].forEach((sel) => {
      const el = content.querySelector(sel);
      if (el) el.addEventListener('click', closeQuizModal);
    });

    await load();
  }

  function renderStudentLearn(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint student">Chọn khóa đã ghi danh, rồi xem bài học và quiz tương ứng</span>
        <div class="card">
          <h2>1 · Bài học trong một khóa</h2>
          <div class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Mã khóa học</label>
              <input type="number" id="lrCourse" min="1" />
            </div>
            <button type="button" class="btn btn-primary" id="lrLessons">Tải danh sách bài</button>
          </div>
          <div id="lrLessTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>2 · Quiz của một bài học</h2>
          <div class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Mã bài học</label>
              <input type="number" id="lrLesson" min="1" />
            </div>
            <button type="button" class="btn btn-primary" id="lrQuizzes">Tải danh sách quiz</button>
          </div>
          <div id="lrQuizTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>3 · Gửi điểm quiz</h2>
          <form id="lrSubmit">
            <div class="grid-2">
              <div class="field"><label>Mã quiz</label><input name="quizId" type="number" min="1" required /></div>
              <div class="field"><label>Điểm (0–100)</label><input name="score" type="number" step="0.1" min="0" max="100" value="80" required /></div>
            </div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <button type="submit" class="btn btn-accent">Gửi kết quả quiz</button>
          </form>
        </div>
      </div>
    `)
    );

    content.querySelector('#lrLessons').addEventListener('click', async () => {
      const cid = content.querySelector('#lrCourse').value;
      const out = content.querySelector('#lrLessTable');
      if (!cid) {
        out.innerHTML = '<p class="muted">Nhập mã khóa học.</p>';
        return;
      }
      try {
        const list = await request(`courses/${cid}/lessons`, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">Không có bài học.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tiêu đề</th><th>Thứ tự</th><th>Phút</th></tr></thead><tbody>` +
          list.map((l) => `<tr><td>${l.id}</td><td>${escapeHtml(l.title)}</td><td>${l.orderIndex}</td><td>${l.duration}</td></tr>`).join('') +
          `</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    });

    content.querySelector('#lrQuizzes').addEventListener('click', async () => {
      const lid = content.querySelector('#lrLesson').value;
      const out = content.querySelector('#lrQuizTable');
      if (!lid) {
        out.innerHTML = '<p class="muted">Nhập mã bài học.</p>';
        return;
      }
      try {
        const list = await request(`lessons/${lid}/quizzes`, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">Không có quiz.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tiêu đề</th></tr></thead><tbody>` +
          list.map((q) => `<tr><td>${q.id}</td><td>${escapeHtml(q.title)}</td></tr>`).join('') +
          `</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    });

    content.querySelector('#lrSubmit').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      try {
        await request('quiz-results', {
          method: 'POST',
          body: {
            userId: Number(fd.get('userId')),
            quizId: Number(fd.get('quizId')),
            score: Number(fd.get('score')),
          },
        });
        showAppAlert('Đã lưu kết quả quiz.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  function renderStudentTrack(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint student">Mọi thao tác dùng mã học viên của bạn: ${state.userId}</span>
        <div class="card">
          <h2>Tiến độ bài học</h2>
          <button type="button" class="btn btn-ghost" id="trLoad">Tải lại tiến độ</button>
          <div id="trProg" style="margin-top:1rem"></div>
          <h3>Cập nhật tiến độ</h3>
          <form id="trUpsert" class="grid-2">
            <div class="field"><label>Mã bài học</label><input name="lessonId" type="number" min="1" required /></div>
            <div class="field"><label>Hoàn thành</label><select name="completed"><option value="true">Có</option><option value="false">Chưa</option></select></div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-primary">Lưu tiến độ</button></div>
          </form>
        </div>
        <div class="card">
          <h2>Nhật ký phiên học</h2>
          <form id="trLog" class="grid-2">
            <div class="field"><label>Mã bài học</label><input name="lessonId" type="number" min="1" required /></div>
            <div class="field"><label>Số phút học</label><input name="timeSpent" type="number" min="1" value="30" required /></div>
            <div class="field"><label>Điểm luyện tập (tuỳ chọn)</label><input name="score" type="number" step="0.1" placeholder="ví dụ: 72" /></div>
            <div class="field"><label>Lần thử thứ</label><input name="attempt" type="number" min="1" value="1" required /></div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-accent">Ghi nhật ký</button></div>
          </form>
        </div>
      </div>
    `)
    );

    async function loadProg() {
      const out = content.querySelector('#trProg');
      try {
        const list = await request(`progress/user/${state.userId}`, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">Chưa có dòng tiến độ nào.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>Bài học</th><th>Xong</th><th>Hoàn thành lúc</th></tr></thead><tbody>` +
          list.map((p) => `<tr><td>${p.lessonId}</td><td>${p.completed ? 'Có' : 'Chưa'}</td><td>${p.completedAt || '—'}</td></tr>`).join('') +
          `</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    }

    content.querySelector('#trLoad').addEventListener('click', loadProg);
    content.querySelector('#trUpsert').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      try {
        await request('progress', {
          method: 'PUT',
          body: {
            userId: Number(fd.get('userId')),
            lessonId: Number(fd.get('lessonId')),
            completed: fd.get('completed') === 'true',
          },
        });
        showAppAlert('Đã cập nhật tiến độ.', 'ok');
        loadProg();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
    content.querySelector('#trLog').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      const body = {
        userId: Number(fd.get('userId')),
        lessonId: Number(fd.get('lessonId')),
        timeSpent: Number(fd.get('timeSpent')),
        attempt: Number(fd.get('attempt')),
      };
      const sc = fd.get('score');
      if (sc) body.score = Number(sc);
      try {
        await request('study-logs', { method: 'POST', body });
        showAppAlert('Đã lưu nhật ký học.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
    loadProg();
  }

  async function renderStudentCoach(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint student">Gợi ý dựa trên ghi danh, điểm quiz và nhật ký học của bạn</span>
        <div class="grid-2">
          <div class="card">
            <h2>Tóm tắt học tập</h2>
            <pre class="pre" id="chSum">Đang tải…</pre>
          </div>
          <div class="card">
            <h2>Danh sách ôn tập ưu tiên</h2>
            <pre class="pre" id="chRec">Đang tải…</pre>
          </div>
        </div>
      </div>
    `)
    );
    try {
      const s = await request(`users/${state.userId}/study-summary`, { method: 'GET' });
      content.querySelector('#chSum').textContent = JSON.stringify(s, null, 2);
    } catch (e) {
      content.querySelector('#chSum').textContent = e.message;
    }
    try {
      const r = await request(`users/${state.userId}/recommendations`, { method: 'GET' });
      content.querySelector('#chRec').textContent = JSON.stringify(r, null, 2);
    } catch (e) {
      content.querySelector('#chRec').textContent = e.message;
    }
  }

  /* ---------- Admin views ---------- */

  async function renderAdminHome(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">Chỉ nhân sự · Quản trị hoặc Giảng viên</span>
        <div class="stat-grid" id="admStats"></div>
        <p class="muted" style="margin-top:1rem">Số liệu tải trực tiếp từ API. Học viên không thấy trang này.</p>
      </div>
    `)
    );
    const grid = content.querySelector('#admStats');
    let users = 0,
      courses = 0;
    try {
      const u = await request('users', { method: 'GET' });
      users = Array.isArray(u) ? u.length : 0;
    } catch {
      /* ignore */
    }
    try {
      const c = await request('courses/management', { method: 'GET' });
      courses = Array.isArray(c) ? c.length : 0;
    } catch {
      /* ignore */
    }
    grid.innerHTML = `
      <div class="stat"><div class="stat-value">${users}</div><div class="stat-label">Tài khoản đã đăng ký</div></div>
      <div class="stat"><div class="stat-value">${courses}</div><div class="stat-label">Khóa trong hệ thống</div></div>
      <div class="stat"><div class="stat-value">${state.userId}</div><div class="stat-label">Mã nhân sự của bạn</div></div>
    `;
  }

  async function renderAdminMembers(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">Danh bạ nhân sự · danh sách chỉ đọc từ GET /users</span>
        <div class="card">
          <h2>Tất cả thành viên</h2>
          <button type="button" class="btn btn-primary" id="memLoad">Tải lại danh sách</button>
          <div id="memTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>Chi tiết thành viên</h2>
          <form id="memOne" class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Mã người dùng</label>
              <input name="userId" type="number" min="1" required />
            </div>
            <button type="submit" class="btn btn-ghost">Lấy hồ sơ</button>
          </form>
          <pre class="pre" id="memPre" hidden style="margin-top:1rem"></pre>
        </div>
      </div>
    `)
    );

    async function loadAll() {
      const out = content.querySelector('#memTable');
      try {
        const list = await request('users', { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">Không có người dùng.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Tên</th><th>Email</th></tr></thead><tbody>` +
          list
            .map(
              (u) =>
                `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(roleLabelVi(u.role))}</td><td>${escapeHtml(u.name || '')}</td><td>${escapeHtml(u.email || '')}</td></tr>`
            )
            .join('') +
          `</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    }

    content.querySelector('#memLoad').addEventListener('click', loadAll);
    content.querySelector('#memOne').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = e.target.userId.value;
      const pre = content.querySelector('#memPre');
      try {
        const u = await request(`users/${id}`, { method: 'GET' });
        pre.hidden = false;
        pre.textContent = JSON.stringify(u, null, 2);
      } catch (err) {
        pre.hidden = true;
        showAppAlert(err.message, 'error');
      }
    });
    loadAll();
  }

  function renderAdminCourses(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">Thao tác khóa học gắn với tài khoản staff (creator ID). Chỉ trạng thái <strong>PUBLISHED</strong> mới hiện trên catalog học viên.</span>
        <div class="card admin-course-page">
          <div class="admin-course-toolbar">
            <h2>Danh sách khóa học</h2>
          </div>
          <div class="admin-course-actions-bar">
            <div class="admin-course-search-wrap">
              <label for="adCourseSearch" class="visually-hidden">Tìm khóa học</label>
              <input type="search" id="adCourseSearch" class="admin-course-search-input" placeholder="Tìm theo tiêu đề, ID, trạng thái, danh mục…" autocomplete="off" />
            </div>
            <div class="admin-course-actions">
              <button type="button" class="btn btn-ghost" id="catBtnOpenManager" title="Thêm, sửa, xoá nhóm khóa học">Quản lý danh mục</button>
              <button type="button" class="btn btn-primary" id="adBtnOpenCreate">+ Thêm</button>
              <button type="button" class="btn btn-ghost" id="adCatLoad">Tải lại</button>
            </div>
          </div>
          <p class="muted admin-course-hint">Dùng nút <strong>Sửa</strong> / <strong>Xoá</strong> cạnh tên khóa học. Ô tìm kiếm để lọc nhanh.</p>
          <div id="adCat"></div>
        </div>
        <div id="adCourseModal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="adCourseModalTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="adCourseModalBackdrop" role="presentation"></div>
          <div class="admin-modal-panel">
            <button type="button" class="admin-modal-close" id="adCourseModalClose" aria-label="Đóng">×</button>
            <h2 id="adCourseModalTitle" class="admin-modal-title">Thêm khóa học mới</h2>
            <form id="adCourse">
              <div class="field"><label>Tiêu đề</label><input name="title" required /></div>
              <div class="field"><label>Mô tả</label><textarea name="description"></textarea></div>
              <div class="grid-2">
                <div class="field"><label>Danh mục</label><select name="categoryId" id="adCreateCat" required></select></div>
                <div class="field"><label>Cấp độ</label><input name="level" placeholder="ví dụ: Cơ bản" /></div>
              </div>
              <div class="field"><label>Ảnh bìa (URL)</label><input name="coverImageUrl" type="url" placeholder="https://…" /></div>
              <div class="grid-2">
                <div class="field"><label>Ngôn ngữ</label><input name="language" placeholder="vi" /></div>
                <div class="field"><label>Trạng thái</label>
                  <select name="status">
                    <option value="PUBLISHED" selected>Đã xuất bản (catalog)</option>
                    <option value="DRAFT">Bản nháp (ẩn)</option>
                    <option value="ARCHIVED">Đã gỡ</option>
                  </select>
                </div>
              </div>
              <input type="hidden" name="createdByUserId" id="adCreatedByUserId" value="${state.userId}" />
              <div class="admin-modal-actions">
                <button type="button" class="btn btn-ghost" id="adCourseModalCancel">Huỷ</button>
                <button type="submit" class="btn btn-primary">Tạo khóa học</button>
              </div>
            </form>
            <pre class="pre" id="adCourseOut" hidden style="margin-top:1rem"></pre>
          </div>
        </div>
        <div id="adEditModal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="adEditModalTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="adEditModalBackdrop" role="presentation"></div>
          <div class="admin-modal-panel">
            <button type="button" class="admin-modal-close" id="adEditModalClose" aria-label="Đóng">×</button>
            <h2 id="adEditModalTitle" class="admin-modal-title">Sửa khóa học</h2>
            <form id="adCourseEdit">
              <input type="hidden" id="adEditCourseId" value="" />
              <div class="field"><label>Tiêu đề</label><input name="title" required /></div>
              <div class="field"><label>Mô tả</label><textarea name="description"></textarea></div>
              <div class="grid-2">
                <div class="field"><label>Danh mục</label><select name="categoryId" id="adEditCat" required></select></div>
                <div class="field"><label>Cấp độ</label><input name="level" /></div>
              </div>
              <div class="field"><label>Ảnh bìa (URL)</label><input name="coverImageUrl" type="url" /></div>
              <div class="grid-2">
                <div class="field"><label>Ngôn ngữ</label><input name="language" /></div>
                <div class="field"><label>Trạng thái</label>
                  <select name="status">
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="ARCHIVED">Đã gỡ</option>
                  </select>
                </div>
              </div>
              <div class="admin-modal-actions">
                <button type="button" class="btn btn-ghost" id="adEditModalCancel">Huỷ</button>
                <button type="submit" class="btn btn-primary">Cập nhật khóa học</button>
              </div>
            </form>
          </div>
        </div>
        <div id="catManagerModal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="catManagerTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="catManagerBackdrop" role="presentation"></div>
          <div class="admin-modal-panel admin-modal-panel--wide">
            <button type="button" class="admin-modal-close" id="catManagerClose" aria-label="Đóng">×</button>
            <h2 id="catManagerTitle" class="admin-modal-title">Quản lý danh mục</h2>
            <div class="admin-course-toolbar" style="margin-top:-0.25rem;margin-bottom:0.5rem">
              <div class="admin-course-toolbar-actions" style="width:100%;justify-content:flex-end;gap:0.5rem">
                <button type="button" class="btn btn-primary" id="catBtnAdd">+ Thêm danh mục</button>
                <button type="button" class="btn btn-ghost" id="catBtnReload">Tải lại</button>
              </div>
            </div>
            <p class="muted admin-course-hint">Dùng khi gán khóa học vào nhóm. Chỉ xoá được khi không còn khóa học nào dùng danh mục.</p>
            <div id="catTableWrap"></div>
          </div>
        </div>
        <div id="catModal" class="admin-modal-overlay admin-modal--nested hidden" role="dialog" aria-modal="true" aria-labelledby="catModalTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="catModalBackdrop" role="presentation"></div>
          <div class="admin-modal-panel">
            <button type="button" class="admin-modal-close" id="catModalClose" aria-label="Đóng">×</button>
            <h2 id="catModalTitle" class="admin-modal-title">Thêm danh mục</h2>
            <form id="catForm">
              <input type="hidden" id="catEditId" value="" />
              <div class="field"><label>Tên danh mục</label><input name="name" required maxlength="255" placeholder="Ví dụ: Khoa học máy tính" /></div>
              <div class="admin-modal-actions">
                <button type="button" class="btn btn-ghost" id="catModalCancel">Huỷ</button>
                <button type="submit" class="btn btn-primary" id="catModalSubmit">Lưu</button>
              </div>
            </form>
          </div>
        </div>
        <div id="adLessonsModal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="adLessonsModalTitle" aria-hidden="true">
          <div class="admin-modal-backdrop" id="adLessonsModalBackdrop" role="presentation"></div>
          <div class="admin-modal-panel admin-modal-panel--wide">
            <button type="button" class="admin-modal-close" id="adLessonsModalClose" aria-label="Đóng">×</button>
            <h2 id="adLessonsModalTitle" class="admin-modal-title">Bài học</h2>
            <p class="muted admin-course-hint" style="margin-top:-0.25rem">Mỗi bài = một video: link YouTube, Vimeo, hoặc URL .mp4. Học viên xem nhúng trong <strong>Lớp của tôi</strong>.</p>
            <div id="adLessonsList" class="ad-lessons-list-wrap"></div>
            <form id="adLessonForm" class="card" style="margin-top:1rem">
              <h3 style="margin:0 0 0.75rem;font-size:1rem">Thêm bài học</h3>
              <input type="hidden" name="courseId" id="adLessonsCourseId" value="" />
              <div class="field"><label>Tiêu đề</label><input name="title" required placeholder="Ví dụ: Giới thiệu Spring Boot" /></div>
              <div class="field"><label>URL nội dung</label><input name="contentUrl" type="url" required placeholder="https://www.youtube.com/watch?v=…" /></div>
              <div class="grid-2">
                <div class="field"><label>Thứ tự</label><input name="orderIndex" type="number" min="1" required value="1" /></div>
                <div class="field"><label>Thời lượng (phút)</label><input name="duration" type="number" min="1" required value="15" /></div>
              </div>
              <button type="submit" class="btn btn-primary">Thêm bài</button>
            </form>
          </div>
        </div>
      </div>
    `)
    );

    const adCat = content.querySelector('#adCat');
    const adCourseModal = content.querySelector('#adCourseModal');
    const adEditModal = content.querySelector('#adEditModal');
    const searchInput = content.querySelector('#adCourseSearch');

    const catManagerModal = content.querySelector('#catManagerModal');
    const catBtnOpenManager = content.querySelector('#catBtnOpenManager');
    const catWrap = content.querySelector('#catTableWrap');
    const catModal = content.querySelector('#catModal');
    const catForm = content.querySelector('#catForm');
    const catTitleEl = content.querySelector('#catModalTitle');
    const catEditId = content.querySelector('#catEditId');
    const adLessonsModal = content.querySelector('#adLessonsModal');
    const adLessonsList = content.querySelector('#adLessonsList');
    const adLessonForm = content.querySelector('#adLessonForm');
    const hasCatUi = !!(
      catManagerModal &&
      catBtnOpenManager &&
      catWrap &&
      catModal &&
      catForm &&
      catTitleEl &&
      catEditId
    );

    function sortCategoriesByName(cats) {
      if (!Array.isArray(cats)) return [];
      return [...cats].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
      );
    }

    function selectedCategorySelectValues() {
      const create = content.querySelector('#adCreateCat');
      const edit = content.querySelector('#adEditCat');
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
        const el = content.querySelector(sel);
        if (el) el.innerHTML = html;
      });
      const c1 = content.querySelector('#adCreateCat');
      if (c1 && prev.create && [...c1.options].some((o) => o.value === prev.create)) {
        c1.value = prev.create;
      }
      const c2 = content.querySelector('#adEditCat');
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
                <button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger" data-cat-del="${c.id}">Xoá</button>
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

    let catalogAll = [];
    let lastFiltered = [];

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
    }

    function closeEditModal() {
      adEditModal.classList.add('hidden');
      adEditModal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', escCloseEditModal);
    }

    function fillEditForm(c) {
      const f = content.querySelector('#adCourseEdit');
      content.querySelector('#adEditCourseId').value = String(c.id);
      f.querySelector('[name="title"]').value = c.title || '';
      f.querySelector('[name="description"]').value = c.description || '';
      const catSel = f.querySelector('[name="categoryId"]');
      if (catSel && c.categoryId != null) {
        catSel.value = String(c.categoryId);
      }
      f.querySelector('[name="level"]').value = c.level || '';
      f.querySelector('[name="coverImageUrl"]').value = c.coverImageUrl || '';
      f.querySelector('[name="language"]').value = c.language || '';
      const st = f.querySelector('[name="status"]');
      if (c.status && st.querySelector(`option[value="${c.status}"]`)) {
        st.value = c.status;
      }
    }

    async function openEditForCourse(courseId) {
      showAppAlert('');
      try {
        const c = await request(`courses/management/${courseId}`, { method: 'GET' });
        fillEditForm(c);
        openEditModal();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    }

    async function deleteCourseById(courseId) {
      if (!courseId || !window.confirm(`Xoá hẳn khóa học #${courseId}? Ghi danh, tiến độ, quiz… liên quan cũng bị xoá.`)) {
        return;
      }
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

    async function loadLessonsForCourse(courseId) {
      if (!adLessonsList) return;
      adLessonsList.innerHTML = '<p class="muted">Đang tải…</p>';
      try {
        const list = await request(`courses/${courseId}/lessons`, { method: 'GET' });
        const oiInput = content.querySelector('#adLessonForm [name="orderIndex"]');
        if (!Array.isArray(list) || !list.length) {
          adLessonsList.innerHTML = '<p class="muted">Chưa có bài học.</p>';
          if (oiInput) oiInput.value = '1';
          return;
        }
        if (oiInput) {
          const max = Math.max(...list.map((x) => Number(x.orderIndex) || 0));
          oiInput.value = String(max + 1);
        }
        adLessonsList.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>Thứ tự</th><th>Tiêu đề</th><th>Phút</th><th>URL</th></tr></thead><tbody>` +
          list
            .map((l) => {
              const u = l.contentUrl ? String(l.contentUrl) : '';
              const short = u.length > 52 ? `${u.slice(0, 50)}…` : u;
              return `<tr><td>${l.orderIndex}</td><td>${escapeHtml(l.title)}</td><td>${l.duration}</td><td><code style="font-size:0.75rem">${escapeHtml(short || '—')}</code></td></tr>`;
            })
            .join('') +
          `</tbody></table></div>`;
      } catch (e) {
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
    }

    function openLessonsModal(courseId) {
      if (!adLessonsModal) return;
      const hid = content.querySelector('#adLessonsCourseId');
      const title = content.querySelector('#adLessonsModalTitle');
      if (hid) hid.value = String(courseId);
      if (title) title.textContent = `Bài học — khóa #${courseId}`;
      adLessonsModal.classList.remove('hidden');
      adLessonsModal.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', escLessonsModal);
      loadLessonsForCourse(courseId);
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
          `<button type="button" class="btn btn-sm btn-ghost ad-course-row-lessons" data-course-id="${c.id}" title="Bài học (video)">Bài học</button>` +
          `<button type="button" class="btn btn-sm btn-ghost ad-course-row-edit" data-course-id="${c.id}" aria-label="Sửa khóa học #${c.id}">Sửa</button>` +
          `<button type="button" class="btn btn-sm btn-ghost student-dropdown-item--danger ad-course-row-delete" data-course-id="${c.id}" aria-label="Xoá khóa học #${c.id}">Xoá</button>` +
          `</span></div>`
        );
      }

      adCat.innerHTML =
        `<div class="table-wrap"><table class="ad-course-table"><thead><tr><th>ID</th><th>Tiêu đề</th><th>Trạng thái</th><th>Bài học</th><th>Danh mục</th><th>Người tạo</th></tr></thead><tbody>` +
        list
          .map(
            (c) =>
              `<tr data-course-id="${c.id}"><td>${c.id}</td><td class="ad-course-title-cell">${titleCell(c)}</td><td>${escapeHtml(c.status || '')}</td><td>${c.lessonCount ?? '—'}</td><td>${escapeHtml(c.category || '')}</td><td>${c.createdByUserId}</td></tr>`
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
      const el = content.querySelector(sel);
      if (el) el.addEventListener('click', closeLessonsModal);
    });

    if (adLessonForm) {
      adLessonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAppAlert('');
        const fd = new FormData(adLessonForm);
        const courseId = Number(fd.get('courseId'));
        if (!courseId) return;
        const body = {
          title: fd.get('title'),
          contentUrl: fd.get('contentUrl'),
          orderIndex: Number(fd.get('orderIndex')),
          duration: Number(fd.get('duration')),
        };
        try {
          await request(`courses/${courseId}/lessons`, { method: 'POST', body });
          showAppAlert('Đã thêm bài học.', 'ok');
          adLessonForm.querySelector('[name="title"]').value = '';
          adLessonForm.querySelector('[name="contentUrl"]').value = '';
          await loadLessonsForCourse(courseId);
          await loadAdminCatalog();
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      });
    }

    content.querySelector('#adBtnOpenCreate').addEventListener('click', () => {
      const form = content.querySelector('#adCourse');
      form.reset();
      const st = form.querySelector('[name="status"]');
      if (st) st.value = 'PUBLISHED';
      const hid = content.querySelector('#adCreatedByUserId');
      if (hid) hid.value = String(state.userId ?? '');
      content.querySelector('#adCourseOut').hidden = true;
      openCreateCourseModal();
    });
    ['#adCourseModalClose', '#adCourseModalCancel', '#adCourseModalBackdrop'].forEach((sel) => {
      content.querySelector(sel).addEventListener('click', () => closeCreateCourseModal());
    });

    ['#adEditModalClose', '#adEditModalCancel', '#adEditModalBackdrop'].forEach((sel) => {
      content.querySelector(sel).addEventListener('click', () => closeEditModal());
    });

    content.querySelector('#adCourse').addEventListener('submit', async (e) => {
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
        createdByUserId: Number(fd.get('createdByUserId')),
      };
      const pre = content.querySelector('#adCourseOut');
      try {
        await request('courses', { method: 'POST', body });
        pre.hidden = true;
        pre.textContent = '';
        showAppAlert('Đã tạo khóa học.', 'ok');
        e.target.reset();
        const st = e.target.querySelector('[name="status"]');
        if (st) st.value = 'PUBLISHED';
        const hid = content.querySelector('#adCreatedByUserId');
        if (hid) hid.value = String(state.userId ?? '');
        closeCreateCourseModal();
        await loadAdminCatalog();
      } catch (err) {
        pre.hidden = true;
        showAppAlert(err.message, 'error');
      }
    });

    content.querySelector('#adCourseEdit').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      const id = Number(content.querySelector('#adEditCourseId').value);
      if (!id) {
        showAppAlert('Thiếu ID khóa học.', 'error');
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

    content.querySelector('#adCatLoad').addEventListener('click', loadAdminCatalog);

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
        content.querySelector(sel).addEventListener('click', closeCatManager);
      });
      content.querySelector('#catBtnAdd').addEventListener('click', () => {
        catForm.reset();
        catEditId.value = '';
        openCatModal(false);
      });
      content.querySelector('#catBtnReload').addEventListener('click', loadCatTable);
      ['#catModalClose', '#catModalCancel', '#catModalBackdrop'].forEach((sel) => {
        content.querySelector(sel).addEventListener('click', closeCatModal);
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
          if (!id || !window.confirm('Xoá danh mục này? Chỉ thực hiện được khi không còn khóa học nào dùng danh mục.')) {
            return;
          }
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

    (async function bootstrapAdminCourseCats() {
      try {
        await fetchCategoriesAndFillSelects();
      } catch (err) {
        showAppAlert('Không tải được danh sách danh mục.', 'error');
      }
      await loadAdminCatalog();
    })();
  }

  function renderAdminContent(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">Tạo đánh giá và nhập điểm cho học viên (chấm điểm)</span>
        <div class="card">
          <h2>Tạo quiz cho bài học</h2>
          <form id="adQuiz" class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Mã bài học</label>
              <input name="lessonId" type="number" min="1" required />
            </div>
            <div class="field" style="flex:1;min-width:180px;margin-bottom:0">
              <label>Tên quiz</label>
              <input name="title" required />
            </div>
            <button type="submit" class="btn btn-primary">Tạo quiz</button>
          </form>
        </div>
        <div class="card">
          <h2>Ghi kết quả quiz (mọi học viên)</h2>
          <form id="adResult" class="grid-2">
            <div class="field"><label>Mã học viên</label><input name="userId" type="number" min="1" required /></div>
            <div class="field"><label>Mã quiz</label><input name="quizId" type="number" min="1" required /></div>
            <div class="field" style="grid-column:1/-1"><label>Điểm</label><input name="score" type="number" step="0.1" min="0" max="100" value="75" required /></div>
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-accent">Lưu kết quả</button></div>
          </form>
        </div>
      </div>
    `)
    );

    content.querySelector('#adQuiz').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      try {
        await request(`lessons/${fd.get('lessonId')}/quizzes`, {
          method: 'POST',
          body: { title: fd.get('title') },
        });
        showAppAlert('Đã tạo quiz.', 'ok');
        e.target.reset();
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });

    content.querySelector('#adResult').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      try {
        await request('quiz-results', {
          method: 'POST',
          body: {
            userId: Number(fd.get('userId')),
            quizId: Number(fd.get('quizId')),
            score: Number(fd.get('score')),
          },
        });
        showAppAlert('Đã lưu kết quả.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  /* ---------- Gate & boot ---------- */

  function initGateTabs() {
    const tabs = document.querySelectorAll('.gate-tab');
    if (!tabs.length) return;
    const forms = document.querySelectorAll('.gate-form');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        tabs.forEach((t) => {
          t.classList.toggle('active', t.dataset.tab === name);
          t.setAttribute('aria-selected', t.dataset.tab === name);
        });
        forms.forEach((f) => f.classList.toggle('hidden', f.dataset.panel !== name));
        showGateAlert('');
      });
    });
  }

  const formLoginEl = document.getElementById('formLogin');
  if (formLoginEl) {
    formLoginEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      showGateAlert('');
      const fd = new FormData(form);
      const username = String(fd.get('username') || '').trim();
      const password = fd.get('password');
      if (username.length < 5) {
        showGateAlert('Tên đăng nhập cần ít nhất 5 ký tự (không tính khoảng trắng đầu/cuối).', 'error');
        return;
      }
      setGateLoading(form, true);
      try {
        const data = await request('auth/login', {
          method: 'POST',
          body: { username, password },
        });
        applyAuth(unwrap(data));
        if (isStaff()) {
          window.location.href = 'admin.html';
          return;
        }
        window.location.href = 'student/study-landing.html';
      } catch (err) {
        showGateAlert(gateErrorMessage(err), 'error');
      } finally {
        setGateLoading(form, false);
      }
    });
  }

  const formRegisterEl = document.getElementById('formRegister');
  if (formRegisterEl) {
    formRegisterEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      showGateAlert('');
      const fd = new FormData(form);
      const username = String(fd.get('username') || '').trim();
      const password = fd.get('password');
      const password2 = fd.get('passwordConfirm');
      const nameRaw = String(fd.get('name') || '').trim();
      const emailRaw = String(fd.get('email') || '').trim();

      if (username.length < 5) {
        showGateAlert('Tên đăng nhập cần ít nhất 5 ký tự.', 'error');
        return;
      }
      if (!password || String(password).length < 8 || String(password).length > 16) {
        showGateAlert('Mật khẩu cần từ 8 đến 16 ký tự.', 'error');
        return;
      }
      if (password !== password2) {
        showGateAlert('Hai lần nhập mật khẩu không khớp.', 'error');
        return;
      }

      const body = {
        username,
        password,
        name: nameRaw || null,
        email: emailRaw || null,
      };
      if (!body.name) delete body.name;
      if (!body.email) delete body.email;

      setGateLoading(form, true);
      try {
        const data = await request('auth/register', { method: 'POST', body });
        applyAuth(unwrap(data));
        showGateAlert('Đăng ký thành công — chào mừng đến StudyHub!', 'ok');
        setTimeout(() => {
          window.location.href = 'student/study-landing.html';
        }, 400);
      } catch (err) {
        showGateAlert(gateErrorMessage(err), 'error');
      } finally {
        setGateLoading(form, false);
      }
    });
  }

  function handleLogoutClick() {
    clearSession();
    activeView = '';
    showAppAlert('');
    showGateAlert('');
    if (document.body.dataset.appShell === 'admin' || document.body.dataset.appShell === 'student') {
      window.location.href = 'index.html';
      return;
    }
    if (document.body.dataset.appShell === 'study-landing') {
      window.location.href = 'index.html';
      return;
    }
    if (document.body.dataset.appShell === 'landing') {
      exitToLandingGuestAfterLogout();
      return;
    }
    resetGateForms();
    showGate();
  }

  document.querySelectorAll('.js-logout').forEach((btn) => btn.addEventListener('click', handleLogoutClick));

  loadSession();
  initGateTabs();

  const landingShell = document.body.dataset.appShell === 'landing';
  const studyLandingShell = document.body.dataset.appShell === 'study-landing';
  const adminShell = document.body.dataset.appShell === 'admin';
  const studentShell = document.body.dataset.appShell === 'student';

  (function initAuthModalChrome() {
    const gate = document.getElementById('gate');
    if (!gate || !gate.classList.contains('auth-overlay')) return;
    function closeModal() {
      if (landingShell || studyLandingShell) {
        gate.classList.add('hidden');
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        url.searchParams.delete('tab');
        const qs = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
        return;
      }
      window.location.href = 'index.html';
    }
    document.getElementById('authModalClose')?.addEventListener('click', closeModal);
    gate.querySelector('.auth-backdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (gate.classList.contains('hidden')) return;
      closeModal();
    });
  })();

  const tabParam = new URLSearchParams(window.location.search).get('tab');
  const urlParams = new URLSearchParams(window.location.search);

  if (adminShell) {
    if (!isAuthenticated()) {
      window.location.replace('index.html?auth=1');
    } else if (!isStaff()) {
      window.location.replace('index.html');
    } else {
      showAppShell();
    }
  } else if (studentShell) {
    if (!isAuthenticated()) {
      window.location.replace('index.html?auth=1');
    } else {
      showAppShell();
    }
  } else if (studyLandingShell) {
    if (!isAuthenticated()) {
      window.location.replace('index.html');
    } else if (isStaff()) {
      window.location.replace('admin.html');
    } else {
      document.getElementById('gate')?.classList.add('hidden');
      document.getElementById('landingRoot')?.classList.remove('hidden');
      document.getElementById('landingGuestMarketing')?.classList.remove('hidden');
      document.body.removeAttribute('data-app-view');
      updateTopbar();
      syncLandingNavForSession();
      stripAuthQueryFromUrl();
    }
  } else if (landingShell) {
    if (isAuthenticated()) {
      if (isStaff()) {
        window.location.replace('admin.html');
      } else {
        window.location.replace('student/study-landing.html');
      }
    } else {
      if (state.token) clearSession();
      document.getElementById('gate')?.classList.add('hidden');
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth') === '1' || params.get('tab') === 'register') {
        showGate();
        if (tabParam === 'register') {
          document.querySelector('.gate-tab[data-tab="register"]')?.click();
        }
      }
    }
  } else {
    if (tabParam === 'register') {
      document.querySelector('.gate-tab[data-tab="register"]')?.click();
    }
    if (isAuthenticated()) {
      showAppShell();
    } else {
      if (state.token) clearSession();
      showGate();
    }
  }

  if (studentShell && isAuthenticated()) {
    try {
      if (sessionStorage.getItem('studyhub_classroom_course')) {
        sessionStorage.removeItem('studyhub_classroom_course');
        showView('student-classroom');
      }
    } catch {
      /* ignore */
    }
  }

  (function initStudentNavSearch() {
    const f = document.getElementById('studentSearchForm');
    if (!f || document.body.dataset.appShell !== 'student') return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const q = String(fd.get('q') || '').trim();
      sessionStorage.setItem('studyhub_explore_q', q);
      showView('student-explore');
    });
  })();

  (function initStudentCourseraNav() {
    if (document.body.dataset.appShell !== 'student') return;
    const btn = document.getElementById('studentUserMenuBtn');
    const menu = document.getElementById('studentUserDropdown');
    const wrap = btn?.closest('.student-user-menu-wrap');
    if (!btn || !menu || !wrap) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });

    menu.querySelectorAll('[data-student-view]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.getAttribute('data-student-view');
        if (id) showView(id);
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  (function initLandingUserMenu() {
    const sh = document.body.dataset.appShell;
    if (sh !== 'landing' && sh !== 'study-landing') return;
    const btn = document.getElementById('landingUserMenuBtn');
    const menu = document.getElementById('landingUserDropdown');
    const wrap = btn?.closest('.student-user-menu-wrap');
    if (!btn || !menu || !wrap) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });
  })();
})();
