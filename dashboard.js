'use strict';

let dashboardDepartmentId = '';
const dashboardDayMs = 86_400_000;

function dashboardTrend(records, today) {
  const counts = new Map();
  for (const item of records) {
    const created = item.createdAt?.slice(0, 10);
    const closed = terminal.includes(item.status) ? item.closedAt?.slice(0, 10) : null;
    if (created) {
      const entry = counts.get(created) ?? { created: 0, closed: 0 };
      entry.created++;
      counts.set(created, entry);
    }
    if (closed) {
      const entry = counts.get(closed) ?? { created: 0, closed: 0 };
      entry.closed++;
      counts.set(closed, entry);
    }
  }
  return Array.from({ length: 14 }, (_, i) => {
    const iso = new Date(today - (13 - i) * dashboardDayMs).toISOString().slice(0, 10);
    return { iso, label: `${iso.slice(8, 10)}.${iso.slice(5, 7)}`, ...(counts.get(iso) ?? { created: 0, closed: 0 }) };
  });
}

function dashboardTrendPanel(days) {
  const max = Math.max(1, ...days.flatMap(day => [day.created, day.closed]));
  const plot = { left: 33, right: 594, top: 13, bottom: 145 };
  const x = i => plot.left + i * (plot.right - plot.left) / (days.length - 1);
  const y = n => plot.bottom - n * (plot.bottom - plot.top) / max;
  const points = key => days.map((day, i) => `${x(i).toFixed(2)},${y(day[key]).toFixed(2)}`).join(' ');
  const created = days.reduce((total, day) => total + day.created, 0);
  const closed = days.reduce((total, day) => total + day.closed, 0);
  const ticks = [...new Set([0, Math.round(max / 2), max])];
  return `<section class="panel dash-panel dash-trend" aria-labelledby="dash-trend-title">
    <div class="dash-panel-heading">
      <div><h2 id="dash-trend-title">Динамика обращений</h2><p class="sub">Последние 14 дней · даты по UTC</p></div>
      <span class="dash-range">${days[0].label}–${days.at(-1).label}</span>
    </div>
    <div class="dash-legend"><span><i></i> Подано · ${created}</span><span><i></i> Завершено · ${closed}</span></div>
    <svg class="dash-plot" viewBox="0 0 610 152" aria-hidden="true" focusable="false">
      ${ticks.map(tick => `<line x1="${plot.left}" x2="${plot.right}" y1="${y(tick)}" y2="${y(tick)}"/><text x="22" y="${y(tick)}" dominant-baseline="middle" text-anchor="end">${tick}</text>`).join('')}
      <g class="dash-series">
        <polygon points="${plot.left},${plot.bottom} ${points('created')} ${plot.right},${plot.bottom}"/>
        <polyline points="${points('created')}"/>
        <polyline class="dash-closed-line" points="${points('closed')}"/>
      </g>
    </svg>
    <div class="dash-plot-dates" aria-hidden="true"><span>${days[0].label}</span><span>${days[6].label}</span><span>${days.at(-1).label}</span></div>
    ${created + closed === 0 ? '<p class="hint dash-no-trend">За этот период обращений не подано и не завершено.</p>' : ''}
    <details><summary>Данные по дням</summary><table class="dash-table" aria-label="Динамика обращений за 14 дней">
      <thead><tr><th scope="col">Дата</th><th scope="col">Подано</th><th scope="col">Завершено</th></tr></thead>
      <tbody>${days.map(day => `<tr><th scope="row"><time datetime="${day.iso}">${day.label}</time></th><td>${day.created}</td><td>${day.closed}</td></tr>`).join('')}</tbody>
    </table></details>
  </section>`;
}

function dashboardOverduePanel(records, nowMs) {
  const rows = records.slice(0, 5);
  const label = role === 'manager' ? 'Выберите обращение, чтобы открыть карточку.' : 'Карточки доступны руководителю.';
  return `<section class="panel dash-panel dash-overdue" aria-labelledby="dash-overdue-title">
    <div class="dash-panel-heading"><h2 id="dash-overdue-title">Просроченные</h2><span class="dash-total">${records.length}</span></div>
    ${records.length ? `<p class="sub">${label}</p><ul>${rows.map(item => {
      const hours = Math.floor((nowMs - Date.parse(item.dueAt)) / 3_600_000);
      const duration = hours < 1 ? '&lt; 1 ч' : `${number(hours)} ч`;
      const row = `<div><strong>${esc(item.number)}</strong><span>${mode === 'partial' ? 'Категория недоступна' : esc(category(item.categoryId))}</span></div><span class="dash-late">${duration}<span class="sr-only"> просрочки</span></span>`;
      return `<li>${role === 'manager' ? `<a class="dash-overdue-row" href="#detail/${encodeURIComponent(item.id)}">${row}</a>` : `<div class="dash-overdue-row">${row}</div>`}</li>`;
    }).join('')}</ul>${records.length > rows.length ? `<p class="hint">Показано ${rows.length} из ${records.length} · сначала самые давние</p>` : ''}` : '<p class="sub">В выбранном подразделении нет обращений с истёкшим сроком.</p>'}
  </section>`;
}

function dashboardDistribution(title, records, field, getName) {
  const counts = new Map();
  for (const record of records) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  const rows = Array.from(counts, ([id, count]) => ({ name: getName(id), count }));
  rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
  const maximum = rows[0]?.count ?? 1;
  return `<section class="panel dash-panel"><h2>${esc(title)}</h2><ol class="dash-distribution">
    ${rows.map(row => `<li><div><span>${esc(row.name)}</span><b>${row.count}</b></div><span aria-hidden="true" class="dash-track"><i style="width:${row.count / maximum * 100}%"></i></span></li>`).join('')}
  </ol></section>`;
}

function dashboard() {
  const records = dashboardDepartmentId ? items.filter(item => item.departmentId === dashboardDepartmentId) : items;
  const nowMs = Date.now();
  const days = dashboardTrend(records, nowMs);
  const closed = records.filter(item => terminal.includes(item.status));
  const late = records.filter(overdue).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const durations = closed.map(item => (Date.parse(item.closedAt) - Date.parse(item.createdAt)) / 3_600_000).filter(hours => Number.isFinite(hours) && hours >= 0);
  const average = durations.length ? `${number(durations.reduce((sum, hours) => sum + hours, 0) / durations.length)} ч` : 'Нет данных';
  const selector = `<label class="dash-department" for="dash-department">Подразделение<select id="dash-department"><option value="">Все подразделения</option>${ref.departments.map(item => `<option value="${esc(item.id)}" ${item.id === dashboardDepartmentId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>`;
  return `<div class="dashboard">
    ${pagehead(role === 'manager' ? 'РАБОЧАЯ ОБЛАСТЬ РУКОВОДИТЕЛЯ' : 'АДМИНИСТРАТОР · ТОЛЬКО ПРОСМОТР', 'Дашборд', 'Как меняется нагрузка и какие обращения требуют внимания.', selector)}
    ${partial()}
    <div class="metrics" role="group" aria-label="Показатели за всё время">
      ${metric(records.length, 'Всего обращений', 'За всё время')}
      ${metric(records.length - closed.length, 'Открыто', `Завершено ${closed.length}`)}
      ${metric(late.length, 'Просрочено', 'Срок прошёл, итога нет')}
      ${metric(average, 'Среднее время решения', 'От подачи до завершения')}
    </div>
    ${records.length ? `<div class="dash-grid">${dashboardTrendPanel(days)}${dashboardOverduePanel(late, nowMs)}</div>
    <div class="dash-breakdown">${mode === 'partial' ? '<section class="panel dash-panel"><h2>По категориям</h2><p class="sub">Категории временно недоступны.</p></section>' : dashboardDistribution('По категориям', records, 'categoryId', category)}${dashboardDistribution('По подразделениям', records, 'departmentId', department)}</div>` : '<section class="empty"><h2>Нет обращений</h2><p>Выберите другое подразделение, чтобы посмотреть его показатели.</p></section>'}
  </div>`;
}

function bindDashboard() {
  const field = document.querySelector('#dash-department');
  if (!field) return;
  field.onchange = () => {
    dashboardDepartmentId = field.value;
    render();
    document.querySelector('#dash-department').focus({ preventScroll: true });
    announce(dashboardDepartmentId ? `Показаны данные подразделения «${department(dashboardDepartmentId)}».` : 'Показаны данные всех подразделений.');
  };
}
