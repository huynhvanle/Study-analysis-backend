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
      throw new Error(msg || `HTTP ${res.status}`);
    }
    return data;
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

  function showGate() {
    document.getElementById('gate').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('app').setAttribute('aria-hidden', 'true');
  }

  function showAppShell() {
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('app').setAttribute('aria-hidden', 'false');
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
    badge.textContent = r || 'USER';
    badge.className = 'role-badge ' + (isStaff() ? 'staff' : 'student');

    const initial = (state.name || state.username || '?').charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userDisplayName').textContent = state.name || state.username || 'User';
    document.getElementById('userDisplayId').textContent = 'ID ' + state.userId;
  }

  /**
   * staffOnly: visible only to ADMIN / INSTRUCTOR
   * studentOnly: primary learner tools (staff can open if allowStaff)
   */
  const NAV = [
    { id: 'student-home', label: 'Dashboard', icon: '🏠', desc: 'Your study summary and quick stats.', studentOnly: true, allowStaff: true },
    { id: 'student-explore', label: 'Explore courses', icon: '🔎', desc: 'Browse the catalog and enroll.', studentOnly: true, allowStaff: true },
    {
      id: 'student-classroom',
      label: 'Lớp của tôi',
      icon: '🎓',
      desc: 'Khóa đã ghi danh · học lesson theo thứ tự (bài sau mở khi hoàn thành bài trước).',
      studentOnly: true,
      allowStaff: true,
    },
    { id: 'student-learn', label: 'Study & quizzes', icon: '📖', desc: 'Manual IDs: lessons & quizzes.', studentOnly: true, allowStaff: true },
    { id: 'student-track', label: 'Progress & logs', icon: '📈', desc: 'Mark lessons complete and log study time.', studentOnly: true, allowStaff: true },
    { id: 'student-coach', label: 'Smart coach', icon: '✨', desc: 'Recommendations to improve your scores.', studentOnly: true, allowStaff: true },
    { id: 'admin-home', label: 'Staff overview', icon: '⚙️', desc: 'Platform snapshot (staff only).', staffOnly: true },
    { id: 'admin-members', label: 'Members', icon: '👥', desc: 'Directory of all user accounts (staff only).', staffOnly: true },
    { id: 'admin-courses', label: 'Course builder', icon: '🛠️', desc: 'Create courses and attach lessons (staff only).', staffOnly: true },
    { id: 'admin-content', label: 'Quizzes', icon: '❓', desc: 'Add quizzes and record scores (staff only).', staffOnly: true },
  ];

  function buildNav() {
    const nav = document.getElementById('nav');
    nav.replaceChildren();

    const learn = document.createElement('div');
    learn.className = 'nav-section-title';
    learn.textContent = 'Learning';
    nav.appendChild(learn);

    NAV.filter((n) => n.studentOnly).forEach((item) => {
      if (!isStaff() && item.staffOnly) return;
      nav.appendChild(navButton(item));
    });

    if (isStaff()) {
      const staff = document.createElement('div');
      staff.className = 'nav-section-title';
      staff.textContent = 'Administration';
      nav.appendChild(staff);
      NAV.filter((n) => n.staffOnly).forEach((item) => nav.appendChild(navButton(item)));
    }
  }

  function navButton(item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.view = item.id;
    b.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
    b.addEventListener('click', () => showView(item.id));
    return b;
  }

  function setPage(title, desc) {
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageDesc').textContent = desc;
  }

  function highlightNav() {
    document.querySelectorAll('.sidebar-nav button').forEach((b) => {
      b.classList.toggle('active', b.dataset.view === activeView);
    });
  }

  function requireStaff() {
    if (!isStaff()) {
      showAppAlert('This area is restricted to staff (roles ADMIN or INSTRUCTOR).', 'error');
      showView('student-home');
      return false;
    }
    return true;
  }

  function showView(id) {
    const item = NAV.find((n) => n.id === id);
    if (!item) return;
    if (item.staffOnly && !isStaff()) {
      showAppAlert('You do not have permission to open that page.', 'error');
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

  /* ---------- Student views ---------- */

  async function renderStudentHome(content) {
    content.replaceChildren();
    const wrap = el(`
      <div>
        <span class="perm-hint student">👤 Learner workspace · data scoped to your account (user ID ${state.userId})</span>
        <div class="stat-grid" id="stuStats"></div>
        <div class="card"><h2>Quick preview · Smart coach</h2><pre class="pre" id="stuRecPre" style="max-height:200px">Loading…</pre></div>
      </div>
    `);
    content.appendChild(wrap);
    const grid = content.querySelector('#stuStats');
    try {
      const summary = await request(`users/${state.userId}/study-summary`, { method: 'GET' });
      grid.innerHTML = `
        <div class="stat"><div class="stat-value">${summary.enrolledCourses ?? 0}</div><div class="stat-label">Enrolled courses</div></div>
        <div class="stat"><div class="stat-value">${summary.lessonsCompleted ?? 0}</div><div class="stat-label">Lessons completed</div></div>
        <div class="stat"><div class="stat-value">${summary.averageQuizScore != null ? summary.averageQuizScore.toFixed(1) : '—'}</div><div class="stat-label">Avg quiz score</div></div>
        <div class="stat"><div class="stat-value">${summary.totalStudyMinutes ?? 0}</div><div class="stat-label">Study minutes logged</div></div>
      `;
    } catch {
      grid.innerHTML = '<p class="muted">Could not load summary. Enroll in a course and add progress to see stats.</p>';
    }
    try {
      const rec = await request(`users/${state.userId}/recommendations`, { method: 'GET' });
      content.querySelector('#stuRecPre').textContent = JSON.stringify(rec, null, 2);
    } catch {
      content.querySelector('#stuRecPre').textContent = 'No recommendations yet — enroll and add quiz results.';
    }
  }

  async function renderStudentExplore(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint student">Enroll using your signed-in user ID (${state.userId})</span>
        <div class="card">
          <h2>Browse catalog</h2>
          <div class="row">
            <div class="field" style="flex:1;min-width:160px;margin-bottom:0">
              <label>Category filter</label>
              <input type="text" id="exCat" placeholder="e.g. Math" />
            </div>
            <button type="button" class="btn btn-primary" id="exLoad">Load courses</button>
          </div>
          <div id="exTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>Enroll in a course</h2>
          <form id="exEnroll" class="row">
            <div class="field" style="width:120px;margin-bottom:0">
              <label>Your user ID</label>
              <input name="userId" type="number" readonly value="${state.userId}" />
            </div>
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Course ID</label>
              <input name="courseId" type="number" min="1" required />
            </div>
            <button type="submit" class="btn btn-accent">Enroll me</button>
          </form>
        </div>
      </div>
    `)
    );

    async function loadCourses() {
      const cat = content.querySelector('#exCat').value.trim();
      const path = cat ? `courses?category=${encodeURIComponent(cat)}` : 'courses';
      const out = content.querySelector('#exTable');
      try {
        const list = await request(path, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">No courses found.</p>';
          return;
        }
        const rows = list
          .map(
            (c) =>
              `<tr><td>${c.id}</td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.category || '—')}</td><td>${escapeHtml(c.level || '—')}</td></tr>`
          )
          .join('');
        out.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Level</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    }

    content.querySelector('#exLoad').addEventListener('click', loadCourses);
    content.querySelector('#exEnroll').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      try {
        await request('enrollments', {
          method: 'POST',
          body: { userId: Number(fd.get('userId')), courseId: Number(fd.get('courseId')) },
        });
        showAppAlert('You are now enrolled.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
    loadCourses();
  }

  async function renderStudentClassroom(content) {
    content.replaceChildren();
    const shell = el(`
      <div>
        <span class="perm-hint student">Theo ERD: enrollment → course → lesson · tiến độ (progress) · quiz</span>
        <div id="classroomMount"><p class="muted">Đang tải…</p></div>
      </div>
    `);
    content.appendChild(shell);
    const mount = content.querySelector('#classroomMount');

    async function load() {
      mount.innerHTML = '<p class="muted">Đang tải…</p>';
      try {
        const courses = await request(`learning/users/${state.userId}/my-courses`, { method: 'GET' });
        if (!Array.isArray(courses) || courses.length === 0) {
          mount.innerHTML =
            '<div class="card"><p class="muted">Bạn chưa ghi danh khóa nào. Vào <strong>Explore courses</strong> để chọn khóa.</p></div>';
          return;
        }

        mount.innerHTML = courses
          .map((c) => {
            const pct =
              c.totalLessons > 0 ? Math.round((100 * c.completedLessons) / c.totalLessons) : 0;
            const rows = (c.lessons || [])
              .map((l) => {
                const lockNote = l.unlocked
                  ? ''
                  : ' <span class="muted" style="font-size:0.78rem">(khóa)</span>';
                const openBtn = l.unlocked
                  ? `<button type="button" class="btn btn-sm btn-ghost" data-action="open-lesson" data-url="${escapeAttr(l.contentUrl)}">Mở nội dung</button>`
                  : `<span class="muted">Hoàn thành bài trước</span>`;
                const doneBtn =
                  l.completed && l.unlocked
                    ? '<span class="muted">Đã xong</span>'
                    : l.unlocked
                      ? `<button type="button" class="btn btn-sm btn-primary" data-action="complete-lesson" data-lesson-id="${l.lessonId}">Đánh dấu hoàn thành</button>`
                      : '—';
                return `<tr class="${l.unlocked ? '' : 'lesson-locked'}">
                  <td>${l.orderIndex}</td>
                  <td>${escapeHtml(l.title)}${lockNote}</td>
                  <td>${l.quizCount}</td>
                  <td>${l.completed ? '✓' : '—'}</td>
                  <td>${openBtn}</td>
                  <td>${doneBtn}</td>
                </tr>`;
              })
              .join('');

            return `
            <div class="card" style="margin-bottom:1.25rem">
              <h2>${escapeHtml(c.courseTitle)}</h2>
              <p class="muted" style="margin:0 0 0.75rem">${escapeHtml(c.category || '')} · ${escapeHtml(c.level || '')}</p>
              <p style="margin:0 0 0.75rem;font-size:0.9rem"><strong>Tiến độ:</strong> ${c.completedLessons}/${c.totalLessons} lesson (${pct}%)</p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Lesson</th><th>Quiz</th><th>Xong</th><th>Nội dung</th><th>Cập nhật</th></tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>`;
          })
          .join('');
      } catch (e) {
        mount.innerHTML = `<div class="card"><p class="muted">${escapeHtml(e.message)}</p></div>`;
      }
    }

    mount.addEventListener('click', async (ev) => {
      const openEl = ev.target.closest('[data-action="open-lesson"]');
      if (openEl?.dataset.url) {
        window.open(openEl.dataset.url, '_blank', 'noopener,noreferrer');
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
          showAppAlert('Đã lưu tiến độ lesson.', 'ok');
          await load();
        } catch (err) {
          showAppAlert(err.message, 'error');
        }
      }
    });

    await load();
  }

  function renderStudentLearn(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint student">Pick a course you are enrolled in, then study its lessons and quizzes</span>
        <div class="card">
          <h2>1 · Lessons in a course</h2>
          <div class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Course ID</label>
              <input type="number" id="lrCourse" min="1" />
            </div>
            <button type="button" class="btn btn-primary" id="lrLessons">Load lessons</button>
          </div>
          <div id="lrLessTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>2 · Quizzes for a lesson</h2>
          <div class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Lesson ID</label>
              <input type="number" id="lrLesson" min="1" />
            </div>
            <button type="button" class="btn btn-primary" id="lrQuizzes">Load quizzes</button>
          </div>
          <div id="lrQuizTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>3 · Submit your score</h2>
          <form id="lrSubmit">
            <div class="grid-2">
              <div class="field"><label>Quiz ID</label><input name="quizId" type="number" min="1" required /></div>
              <div class="field"><label>Score (0–100)</label><input name="score" type="number" step="0.1" min="0" max="100" value="80" required /></div>
            </div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <button type="submit" class="btn btn-accent">Submit quiz result</button>
          </form>
        </div>
      </div>
    `)
    );

    content.querySelector('#lrLessons').addEventListener('click', async () => {
      const cid = content.querySelector('#lrCourse').value;
      const out = content.querySelector('#lrLessTable');
      if (!cid) {
        out.innerHTML = '<p class="muted">Enter a course ID.</p>';
        return;
      }
      try {
        const list = await request(`courses/${cid}/lessons`, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">No lessons.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th><th>Order</th><th>Min</th></tr></thead><tbody>` +
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
        out.innerHTML = '<p class="muted">Enter a lesson ID.</p>';
        return;
      }
      try {
        const list = await request(`lessons/${lid}/quizzes`, { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">No quizzes.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th></tr></thead><tbody>` +
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
        showAppAlert('Quiz result saved.', 'ok');
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
        <span class="perm-hint student">All actions use your learner ID ${state.userId}</span>
        <div class="card">
          <h2>Lesson progress</h2>
          <button type="button" class="btn btn-ghost" id="trLoad">Refresh my progress</button>
          <div id="trProg" style="margin-top:1rem"></div>
          <h3>Update progress</h3>
          <form id="trUpsert" class="grid-2">
            <div class="field"><label>Lesson ID</label><input name="lessonId" type="number" min="1" required /></div>
            <div class="field"><label>Completed</label><select name="completed"><option value="true">Yes</option><option value="false">No</option></select></div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-primary">Save progress</button></div>
          </form>
        </div>
        <div class="card">
          <h2>Study session log</h2>
          <form id="trLog" class="grid-2">
            <div class="field"><label>Lesson ID</label><input name="lessonId" type="number" min="1" required /></div>
            <div class="field"><label>Minutes spent</label><input name="timeSpent" type="number" min="1" value="30" required /></div>
            <div class="field"><label>Practice score (optional)</label><input name="score" type="number" step="0.1" placeholder="e.g. 72" /></div>
            <div class="field"><label>Attempt #</label><input name="attempt" type="number" min="1" value="1" required /></div>
            <input type="hidden" name="userId" value="${state.userId}" />
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-accent">Log session</button></div>
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
          out.innerHTML = '<p class="muted">No progress rows yet.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>Lesson</th><th>Done</th><th>Completed at</th></tr></thead><tbody>` +
          list.map((p) => `<tr><td>${p.lessonId}</td><td>${p.completed}</td><td>${p.completedAt || '—'}</td></tr>`).join('') +
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
        showAppAlert('Progress updated.', 'ok');
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
        showAppAlert('Study log saved.', 'ok');
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
        <span class="perm-hint student">Recommendations use your enrollments, quiz scores, and study logs</span>
        <div class="grid-2">
          <div class="card">
            <h2>Study summary</h2>
            <pre class="pre" id="chSum">Loading…</pre>
          </div>
          <div class="card">
            <h2>Prioritized review list</h2>
            <pre class="pre" id="chRec">Loading…</pre>
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
        <span class="perm-hint staff">🔒 Staff only · ADMIN or INSTRUCTOR</span>
        <div class="stat-grid" id="admStats"></div>
        <p class="muted" style="margin-top:1rem">Numbers are loaded live from the API. Students never see this page.</p>
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
      const c = await request('courses', { method: 'GET' });
      courses = Array.isArray(c) ? c.length : 0;
    } catch {
      /* ignore */
    }
    grid.innerHTML = `
      <div class="stat"><div class="stat-value">${users}</div><div class="stat-label">Registered accounts</div></div>
      <div class="stat"><div class="stat-value">${courses}</div><div class="stat-label">Courses in catalog</div></div>
      <div class="stat"><div class="stat-value">${state.userId}</div><div class="stat-label">Your staff user ID</div></div>
    `;
  }

  async function renderAdminMembers(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">🔒 Staff directory · read-only list from GET /users</span>
        <div class="card">
          <h2>All members</h2>
          <button type="button" class="btn btn-primary" id="memLoad">Reload directory</button>
          <div id="memTable" style="margin-top:1rem"></div>
        </div>
        <div class="card">
          <h2>Member detail</h2>
          <form id="memOne" class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>User ID</label>
              <input name="userId" type="number" min="1" required />
            </div>
            <button type="submit" class="btn btn-ghost">Fetch profile</button>
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
          out.innerHTML = '<p class="muted">No users.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Name</th><th>Email</th></tr></thead><tbody>` +
          list
            .map(
              (u) =>
                `<tr><td>${u.id}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.role || '')}</td><td>${escapeHtml(u.name || '')}</td><td>${escapeHtml(u.email || '')}</td></tr>`
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
        <span class="perm-hint staff">🔒 New courses are attributed to your staff user ID</span>
        <div class="card">
          <h2>Create course</h2>
          <form id="adCourse">
            <div class="field"><label>Title</label><input name="title" required /></div>
            <div class="field"><label>Description</label><textarea name="description"></textarea></div>
            <div class="grid-2">
              <div class="field"><label>Category</label><input name="category" /></div>
              <div class="field"><label>Level</label><input name="level" placeholder="BEGINNER" /></div>
            </div>
            <input type="hidden" name="createdByUserId" value="${state.userId}" />
            <button type="submit" class="btn btn-primary">Publish course</button>
          </form>
          <pre class="pre" id="adCourseOut" hidden style="margin-top:1rem"></pre>
        </div>
        <div class="card">
          <h2>Add lesson to course</h2>
          <form id="adLesson">
            <div class="field"><label>Course ID</label><input name="courseId" type="number" min="1" required /></div>
            <div class="field"><label>Lesson title</label><input name="title" required /></div>
            <div class="field"><label>Content URL</label><input name="contentUrl" required placeholder="https://..." /></div>
            <div class="grid-2">
              <div class="field"><label>Duration (min)</label><input name="duration" type="number" min="1" value="30" required /></div>
              <div class="field"><label>Order index</label><input name="orderIndex" type="number" min="0" value="0" required /></div>
            </div>
            <button type="submit" class="btn btn-accent">Add lesson</button>
          </form>
        </div>
        <div class="card">
          <h2>Catalog snapshot</h2>
          <button type="button" class="btn btn-ghost" id="adCatLoad">Load all courses</button>
          <div id="adCat" style="margin-top:1rem"></div>
        </div>
      </div>
    `)
    );

    content.querySelector('#adCourse').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      const body = {
        title: fd.get('title'),
        description: fd.get('description') || null,
        category: fd.get('category') || null,
        level: fd.get('level') || null,
        createdByUserId: Number(fd.get('createdByUserId')),
      };
      const pre = content.querySelector('#adCourseOut');
      try {
        const c = await request('courses', { method: 'POST', body });
        pre.hidden = false;
        pre.textContent = JSON.stringify(c, null, 2);
        showAppAlert('Course created.', 'ok');
      } catch (err) {
        pre.hidden = true;
        showAppAlert(err.message, 'error');
      }
    });

    content.querySelector('#adLesson').addEventListener('submit', async (e) => {
      e.preventDefault();
      showAppAlert('');
      const fd = new FormData(e.target);
      const cid = fd.get('courseId');
      const body = {
        title: fd.get('title'),
        contentUrl: fd.get('contentUrl'),
        duration: Number(fd.get('duration')),
        orderIndex: Number(fd.get('orderIndex')),
      };
      try {
        await request(`courses/${cid}/lessons`, { method: 'POST', body });
        showAppAlert('Lesson added.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });

    content.querySelector('#adCatLoad').addEventListener('click', async () => {
      const out = content.querySelector('#adCat');
      try {
        const list = await request('courses', { method: 'GET' });
        if (!Array.isArray(list) || !list.length) {
          out.innerHTML = '<p class="muted">No courses.</p>';
          return;
        }
        out.innerHTML =
          `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Creator</th></tr></thead><tbody>` +
          list
            .map(
              (c) =>
                `<tr><td>${c.id}</td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(c.category || '')}</td><td>${c.createdByUserId}</td></tr>`
            )
            .join('') +
          `</tbody></table></div>`;
      } catch (e) {
        out.innerHTML = '<p class="muted">' + escapeHtml(e.message) + '</p>';
      }
    });
  }

  function renderAdminContent(content) {
    content.replaceChildren();
    content.appendChild(
      el(`
      <div>
        <span class="perm-hint staff">🔒 Create assessments and enter scores for any learner (grading)</span>
        <div class="card">
          <h2>Create quiz on lesson</h2>
          <form id="adQuiz" class="row">
            <div class="field" style="width:140px;margin-bottom:0">
              <label>Lesson ID</label>
              <input name="lessonId" type="number" min="1" required />
            </div>
            <div class="field" style="flex:1;min-width:180px;margin-bottom:0">
              <label>Quiz title</label>
              <input name="title" required />
            </div>
            <button type="submit" class="btn btn-primary">Create quiz</button>
          </form>
        </div>
        <div class="card">
          <h2>Record quiz result (any user)</h2>
          <form id="adResult" class="grid-2">
            <div class="field"><label>Learner user ID</label><input name="userId" type="number" min="1" required /></div>
            <div class="field"><label>Quiz ID</label><input name="quizId" type="number" min="1" required /></div>
            <div class="field" style="grid-column:1/-1"><label>Score</label><input name="score" type="number" step="0.1" min="0" max="100" value="75" required /></div>
            <div style="grid-column:1/-1"><button type="submit" class="btn btn-accent">Save result</button></div>
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
        showAppAlert('Quiz created.', 'ok');
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
        showAppAlert('Result stored.', 'ok');
      } catch (err) {
        showAppAlert(err.message, 'error');
      }
    });
  }

  /* ---------- Gate & boot ---------- */

  function initGateTabs() {
    const tabs = document.querySelectorAll('.gate-tab');
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

  document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    showGateAlert('');
    const fd = new FormData(e.target);
    try {
      const data = await request('auth/login', {
        method: 'POST',
        body: { username: fd.get('username'), password: fd.get('password') },
      });
      applyAuth(unwrap(data));
      showAppShell();
    } catch (err) {
      showGateAlert(err.message, 'error');
    }
  });

  document.getElementById('formRegister').addEventListener('submit', async (e) => {
    e.preventDefault();
    showGateAlert('');
    const fd = new FormData(e.target);
    const body = {
      username: fd.get('username'),
      password: fd.get('password'),
      role: 'STUDENT',
      name: fd.get('name') || null,
      email: fd.get('email') || null,
    };
    if (!body.name) delete body.name;
    if (!body.email) delete body.email;
    try {
      const data = await request('auth/register', { method: 'POST', body });
      applyAuth(unwrap(data));
      showGateAlert('Welcome to StudyHub!', 'ok');
      setTimeout(() => showAppShell(), 400);
    } catch (err) {
      showGateAlert(err.message, 'error');
    }
  });

  document.getElementById('btnLogout').addEventListener('click', () => {
    clearSession();
    activeView = '';
    showGate();
    showAppAlert('');
    showGateAlert('');
  });

  loadSession();
  initGateTabs();

  const tabParam = new URLSearchParams(window.location.search).get('tab');
  if (tabParam === 'register') {
    document.querySelector('.gate-tab[data-tab="register"]')?.click();
  }

  if (isAuthenticated()) {
    showAppShell();
  } else {
    if (state.token) clearSession();
    showGate();
  }
})();
