'use strict';

const sessionKey = 'caliginous-demo-v1';

function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function saveSession() {
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({
      items, role, draft, lastCreated, seen: [...seenNotifications], theme: $('#theme').value,
    }));
  } catch {
    // The demo still works in memory if storage is restricted or full.
  }
}

function notificationEvents() {
  if (role === 'admin') return [];
  const visible = role === 'employee' ? items.filter(item => item.author.id === 'employee-1') : items;
  const events = [];
  for (const item of visible) {
    const add = (kind, at, label, text) => {
      if (at) events.push({ id: `${item.id}:${kind}:${at}`, item, at, label, text });
    };
    if (role === 'employee') {
      for (const comment of item.comments) {
        if (comment.kind === 'clarification_request') add('question', comment.createdAt, 'Запросили уточнение', comment.text);
      }
      if (item.decision) add('decision', item.closedAt, 'Зафиксирован итог', item.decision.explanation);
    } else {
      if (!item.assignee && !terminal.includes(item.status)) {
        add('assign', item.createdAt, 'Нужен ответственный', 'Назначьте сотрудника для рассмотрения.');
      }
      const latestReply = item.comments.findLast(comment => comment.kind === 'clarification_response');
      if (latestReply) add('reply', latestReply.createdAt, 'Получен ответ автора', latestReply.text);
      const remaining = Date.parse(item.dueAt) - Date.now();
      if (remaining <= 86400000 && !terminal.includes(item.status)) {
        add('deadline', new Date(Date.parse(item.dueAt) - 86400000).toISOString(), 'Срок рассмотрения',
          remaining < 0 ? 'Срок прошёл. Проверьте, что задерживает рассмотрение.' : 'До срока осталось меньше суток.');
      }
    }
  }
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function inbox() {
  const events = notificationEvents();
  const unread = events.filter(event => !seenNotifications.has(event.id));
  const markAll = unread.length ? '<button class="btn" type="button" id="read-all">Отметить все прочитанными</button>' : '';
  const list = events.map(event => {
    const isNew = !seenNotifications.has(event.id);
    return `<a class="panel inbox-item" href="#detail/${esc(event.item.id)}" data-read-event="${esc(event.id)}">
      <span class="inbox-mark" aria-hidden="true">${isNew ? '●' : '○'}</span>
      <span class="inbox-content"><span class="inbox-title">${esc(event.label)}${isNew ? '<small>Новое</small>' : ''}</span>
      <span class="inbox-copy">${esc(event.text)}</span>
      <span class="hint"><span class="number">${esc(event.item.number)}</span> · <time datetime="${esc(event.at)}">${dateTime(event.at)}</time></span></span>
      <span aria-hidden="true">→</span>
    </a>`;
  }).join('');
  return pagehead('РАБОЧАЯ ОБЛАСТЬ', 'Уведомления', 'События, которые помогают следить за обращениями.', markAll) +
    (list ? `<div class="inbox-list" role="region" aria-label="Лента уведомлений">${list}</div>` :
      `<section class="empty"><h2>Новых событий пока нет</h2><p>Здесь появятся вопросы, ответы и результаты рассмотрения.</p><a class="btn" href="#${home()}">К обращениям</a></section>`);
}

function about() {
  return pagehead('CALIGINOUS', 'О сервисе', 'Как обращение проходит от подачи до решения.') + `
    <div class="about-grid">
      <section class="panel about-card"><h2>Подать обращение</h2><p>Сотрудник описывает ситуацию и выбирает категорию. После регистрации видны номер, срок и ответственный.</p>${role === 'employee' ? '<a class="btn primary" href="#submit">Новое обращение</a>' : ''}</section>
      <section class="panel about-card"><h2>Рассмотреть обращение</h2><p>Руководитель берёт обращение в работу, задаёт вопрос автору и фиксирует решение с пояснением.</p>${role === 'manager' ? '<a class="btn primary" href="#queue">К очереди</a>' : ''}</section>
      <section class="panel about-card"><h2>Посмотреть показатели</h2><p>Администратор видит сводку. Дашборд показывает нагрузку и динамику по подразделениям.</p>${role !== 'employee' ? '<a class="btn" href="#dashboard">К дашборду</a>' : ''}</section>
    </div>
    <section class="notice about-note"><h2>Как устроено демо</h2><p>Выберите роль в шапке и попробуйте любой сценарий. Обращения, черновик и отметки о прочтении хранятся в этой вкладке, в том числе после обновления страницы. Используйте только вымышленные сведения.</p><p>В меню «Настройки демо» внизу страницы можно восстановить исходные примеры и посмотреть состояния интерфейса.</p></section>`;
}

function bindInbox() {
  const markAll = $('#read-all');
  if (markAll) markAll.onclick = () => {
    for (const event of notificationEvents()) seenNotifications.add(event.id);
    saveSession();
    render(true);
    announce('Все уведомления прочитаны.');
  };
  document.querySelectorAll('[data-read-event]').forEach(link => {
    link.onclick = () => {
      seenNotifications.add(link.dataset.readEvent);
      saveSession();
    };
  });
}

function exportQueue() {
  if (role !== 'manager' || mode !== 'ready') return;
  const encode = value => {
    const text = String(value ?? '');
    const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = filtered();
  const columns = ['Номер', 'Тип', 'Описание', 'Категория', 'Статус', 'Ответственный', 'Срок'];
  const contents = rows.map(item => [item.number, types[item.type], item.description, category(item.categoryId),
    statuses[item.status], owner(item), item.dueAt]);
  const csv = '\uFEFF' + [columns, ...contents].map(row => row.map(encode).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'caliginous-queue.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Строк в выгрузке: ${rows.length}.`);
}
