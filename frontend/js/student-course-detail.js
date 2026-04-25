;(async function () {
  'use strict';

  if (document.body.dataset.appShell !== 'student-course-detail') return;
  const app = window.StudyApp;
  if (!app) return;

  const { request, state, isAuthenticated, showAppAlert, escapeHtml, escapeAttr, urlForAuthWithNext } = app;

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function typeLabelFromLevel(level) {
    const l = String(level || '').toLowerCase();
    if (/beginner|nhập môn|cơ bản|begin/.test(l)) return 'Cơ bản';
    if (/advanced|nâng cao/.test(l)) return 'Nâng cao';
    if (/prof|professional|chuyên môn/.test(l)) return 'Chuyên môn';
    if (l) return l;
    return '—';
  }

  function courseNeedsPlus(c) {
    return String(c.accessTier || 'FREE').toUpperCase() === 'PLUS';
  }

  function userHasPlus() {
    return String(state.plan || 'FREE').toUpperCase() === 'PLUS';
  }

  function goToAuth() {
    const href = typeof urlForAuthWithNext === 'function' ? urlForAuthWithNext() : 'index.html?auth=1';
    window.location.href = href;
  }

  const loading = document.getElementById('courseDetailLoading');
  const errBox = document.getElementById('courseDetailError');
  const article = document.getElementById('courseDetailArticle');
  const bread = document.getElementById('courseDetailBreadcrumb');
  const titleEl = document.getElementById('courseDetailTitle');
  const descEl = document.getElementById('courseDetailDesc');
  const aboutBody = document.getElementById('courseDetailAboutBody');
  const heroMedia = document.getElementById('courseDetailHeroMedia');
  const enrollBtn = document.getElementById('courseDetailEnrollBtn');
  const ctaSub = document.getElementById('courseDetailCtaSub');
  const ctaHint = document.getElementById('courseDetailCtaHint');
  const statsEl = document.getElementById('courseDetailStats');
  const metaList = document.getElementById('courseDetailMetaList');
  const breadTitle = document.getElementById('courseDetailBreadcrumbTitle');
  const catLink = document.getElementById('courseDetailBreadcrumbCatLink');
  const tierLine = document.getElementById('courseDetailTierLine');
  const tabAbout = document.getElementById('tabPanelAbout');
  const tabMeta = document.getElementById('tabPanelMeta');
  const tabBtnAbout = document.getElementById('tabBtnAbout');
  const tabBtnMeta = document.getElementById('tabBtnMeta');
  const tabsWrap = document.getElementById('courseDetailTabs');

  let currentCourse = null;

  function setEnrollCTA() {
    const c = currentCourse;
    if (!c || !enrollBtn) return;
    const needP = courseNeedsPlus(c);
    const loggedIn = isAuthenticated();
    const canEnroll = loggedIn && (!needP || userHasPlus());
    const needDisable = loggedIn && needP && !userHasPlus();
    if (!loggedIn) {
      enrollBtn.textContent = 'Đăng nhập để ghi danh';
    } else if (needP && !userHasPlus()) {
      enrollBtn.textContent = 'Cần gói StudyHub Plus';
    } else {
      enrollBtn.textContent = 'Ghi danh';
    }
    enrollBtn.disabled = needDisable;
    if (needP) {
      tierLine.innerHTML =
        '<span class="course-tier-pill course-tier-pill--plus" style="vertical-align:middle">Plus</span> ' +
        'Nội dung cần gói StudyHub Plus.';
    } else {
      tierLine.innerHTML =
        '<span class="course-tier-pill course-tier-pill--free" style="vertical-align:middle">Free</span> Mọi tài khoản có thể ghi danh.';
    }
    ctaSub.textContent = '';
    ctaHint.textContent = canEnroll
      ? 'Sau khi ghi danh, mở Lớp của tôi để bắt đầu học.'
      : needDisable
        ? 'Nâng cấp lên gói Plus trong hồ sơ để ghi danh.'
        : 'Đăng nhập hoặc tạo tài khoản miễn phí để bắt đầu.';
  }

  async function enroll() {
    if (!currentCourse) return;
    const id = Number(currentCourse.id);
    if (!id) return;
    showAppAlert('');
    try {
      await request('enrollments', { method: 'POST', body: { userId: state.userId, courseId: id } });
      showAppAlert('Đã ghi danh — vào Lớp của tôi để học.', 'ok');
      enrollBtn.textContent = 'Đã ghi danh';
      enrollBtn.disabled = true;
    } catch (e) {
      showAppAlert(e.message, 'error');
    }
  }

  function renderCourse(c) {
    currentCourse = c;
    if (titleEl) titleEl.textContent = c.title || 'Khóa học';
    document.title = (c.title ? c.title + ' — ' : '') + 'StudyHub';
    if (descEl) {
      const raw = c.description && String(c.description).trim();
      if (raw) {
        const short = raw.length > 320 ? raw.slice(0, 317) + '…' : raw;
        descEl.textContent = short;
        descEl.hidden = false;
      } else {
        descEl.textContent = 'Khóa học trực tuyến với bài giảng và bài tập theo từng bước.';
        descEl.hidden = false;
      }
    }
    if (aboutBody) {
      const full = c.description && String(c.description).trim();
      aboutBody.innerHTML = full
        ? full.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
        : '<p class="muted">Chưa có mô tả chi tiết cho khóa này.</p>';
    }
    if (bread) bread.hidden = false;
    if (breadTitle) breadTitle.textContent = c.title || 'Khóa học';
    if (catLink && c.categoryId != null) {
      catLink.href = 'student/explore.html?catFocus=' + encodeURIComponent(String(c.categoryId));
    } else if (catLink) {
      catLink.href = 'student/explore.html';
    }

    if (heroMedia) {
      const cover = c.coverImageUrl && String(c.coverImageUrl).trim();
      if (cover) {
        heroMedia.className = 'course-detail-hero-media course-detail-hero-media--has-img';
        heroMedia.innerHTML =
          '<img src="' + escapeAttr(cover) + '" alt="" class="course-detail-hero-img" loading="eager" />';
      } else {
        const ph = ['a', 'b', 'c', 'd', 'e', 'f'][Number(c.id) % 6];
        heroMedia.className = 'course-detail-hero-media landing-fcard-media--ph landing-course-thumb--' + ph;
        heroMedia.textContent = '';
        heroMedia.innerHTML = '';
      }
    }

    if (statsEl) {
      const min = Math.max(0, Number(c.totalDurationMinutes) || 0);
      const h = min >= 60 ? Math.floor(min / 60) + ' giờ' : null;
      const minPart = min % 60 || min;
      const dur =
        h && min % 60 ? `${h} ${minPart} phút` : h || (min > 0 ? min + ' phút' : '—');
      const lessons = Math.max(0, Number(c.lessonCount) || 0);
      statsEl.innerHTML = [
        { label: 'Bài học', v: lessons ? String(lessons) + ' bài' : '—' },
        { label: 'Trình độ', v: typeLabelFromLevel(c.level) },
        { label: 'Thời lượng ước tính', v: dur },
        { label: 'Ngôn ngữ', v: c.language && String(c.language).trim() ? c.language : '—' },
      ]
        .map(
          (x) =>
            `<div class="course-detail-stat"><span class="course-detail-stat-label">${escapeHtml(x.label)}</span><span class="course-detail-stat-value">${escapeHtml(
              x.v
            )}</span></div>`
        )
        .join('');
    }

    if (metaList) {
      const items = [
        c.category && 'Danh mục: ' + c.category,
        c.tags && 'Thẻ: ' + c.tags,
        c.publishedAt && 'Xuất bản: ' + String(c.publishedAt).slice(0, 10),
      ].filter(Boolean);
      metaList.innerHTML =
        items.map((t) => '<li>' + escapeHtml(String(t)) + '</li>').join('') || '<li class="muted">Không thêm dữ liệu.</li>';
    }

    if (tabsWrap) tabsWrap.style.display = 'block';
    setEnrollCTA();
  }

  (function initTabs() {
    function select(which) {
      const about = which === 'about';
      if (tabAbout) {
        tabAbout.hidden = !about;
      }
      if (tabMeta) {
        tabMeta.hidden = about;
      }
      if (tabBtnAbout) {
        tabBtnAbout.setAttribute('aria-selected', about ? 'true' : 'false');
      }
      if (tabBtnMeta) {
        tabBtnMeta.setAttribute('aria-selected', about ? 'false' : 'true');
      }
    }
    if (tabMeta) {
      tabMeta.hidden = true;
    }
    tabBtnAbout?.addEventListener('click', () => select('about'));
    tabBtnMeta?.addEventListener('click', () => select('meta'));
  })();

  enrollBtn?.addEventListener('click', () => {
    if (!isAuthenticated()) {
      goToAuth();
      return;
    }
    if (enrollBtn.disabled) {
      showAppAlert('Khóa dành cho gói Plus — cần nâng cấp gói hoặc chọn khóa Free.', 'error');
      return;
    }
    enroll();
  });

  if (loading) loading.style.display = 'block';
  if (errBox) errBox.style.display = 'none';
  if (article) article.style.display = 'none';

  const slug = getParam('slug');
  const idParam = getParam('id');
  let path;
  if (slug && String(slug).trim()) {
    path = 'courses/by-slug/' + encodeURIComponent(String(slug).trim());
  } else if (idParam) {
    path = 'courses/' + encodeURIComponent(String(idParam).trim());
  } else {
    if (loading) loading.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = 'Không tìm thấy khóa học. Mở từ trang Khám phá rồi chọn lại.';
    }
    return;
  }

  try {
    const c = await request(path, { method: 'GET' });
    if (loading) loading.style.display = 'none';
    if (article) article.style.display = 'block';
    renderCourse(c);
  } catch (e) {
    if (loading) loading.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = e.message || 'Không tải được thông tin khóa. Có thể khóa đã gỡ hoặc bạn cần quay lại trang Khám phá.';
    }
  }
})();
