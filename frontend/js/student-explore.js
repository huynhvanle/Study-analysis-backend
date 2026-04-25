;(async function () {
  'use strict';

  if (document.body.dataset.appShell !== 'student-explore-full') return;
  const app = window.StudyApp;
  if (!app) return;

  const { request, escapeHtml, escapeAttr, coursePublicUrl } = app;

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  const searchForm = document.getElementById('exploreSearchForm');
  const searchInput = document.getElementById('exploreSearchQ');
  const catsEl = document.getElementById('exploreCats');
  const statusEl = document.getElementById('exploreStatus');
  const gridEl = document.getElementById('exploreGrid');

  let activeCategoryId = '';
  let lastQuery = '';
  let lastCourses = [];

  function courseNeedsPlus(c) {
    return String(c.accessTier || 'FREE').toUpperCase() === 'PLUS';
  }

  function courseDetailHref(c) {
    if (typeof coursePublicUrl === 'function') {
      return coursePublicUrl(c);
    }
    const s = c.slug && String(c.slug).trim();
    if (s) return 'student/course.html?slug=' + encodeURIComponent(s);
    return 'student/course.html?id=' + encodeURIComponent(String(c.id));
  }

  function courseCard(c) {
    const href = courseDetailHref(c);
    const ar = (c.title || 'Khóa học') + ' — xem mô tả và ghi danh tại trang khóa học';
    const cover = c.coverImageUrl && String(c.coverImageUrl).trim();
    const phClass = ['a', 'b', 'c', 'd', 'e', 'f'][Number(c.id) % 6];
    const media = cover
      ? `<div class="landing-fcard-media"><img src="${escapeAttr(cover)}" alt="" loading="lazy" /></div>`
      : `<div class="landing-fcard-media landing-fcard-media--ph landing-course-thumb--${phClass}" aria-hidden="true"></div>`;
    const meta = [c.category, c.level].filter(Boolean).join(' · ');
    const metaHtml = meta ? `<p class="landing-fcard-type">${escapeHtml(meta)}</p>` : '';
    const needP = courseNeedsPlus(c);
    const tierLabel = needP ? 'Plus' : 'Free';
    const tierClass = needP ? 'course-tier-pill course-tier-pill--plus' : 'course-tier-pill course-tier-pill--free';
    const tierTitle = needP ? 'Cần gói StudyHub Plus' : 'Miễn phí';
    const plusPill = ` <span class="${tierClass}" style="vertical-align:middle" title="${escapeAttr(
      tierTitle
    )}">${tierLabel}</span>`;
    return (
      `<a class="landing-fcard course-explore-card" href="${escapeAttr(href)}" data-course-id="${escapeAttr(
        c.id
      )}" aria-label="${escapeAttr(ar)}">` +
      media +
      `<div class="landing-fcard-body">` +
      `<h3 class="landing-fcard-title">${escapeHtml(c.title || 'Khóa học')}${plusPill}</h3>` +
      metaHtml +
      `</div></a>`
    );
  }

  function renderCourses(list) {
    if (!gridEl) return;
    const arr = Array.isArray(list) ? list : [];
    if (!arr.length) {
      gridEl.innerHTML = '<p class="muted" style="margin:0.75rem">Không có khóa học phù hợp.</p>';
      return;
    }
    gridEl.innerHTML = arr.map((c) => courseCard(c)).join('');
  }

  async function loadCategories() {
    if (!catsEl) return;
    try {
      const cats = await request('course-categories', { method: 'GET' });
      const items = [{ id: '', name: 'Tất cả' }].concat(Array.isArray(cats) ? cats : []);
      catsEl.innerHTML = items
        .map((x) => {
          const id = x.id == null ? '' : String(x.id);
          const active = id === activeCategoryId;
          return `<button type="button" class="btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}" data-cat-id="${escapeAttr(
            id
          )}">${escapeHtml(x.name || '')}</button>`;
        })
        .join('');
    } catch {
      catsEl.innerHTML = '';
    }
  }

  async function loadCourses() {
    if (!statusEl || !gridEl) return;
    statusEl.textContent = 'Đang tải…';
    try {
      const q = lastQuery.trim();
      let path = 'courses';
      if (q) {
        path = `courses/search?q=${encodeURIComponent(q)}`;
      } else if (activeCategoryId) {
        path = `courses?categoryId=${encodeURIComponent(activeCategoryId)}`;
      }
      const list = await request(path, { method: 'GET' });
      lastCourses = Array.isArray(list) ? list : [];
      statusEl.textContent = q
        ? `Kết quả cho “${q}”: ${lastCourses.length} khóa`
        : `Tổng: ${lastCourses.length} khóa`;
      renderCourses(lastCourses);
    } catch (e) {
      statusEl.textContent = e.message || 'Lỗi tải khóa học.';
      gridEl.innerHTML = '';
    }
  }

  const initialQ = String(getParam('q') || '').trim();
  if (searchInput) searchInput.value = initialQ;
  lastQuery = initialQ;

  // Compatibility with older flows: landing.js stored values in sessionStorage.
  try {
    const q2 = sessionStorage.getItem('studyhub_explore_q');
    if (!lastQuery && q2) {
      lastQuery = String(q2).trim();
      if (searchInput) searchInput.value = lastQuery;
    }
    sessionStorage.removeItem('studyhub_explore_q');
    const cat = sessionStorage.getItem('studyhub_landing_cat');
    if (cat && !lastQuery) {
      activeCategoryId = String(cat);
    }
    sessionStorage.removeItem('studyhub_landing_cat');
  } catch {
    /* ignore */
  }

  try {
    const catFocus = getParam('catFocus');
    if (catFocus && !lastQuery) {
      activeCategoryId = String(catFocus);
    }
  } catch {
    /* ignore */
  }

  await loadCategories();
  await loadCourses();

  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      lastQuery = String(searchInput?.value || '').trim();
      activeCategoryId = '';
      await loadCategories();
      await loadCourses();
      try {
        const u = new URL(window.location.href);
        if (lastQuery) u.searchParams.set('q', lastQuery);
        else u.searchParams.delete('q');
        history.replaceState({}, '', u.toString());
      } catch {
        /* ignore */
      }
    });
  }

  catsEl?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cat-id]');
    if (!btn) return;
    activeCategoryId = String(btn.dataset.catId || '');
    lastQuery = '';
    if (searchInput) searchInput.value = '';
    await loadCategories();
    await loadCourses();
  });

})();

