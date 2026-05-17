(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const content = document.getElementById('content');
  if (!content) return;
  const escapeHtml = window.StudyAdmin.escapeHtml;
  const numberFormatter = new Intl.NumberFormat('vi-VN');
  const chartColors = ['#0b6bcb', '#7c3aed', '#ea580c', '#059669', '#e11d48', '#0891b2', '#f59e0b'];

  function formatCount(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatPercent(value) {
    const num = Number(value);
    return `${Number.isFinite(num) ? num.toFixed(1) : '0.0'}%`;
  }

  function buildLineChart(points) {
    const items = Array.isArray(points)
      ? points.map((point) => ({
          label: String(point?.label || ''),
          value: Number(point?.value) || 0,
        }))
      : [];
    if (!items.length) {
      return '<p class="muted">Chưa có dữ liệu tăng trưởng người dùng.</p>';
    }

    const width = 620;
    const height = 260;
    const padLeft = 42;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 42;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;
    const maxValue = Math.max(...items.map((item) => item.value), 1);
    const coords = items.map((item, index) => {
      const x = items.length === 1 ? padLeft + plotWidth / 2 : padLeft + (plotWidth * index) / (items.length - 1);
      const y = padTop + plotHeight - (item.value / maxValue) * plotHeight;
      return { ...item, x, y };
    });

    const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const areaPath = [
      `M ${coords[0].x.toFixed(2)} ${(padTop + plotHeight).toFixed(2)}`,
      ...coords.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
      `L ${coords[coords.length - 1].x.toFixed(2)} ${(padTop + plotHeight).toFixed(2)}`,
      'Z',
    ].join(' ');

    const guides = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const y = padTop + plotHeight * ratio;
      const value = Math.round(maxValue * (1 - ratio));
      return `
        <line class="admin-line-grid" x1="${padLeft}" y1="${y.toFixed(2)}" x2="${(padLeft + plotWidth).toFixed(2)}" y2="${y.toFixed(2)}"></line>
        <text class="admin-line-axis-label" x="${padLeft - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(formatCount(value))}</text>
      `;
    }).join('');

    const labels = coords.map((point) => `
      <text class="admin-line-axis-label" x="${point.x.toFixed(2)}" y="${height - 12}" text-anchor="middle">${escapeHtml(point.label)}</text>
      <text class="admin-line-point-label" x="${point.x.toFixed(2)}" y="${Math.max(point.y - 10, padTop + 12).toFixed(2)}" text-anchor="middle">${escapeHtml(formatCount(point.value))}</text>
    `).join('');

    const pointsMarkup = coords.map((point) => `
      <circle class="admin-line-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="5"></circle>
    `).join('');

    return `
      <div class="admin-line-chart-wrap">
        <svg class="admin-line-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ tăng trưởng người dùng theo tháng">
          ${guides}
          <path class="admin-line-fill" d="${areaPath}"></path>
          <path class="admin-line-stroke" d="${linePath}"></path>
          ${pointsMarkup}
          ${labels}
        </svg>
      </div>
    `;
  }

  function buildPieChart(items) {
    const rows = Array.isArray(items)
      ? items
          .map((item) => ({
            label: String(item?.label || 'Chưa phân loại'),
            value: Number(item?.value) || 0,
          }))
          .filter((item) => item.value > 0)
      : [];
    const total = rows.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return '<p class="muted">Chưa có dữ liệu cơ cấu khóa học.</p>';
    }

    let angle = 0;
    const gradient = rows
      .map((item, index) => {
        const start = angle;
        angle += (item.value / total) * 360;
        const color = chartColors[index % chartColors.length];
        item.color = color;
        return `${color} ${start.toFixed(2)}deg ${angle.toFixed(2)}deg`;
      })
      .join(', ');

    return `
      <div class="admin-pie-layout">
        <div class="admin-donut-chart" style="background: conic-gradient(${gradient});">
          <div class="admin-donut-center">
            <strong>${escapeHtml(formatCount(total))}</strong>
            <span>khóa học</span>
          </div>
        </div>
        <ul class="admin-donut-legend">
          ${rows
            .map(
              (item) => `
            <li class="admin-donut-legend-item">
              <span class="admin-donut-swatch" style="background:${item.color}"></span>
              <span class="admin-donut-label">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(formatCount(item.value))}</strong>
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  function buildCourseTable(items, mode) {
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      return '<p class="muted">Chưa có dữ liệu để xếp hạng.</p>';
    }

    const head =
      mode === 'completion'
        ? '<tr><th>#</th><th>Khóa học</th><th>Danh mục</th><th>Tỷ lệ HT</th><th>Hoàn thành / Ghi danh</th></tr>'
        : '<tr><th>#</th><th>Khóa học</th><th>Danh mục</th><th>Enrollment</th><th>Tỷ lệ HT</th></tr>';

    const body = rows
      .map((item, index) => {
        const courseTitle = escapeHtml(item?.courseTitle || 'Khóa học');
        const category = escapeHtml(item?.category || 'Chưa phân loại');
        const completionRate = escapeHtml(formatPercent(item?.completionRatePercent));
        const enrollmentCount = escapeHtml(formatCount(item?.enrollmentCount));
        const completionPair = `${escapeHtml(formatCount(item?.completedEnrollmentCount))} / ${enrollmentCount}`;
        return mode === 'completion'
          ? `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${courseTitle}</strong></td>
              <td>${category}</td>
              <td>${completionRate}</td>
              <td>${completionPair}</td>
            </tr>
          `
          : `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${courseTitle}</strong></td>
              <td>${category}</td>
              <td>${enrollmentCount}</td>
              <td>${completionRate}</td>
            </tr>
          `;
      })
      .join('');

    return `
      <div class="table-wrap">
        <table class="admin-overview-table">
          <thead>${head}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function renderDashboard(summary) {
    const totalUsers = formatCount(summary?.totalUsers);
    const totalCourses = formatCount(summary?.totalCourses);
    const pendingApprovalRequests = formatCount(summary?.pendingApprovalRequests);
    const totalEnrollments = formatCount(summary?.totalEnrollments);
    const completionRate = formatPercent(summary?.courseCompletionRatePercent);

    content.innerHTML = `
      <div class="admin-overview-stack">
        <section class="stat-grid admin-overview-cards">
          <div class="stat">
            <div class="stat-value">${totalUsers}</div>
            <div class="stat-label">Tổng User</div>
            <div class="admin-overview-card-note">Số tài khoản đang tồn tại trong hệ thống.</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalCourses}</div>
            <div class="stat-label">Tổng Khóa học</div>
            <div class="admin-overview-card-note">Bao gồm tất cả khóa học đang được quản lý.</div>
          </div>
          <div class="stat">
            <div class="stat-value">${pendingApprovalRequests}</div>
            <div class="stat-label">Yêu cầu chờ duyệt</div>
            <div class="admin-overview-card-note">Yêu cầu nâng cấp Plus đang chờ admin xử lý.</div>
          </div>
        </section>

        <section class="admin-overview-chart-grid">
          <article class="card admin-insight-panel">
            <div class="admin-insight-head">
              <div>
                <h2>Biểu đồ tăng trưởng người dùng</h2>
                <p class="muted">Số tài khoản đăng ký mới theo tháng trong 6 tháng gần nhất.</p>
              </div>
            </div>
            ${buildLineChart(summary?.userGrowth)}
          </article>

          <article class="card admin-insight-panel">
            <div class="admin-insight-head">
              <div>
                <h2>Biểu đồ cơ cấu khóa học</h2>
                <p class="muted">Phân bổ số khóa học theo danh mục hiện có trên hệ thống.</p>
              </div>
            </div>
            ${buildPieChart(summary?.courseComposition)}
          </article>
        </section>

        <section class="admin-overview-quality-grid">
          <article class="card admin-insight-panel">
            <div class="admin-insight-head">
              <div>
                <h2>Top 5 khóa học được quan tâm nhất</h2>
                <p class="muted">Xếp theo số lượng enrollment để phản ánh sức hút nội dung.</p>
              </div>
              <div class="admin-insight-pill">${totalEnrollments} enrollment</div>
            </div>
            ${buildCourseTable(summary?.topInterestedCourses, 'interest')}
          </article>

          <article class="card admin-insight-panel">
            <div class="admin-insight-head">
              <div>
                <h2>Top khóa học hoàn thành cao</h2>
                <p class="muted">Xếp theo tỷ lệ hoàn thành trên số lượt ghi danh của từng khóa.</p>
              </div>
              <div class="admin-insight-pill">${completionRate} hoàn thành chung</div>
            </div>
            ${buildCourseTable(summary?.topCompletedCourses, 'completion')}
          </article>
        </section>
      </div>
    `;
  }

  (async function load() {
    try {
      const summary = await window.StudyAdmin.request('admin/insights/overview', { method: 'GET' });
      renderDashboard(summary || {});
    } catch (err) {
      content.innerHTML = `<div class="card"><p class="muted">${escapeHtml(err?.message || 'Không tải được thống kê hệ thống.')}</p></div>`;
    }
  })();
})();
