// Standalone design demo with fictional examples and per-tab browser storage.
'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ref = SEED.reference;
const savedSession = readSession();
let items = Array.isArray(savedSession.items) && savedSession.items.length ? savedSession.items : structuredClone(SEED.items);
const terminal = ['implemented', 'rejected', 'closed'];
const statuses = {new:'Новое',in_review:'На рассмотрении',in_progress:'В работе',awaiting_clarification:'Ожидает уточнения',implemented:'Реализовано',rejected:'Отклонено',closed:'Закрыто'};
const transitions = {new:['in_review','awaiting_clarification','rejected'],in_review:['in_progress','awaiting_clarification','implemented','rejected','closed'],in_progress:['in_review','awaiting_clarification','implemented','rejected','closed'],awaiting_clarification:['in_review'],implemented:[],rejected:[],closed:[]};
const types = {problem:'Проблема',suggestion:'Предложение',praise:'Благодарность'};
const roles = {manager:'Руководитель',employee:'Сотрудник',admin:'Администратор'};
const now = () => new Date().toISOString();
const date = value => value ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'Asia/Qyzylorda'}).format(new Date(value)) : 'Не указан';
const dateTime = value => value ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Qyzylorda'}).format(new Date(value)) : 'Не указано';
const number = value => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value);
const category = id => ref.categories.find(x=>x.id===id)?.name ?? 'Категория не указана';
const department = id => ref.departments.find(x=>x.id===id)?.name ?? 'Подразделение не указано';
const owner = x => x.assignee?.name ?? 'Ожидает назначения';
const overdue = x => !terminal.includes(x.status) && new Date(x.dueAt).getTime() < Date.now();
const badge = value => `<span class="badge ${value}">${statuses[value]}</span>`;
const iconPaths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M5 19V9m7 10V4m7 15v-7M3 20h18"/>',
  list: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3zm4 10h4"/>',
  help: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.2-1.5 2.5m0 2.5v1"/>',
};
const icon = kind => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[kind]}</svg>`;
const roleRoutes = {
  manager: [['queue', 'Очередь', 'list'], ['dashboard', 'Дашборд', 'chart'], ['inbox', 'Уведомления', 'bell']],
  employee: [['my', 'Мои обращения', 'list'], ['submit', 'Новое обращение', 'plus'], ['inbox', 'Уведомления', 'bell']],
  admin: [['summary', 'Сводка', 'list'], ['dashboard', 'Дашборд', 'chart']],
};
const routeRole = { queue:'manager', my:'employee', submit:'employee', registered:'employee', summary:'admin' };
let role = Object.hasOwn(routeRole, current().route) ? routeRole[current().route]
  : Object.hasOwn(roles, savedSession.role) ? savedSession.role : 'manager';
let mode='ready', quick='all', search='', cat='', status='', dept='', dueAfter='', dueBefore='';
const emptyDraft = () => ({description:'',type:'problem',category:'',solution:'',attachment:false});
let draft = { ...emptyDraft(), ...savedSession.draft }, draftErrors = {}, lastCreated = savedSession.lastCreated ?? null;
const seenNotifications = new Set(Array.isArray(savedSession.seen) ? savedSession.seen : []);
let returnFocus=null, lastListScroll=0;
function current(){const [route,id]=location.hash.slice(1).split('/');return {route,id};}
function home(){return role==='manager'?'queue':role==='employee'?'my':'summary';}
function announce(text){$('#announcement').textContent=text;}
function go(route){if(current().route==='queue')lastListScroll=scrollY;location.hash='#'+route;}
function pagehead(kicker,title,sub='',action=''){return `<div class="pagehead"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1>${sub?`<p class="sub">${esc(sub)}</p>`:''}</div>${action}</div>`;}
function metric(value,label,note=''){return `<div class="metric"><strong>${value}</strong><span>${label}</span>${note?`<p>${note}</p>`:''}</div>`;}
function nav(){
  const links = [...roleRoutes[role], ['about','О сервисе','help']];
  const active = links.some(([url]) => url === current().route) ? current().route : home();
  const unread = ['ready', 'partial'].includes(mode) ? notificationEvents().filter(event => !seenNotifications.has(event.id)).length : 0;
  $('#nav').innerHTML = links.map(([url,label,img]) => {
    const count = url === 'inbox' && unread ? `<span class="nav-count" aria-label="Непрочитанных: ${unread}">${unread}</span>` : '';
    return `<a class="navlink ${active===url?'active':''}" href="#${url}" ${active===url?'aria-current="page"':''}>${icon(img)}<span>${label}</span>${count}</a>`;
  }).join('');
  $('#roleName').textContent=roles[role];$('#brand').href='#'+home();
  const sideNote = $('.side-note');
  const visibleItems = role === 'employee' ? items.filter(x => x.author?.id === 'employee-1') : items;
  const showSignal = (mode === 'ready' || mode === 'partial') && visibleItems.length > 0;
  sideNote.hidden = !showSignal;
  if (!showSignal) {
    delete sideNote.dataset.snapshot;
    sideNote.replaceChildren();
    return;
  }
  const outcomes = visibleItems.map(item => terminal.includes(item.status));
  const snapshot = `${role}:${outcomes.map(Number).join('')}`;
  if (sideNote.dataset.snapshot === snapshot) return;
  sideNote.dataset.snapshot = snapshot;
  const closed = outcomes.filter(Boolean).length;
  const percent = closed / visibleItems.length * 100;
  const scope = role === 'employee' ? 'МОИ ОБРАЩЕНИЯ' : 'СОСТОЯНИЕ ОБРАЩЕНИЙ';
  sideNote.innerHTML = `<span class="signal-label">${scope}</span>
    <div class="signal-dial">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <g class="dial-orbit">
          <circle class="dial-outer" cx="80" cy="80" r="66"/>
          <path class="dial-cross" d="M80 8v12m0 120v12M8 80h12m120 0h12"/>
        </g>
        <circle class="dial-track" cx="80" cy="80" r="54"/>
        <circle class="dial-progress" cx="80" cy="80" r="54" pathLength="100" stroke-dasharray="${percent} 100" transform="rotate(-90 80 80)"/>
      </svg>
      <div><strong>${Math.round(percent)}<small>%</small></strong><span>с итогом</span></div>
    </div>
    <p>${closed} из ${visibleItems.length} · Синтетические данные</p>
    <div class="signal-pixels" aria-hidden="true">${outcomes.map(done => `<i class="${done ? 'done' : ''}"></i>`).join('')}</div>
    <p class="signal-caption">Каждая точка — обращение.<br>Светлая — итог зафиксирован.</p>`;
}
function blockedState(route){
  if(mode==='ready'||mode==='partial')return '';
  const names={queue:'Очередь обращений',my:'Мои обращения',submit:'Новое обращение',detail:'Карточка обращения',summary:'Обзор обращений',registered:'Подтверждение',dashboard:'Дашборд',inbox:'Уведомления',about:'О сервисе'};
  let title,copy,action='Вернуться к данным';
  if(mode==='loading'){title='Загружаем данные';copy='Содержимое появится после ответа сервера. Это демонстрация состояния.';action='Завершить загрузку';}
  if(mode==='error'){title='Не удалось загрузить данные';copy=route==='submit'?'Введённый текст сохранён. Повторите загрузку категорий, чтобы продолжить.':'Проверьте подключение и повторите попытку. Список обращений пока недоступен.';action='Повторить';}
  if(mode==='empty'){title=route==='submit'?'Категории пока недоступны':route==='detail'?'Обращение не найдено':'Обращений пока нет';copy=route==='submit'?'Повторите загрузку. Отправка без категории недоступна.':route==='my'?'Начните с проблемы или идеи, которую хотите обсудить.':'Когда появятся обращения, здесь будут данные. Отсутствие ответов не означает нулевое время реакции.';action=route==='my'?'Создать первое обращение':'Вернуться к данным';}
  if(mode==='permission'){title='Этот раздел недоступен';copy='У текущей роли нет доступа к этим данным. Вернитесь в свою рабочую область.';action='В рабочую область';}
  return pagehead('СОСТОЯНИЕ МАКЕТА',names[route]||'Обращения')+`<section class="notice" ${mode==='error'?'role="alert"':mode==='loading'?'aria-busy="true"':''}><h2>${title}</h2><p>${copy}</p><button class="btn" data-recover="${mode==='permission'?home():mode==='empty'&&route==='my'?'submit':route}">${action}</button></section>${mode==='loading'?'<div aria-hidden="true"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>':''}`;
}
function partial(){return mode==='partial'?'<div class="notice compact" role="status"><p>Часть данных недоступна. Основная информация сохранена; отсутствующие сведения обозначены явно.</p><button class="btn" data-recover="same">Повторить загрузку</button></div>':'';}
function filtered(){
  const normalize = value => String(value ?? '').toLowerCase().replaceAll('ё', 'е');
  const query = normalize(search).trim();
  return items.filter(item => {
    const matchesQuick = quick === 'all' || quick === 'new' && item.status === 'new' ||
      quick === 'overdue' && overdue(item) || quick === 'unassigned' && !item.assignee;
    const due = item.dueAt.slice(0,10);
    const matchesFields = (!cat || item.categoryId === cat) && (!status || item.status === status) &&
      (!dept || item.departmentId === dept) && (!dueAfter || due >= dueAfter) && (!dueBefore || due <= dueBefore);
    const searchable = [item.number, item.description, item.proposedSolution, category(item.categoryId)];
    return matchesQuick && matchesFields && (!query || searchable.some(text => normalize(text).includes(query)));
  });
}
function queue(){
  const rows=filtered(); const counts={all:items.length,new:items.filter(x=>x.status==='new').length,overdue:items.filter(overdue).length,unassigned:items.filter(x=>!x.assignee).length};
  const exportButton = mode === 'ready' && rows.length ? '<button class="btn" id="export-queue" type="button">Скачать CSV</button>' : '';
  return pagehead('РАБОЧАЯ ОБЛАСТЬ РУКОВОДИТЕЛЯ','Очередь обращений','Найдите то, что требует вашего действия.',exportButton)+partial()+
  `<div class="quick" role="group" aria-label="Быстрые фильтры">${[['all','Все'],['new','Новые'],['overdue','Просроченные'],['unassigned','Без ответственного']].map(([key,label])=>`<button data-quick="${key}" aria-pressed="${quick===key}">${label}<span class="count">${counts[key]}</span></button>`).join('')}</div>
  <div class="toolbar"><label class="search"><span class="sr-only">Поиск по номеру или тексту</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="search" type="search" placeholder="Номер или текст обращения" value="${esc(search)}"></label><span class="hint">Найдено ${rows.length} из ${items.length}</span></div>
  <details class="filters" ${cat||status||dept||dueAfter||dueBefore?'open':''}><summary>Дополнительные фильтры${cat||status||dept||dueAfter||dueBefore?' · применены':''}</summary><div class="filter-fields"><label>Категория<select id="categoryFilter"><option value="">Все категории</option>${ref.categories.map(x=>`<option value="${x.id}" ${cat===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${cat?`<span class="filter-selected">${esc(category(cat))}</span>`:''}</label><label>Статус<select id="statusFilter"><option value="">Все статусы</option>${Object.entries(statuses).map(([key,label])=>`<option value="${key}" ${status===key?'selected':''}>${label}</option>`).join('')}</select></label><label>Подразделение<select id="departmentFilter"><option value="">Все подразделения</option>${ref.departments.map(x=>`<option value="${x.id}" ${dept===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Срок от<input id="dueAfter" type="date" value="${dueAfter}"></label><label>Срок до<input id="dueBefore" type="date" value="${dueBefore}"></label><button class="btn" data-clear>Сбросить фильтры</button></div>${dueAfter&&dueBefore&&dueAfter>dueBefore?'<p class="field-error" role="alert">Начало периода должно быть не позже окончания.</p>':''}</details>
  <div class="list" role="region" aria-label="Обращения"><div class="listhead"><span>Обращение</span><span>Статус</span><span>Ответственный</span><span>Срок</span></div>${rows.map(x=>`<a class="row" data-id="${x.id}" href="#detail/${x.id}"><div class="rowtitle"><span class="desc">${esc(x.description)}</span><div class="rowmeta"><span class="number">${x.number}</span> · ${mode==='partial'?'Категория не загрузилась':esc(category(x.categoryId))}<span class="mobile-owner"> · ${esc(owner(x))}</span></div></div>${badge(x.status)}<span class="owner-cell"><span class="cell-label">Ответственный</span>${esc(owner(x))}</span><span class="due-cell ${overdue(x)?'overdue':''}"><span class="cell-label">Срок</span>${date(x.dueAt)}${overdue(x)?'<small>Просрочено</small>':''}</span></a>`).join('')||'<div class="empty"><h2>По этим условиям ничего нет</h2><p>Измените запрос или вернитесь ко всем обращениям.</p><button class="btn" data-clear>Сбросить фильтры и поиск</button></div>'}</div><div class="tablefoot"><span>Показано ${rows.length} из ${items.length}</span><span>Все записи локального макета</span></div>`;
}
function my(){
  const mine=items.filter(x=>x.author?.id==='employee-1').sort((a,b)=>(b.status==='awaiting_clarification')-(a.status==='awaiting_clarification')||new Date(b.updatedAt)-new Date(a.updatedAt));
  return pagehead('РАБОЧАЯ ОБЛАСТЬ СОТРУДНИКА','Мои обращения','Статус, ответственный и следующий шаг — в одном месте.',`<a class="btn primary" href="#submit">+ Новое обращение</a>`)+partial()+`<div class="mylist">${mine.map(x=>`<a class="panel myitem" data-id="${x.id}" href="#detail/${x.id}"><div class="myitem-head"><span class="number">${x.number} <span class="muted">/ ${types[x.type]}</span></span>${badge(x.status)}</div><h2>${esc(x.description)}</h2>${x.status==='awaiting_clarification'?'<p class="attention">Нужен ваш ответ на вопрос руководителя</p>':''}<div class="myitem-foot"><div><span class="key">${terminal.includes(x.status)?'Результат':'Следующий шаг'}</span><p>${esc(x.nextAction)}</p></div><div><span class="key">${esc(owner(x))}</span><span class="${overdue(x)?'overdue':''}">${overdue(x)?'Просрочено · ':''}Срок ${date(x.dueAt)}</span></div></div></a>`).join('')||'<div class="empty"><h2>Обращений пока нет</h2><a class="btn primary" href="#submit">Создать обращение</a></div>'}</div>`;
}
function fieldError(key){return `<p class="field-error" id="${key}-error" ${draftErrors[key]?'role="alert"':''}>${esc(draftErrors[key]||'')}</p>`;}
function submit(){
  return pagehead('ОБРАТНАЯ СВЯЗЬ','Новое обращение','Начните с ситуации. Мы поможем сделать следующий шаг понятным.')+partial()+`<div class="form-grid"><form id="submitForm" class="panel formwrap" novalidate>
  <div class="field"><label for="description">Что произошло или что вы предлагаете? <span class="optional">· обязательно</span></label><span class="hint" id="description-hint">Где возникла ситуация и что можно улучшить?</span><textarea id="description" name="description" rows="5" maxlength="5000" required aria-invalid="${!!draftErrors.description}" aria-describedby="description-hint description-error">${esc(draft.description)}</textarea>${fieldError('description')}</div>
  <div class="field"><label for="type">Тип обращения</label><select id="type" name="type">${Object.entries(types).map(([key,label])=>`<option value="${key}" ${draft.type===key?'selected':''}>${label}</option>`).join('')}</select></div>
  <div class="field"><label for="category">Категория <span class="optional">· обязательно</span></label><select id="category" name="category" required ${mode==='partial'?'disabled':''} aria-invalid="${!!draftErrors.category}" aria-describedby="selected-category category-error"><option value="">Выберите категорию</option>${ref.categories.map(x=>`<option value="${x.id}" ${draft.category===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><span id="selected-category" class="hint">${mode==='partial'?'Справочник недоступен. Повторите загрузку выше.':draft.category?esc(category(draft.category)):'Категория определяет, кому поступит обращение.'}</span>${fieldError('category')}</div>
  <details ${draft.solution?'open':''}><summary>Предлагаемое решение · необязательно</summary><label for="solution" class="sr-only">Предлагаемое решение</label><textarea id="solution" name="solution" rows="3" maxlength="5000">${esc(draft.solution)}</textarea></details>
  <label class="checkbox-label"><input type="checkbox" name="attachment" ${draft.attachment?'checked':''}>Добавить тестовое вложение</label><p class="hint">Имитация: только сведения о sample-request.txt, содержимое файла не загружается.</p>
  <div class="form-actions"><button class="btn primary" ${mode==='partial'?'disabled':''}>Отправить обращение</button><span class="hint">Ваш текст сохранится при ошибке</span></div></form>
  <aside class="form-aside"><span class="mini-rule"></span><h2>Что будет дальше</h2>${[['01','Регистрация','Вы получите номер обращения.'],['02','Рассмотрение','Ответственный увидит описание и при необходимости задаст вопрос.'],['03','Понятный результат','Решение и объяснение появятся в ваших обращениях.']].map(([n,title,copy])=>`<div class="step"><span class="number">${n}</span><div><b>${title}</b><p>${copy}</p></div></div>`).join('')}<p class="hint">Обращение видят автор и уполномоченные участники обработки. Анонимный режим в этом макете не представлен.</p></aside></div>`;
}
function contextStrip(x){return `<div class="detail-top"><div><span class="key">Статус</span>${badge(x.status)}</div><div><span class="key">Ответственный</span>${esc(owner(x))}</div><div><span class="key">Срок рассмотрения</span><span class="${overdue(x)?'overdue':''}">${dateTime(x.dueAt)}${overdue(x)?' · Просрочено':''}</span></div><div class="next-step"><span class="key">${terminal.includes(x.status)?'Итог зафиксирован':'Следующий шаг'}</span><p>${esc(x.nextAction)}</p></div></div>`;}
function registered(){const x=items.find(x=>x.id===lastCreated);if(!x)return '<div class="notice"><h1>Подтверждение недоступно</h1><a class="btn" href="#my">К моим обращениям</a></div>';return `<section class="panel registration"><span class="success-symbol" aria-hidden="true">✓</span><h1>Обращение зарегистрировано</h1><p class="big-number">${x.number}</p><p class="muted">Оно появилось в ваших обращениях. Ниже — назначение и следующий шаг.</p>${contextStrip(x)}<div class="form-actions"><a class="btn primary" href="#detail/${x.id}">Открыть обращение</a><a class="btn text" href="#my">К моим обращениям</a></div></section>`;}
function actions(x){
  if(terminal.includes(x.status))return `<section class="panel actionbox"><h2>Результат сохранён</h2><p class="hint">${statuses[x.status]}. Объяснение и история доступны в карточке.</p></section>`;
  if(role==='employee'){
    if(x.status!=='awaiting_clarification')return `<section class="panel actionbox"><h2>Действий не требуется</h2><p class="hint">Следите за рассмотрением в этой карточке.</p></section>`;
    const question=[...x.comments].reverse().find(c=>c.kind==='clarification_request');
    return `<section class="panel actionbox"><h2>Нужен ваш ответ</h2><p>${esc(question?.text||'Уточните сведения по обращению.')}</p><form id="replyForm" novalidate><label for="reply">Ваш ответ<textarea id="reply" rows="3" maxlength="5000" required></textarea></label><p class="field-error" id="reply-error"></p><button class="btn primary">Отправить ответ</button></form></section>`;
  }
  const allowed=transitions[x.status];
  return `<section class="panel actionbox"><h2>Работа с обращением</h2><p class="hint">Действия и пояснения видны автору.</p><div class="action-buttons">${allowed.includes('in_review')?`<button class="btn primary" data-transition="in_review">${x.status==='new'?'Начать рассмотрение':'Вернуть на рассмотрение'}</button>`:''}${allowed.includes('in_progress')?'<button class="btn primary" data-transition="in_progress">Взять в работу</button>':''}${allowed.includes('awaiting_clarification')?'<button class="btn" data-action="clarification">Запросить уточнение</button>':''}${allowed.some(x=>terminal.includes(x))?`<button class="btn" data-action="decision">${x.status==='new'?'Отклонить с объяснением':'Зафиксировать итог'}</button>`:''}<button class="btn" data-action="comment">Добавить комментарий</button><button class="btn text" data-action="assignment">${x.assignee?'Изменить ответственного':'Назначить ответственного'}</button></div></section>`;
}
function detail(id){
  const x=items.find(x=>x.id===id);
  if(!x)return '<section class="notice"><h1>Обращение не найдено</h1><a class="btn" href="#'+home()+'">В рабочую область</a></section>';
  if(role==='admin'||role==='employee'&&x.author?.id!=='employee-1')return '<section class="notice"><h1>Нет доступа к обращению</h1><p>Эта роль может просматривать только доступные ей сведения.</p><a class="btn" href="#'+home()+'">В рабочую область</a></section>';
  const events=[...(x.history||[]).map(e=>({at:e.createdAt,actor:e.actor?.name||'Система',text:e.text,kind:'Событие'})),...(x.comments||[]).map(c=>({at:c.createdAt,actor:c.author?.name||'Участник',text:c.text,kind:c.kind==='clarification_request'?'Вопрос руководителя':c.kind==='clarification_response'?'Ответ автора':'Комментарий'}))].sort((a,b)=>new Date(a.at)-new Date(b.at));
  return `<a class="btn text" data-back href="#${home()}">← ${role==='employee'?'К моим обращениям':'К очереди'}</a>`+pagehead(`${x.number} / ${types[x.type]}`,`Обращение ${x.number}`,`Создано ${dateTime(x.createdAt)} · обновлено ${dateTime(x.updatedAt)}`)+partial()+contextStrip(x)+`<div class="detail-grid">${actions(x)}<article class="panel detail-body">${x.decision?`<section class="result ${x.decision.outcome}"><h2>Итог рассмотрения</h2>${badge(x.decision.outcome)}<p>${esc(x.decision.explanation)}</p>${x.decision.actions?`<h3>Дальнейшие действия</h3><p>${esc(x.decision.actions)}</p>`:''}<p class="hint">${esc(x.decision.author?.name||'Руководитель')} · ${dateTime(x.decision.createdAt)}</p></section>`:''}<h2>Описание обращения</h2><p>${esc(x.description)}</p>${x.proposedSolution?`<h3>Предлагаемое решение</h3><p>${esc(x.proposedSolution)}</p>`:''}<p class="hint">${mode==='partial'?'Категория не загрузилась':esc(category(x.categoryId))} · ${esc(department(x.departmentId))}</p><p class="hint">Автор: ${esc(x.author?.name||'Не указан')}</p>${x.attachments?.length?`<p class="hint">Тестовое вложение · ${esc(x.attachments[0].name)}. Имитация: содержимое не загружено.</p>`:''}<div class="sectionline"></div><h2>История и обсуждение</h2>${events.map(e=>`<div class="activity"><span class="kind">${e.kind}</span><b>${esc(e.actor)}</b><p>${esc(e.text)}</p><time datetime="${esc(e.at)}">${dateTime(e.at)}</time></div>`).join('')}</article></div>`;
}
function chart(title,rows,note=''){
  const max=Math.max(1,...rows.map(x=>x.count));
  return `<section class="panel"><h2>${title}</h2>${note?`<p class="sub">${note}</p>`:''}<div class="bars" aria-hidden="true">${rows.map(x=>`<div class="barrow"><span>${esc(x.name)}</span><span class="bar"><i style="width:${x.count/max*100}%"></i></span><b>${x.count}</b></div>`).join('')}</div><details><summary>Посмотреть таблицу</summary><table aria-label="${title}"><thead><tr><th scope="col">${title==='Обращения по типам'?'Тип':'Категория'}</th><th scope="col">Количество</th></tr></thead><tbody>${rows.map(x=>`<tr><th scope="row">${esc(x.name)}</th><td>${x.count}</td></tr>`).join('')}</tbody></table></details></section>`;
}
function summary(){
  const closed=items.filter(x=>terminal.includes(x.status)).length;
  const responded=items.filter(x=>x.firstResponseAt);
  const avg=responded.length?responded.reduce((sum,x)=>sum+(new Date(x.firstResponseAt)-new Date(x.createdAt))/3600000,0)/responded.length:null;
  const cats=Object.entries(items.reduce((a,x)=>(a[x.categoryId]=(a[x.categoryId]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).filter(([,n])=>n>=2).map(([id,n])=>({name:category(id),count:n}));
  return pagehead('АДМИНИСТРАТОР · ТОЛЬКО ПРОСМОТР','Обзор обращений','Как быстро мы отвечаем и какие темы встречаются чаще.')+partial()+`<p class="summary-note">Все обращения локального набора · расчёт ${dateTime(now())} · исходные данные A-001…A-020</p><div class="metrics">${metric(items.length,'Всего обращений','За всё время')}${metric(number(items.length?closed/items.length*100:0)+'%','Завершено',`${closed} из ${items.length} · включая отказ`)}${metric(avg===null?'Нет данных':number(avg)+' ч','Первый ответ',`По ${responded.length} обращениям с ответом`)}${metric(items.filter(overdue).length,'Просрочено','Срок прошёл, решения нет')}</div><div class="summarygrid">${chart('Обращения по типам',Object.entries(types).map(([key,name])=>({name,count:items.filter(x=>x.type===key).length})),'Распределение проблем, предложений и благодарностей.')}${mode==='partial'?'<section class="notice"><h2>Категории не загрузились</h2><p>Показатели выше доступны. График категорий появится после повторной загрузки.</p><button class="btn" data-recover="same">Повторить загрузку</button></section>':cats.length?chart('Темы с несколькими обращениями',cats,'Категории с двумя и более обращениями. Совпадение категории не доказывает повтор одной проблемы.'):'<section class="panel"><h2>Темы с несколькими обращениями</h2><p>В каждой категории пока не больше одного обращения.</p></section>'}</div><p class="summary-note">«Завершено» включает «Реализовано», «Отклонено» и «Закрыто». Первый ответ — действие руководителя, без регистрации и автоматического назначения. Очередь обработки доступна роли руководителя.</p>`;
}
function render(focus=false){
  let {route,id}=current();
  const allowed = [...roleRoutes[role].map(([key]) => key), 'detail', 'about'];
  if (role === 'employee') allowed.push('registered');
  if (!allowed.includes(route)) route = home();
  nav();$('#crumb').textContent={queue:'Очередь',my:'Мои обращения',submit:'Новое обращение',detail:'Карточка',registered:'Зарегистрировано',summary:'Сводка',dashboard:'Дашборд',inbox:'Уведомления',about:'О сервисе'}[route];
  const blocked=blockedState(route);
  $('#main').innerHTML=blocked||({queue, my, submit, summary, registered, dashboard, inbox, about}[route]?.() ?? detail(id));
  bind();
  if (route === 'dashboard' && !blocked) bindDashboard();
  if (route === 'inbox' && !blocked) bindInbox();
  if(focus){$('#main').focus({preventScroll:true});window.scrollTo(0,0);}
  observeMotion();
}
function resetFilters(){quick='all';search='';cat='';status='';dept='';dueAfter='';dueBefore='';render();announce('Фильтры сброшены.');}
function currentItem(){return items.find(x=>x.id===current().id);}
function record(x,text,toStatus){const time=now();x.history.push({createdAt:time,actor:{name:role==='employee'?'Сотрудник закупок':'Руководитель закупок'},text});x.updatedAt=time;if(role==='manager'&&!x.firstResponseAt)x.firstResponseAt=time;if(toStatus)x.status=toStatus;}
function updateNext(x){x.nextAction=terminal.includes(x.status)?x.decision.explanation:x.status==='awaiting_clarification'?'Автору нужно ответить на вопрос руководителя.':!x.assignee?'Руководитель назначит ответственного. Обращение остаётся в общей очереди.':x.status==='new'?'Ответственный рассмотрит обращение до указанного срока.':x.status==='in_progress'?'Ответственный выполняет работу и зафиксирует результат.':'Руководитель рассматривает обращение и определяет решение.';}
function dialog(action){
  const x=currentItem();if(!x||role!=='manager'||terminal.includes(x.status))return;
  returnFocus=document.activeElement;
  const config={assignment:['Назначить ответственного',`<label for="assignee">Ответственный<select id="assignee" name="assignee">${ref.assignees.map(a=>`<option value="${a.id}" ${x.assignee?.id===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`],comment:['Добавить комментарий','<label for="message">Комментарий<textarea id="message" name="message" maxlength="5000" rows="4" required></textarea></label>'],clarification:['Запросить уточнение','<p class="hint">Вопрос появится у автора вместе с кнопкой ответа.</p><label for="message">Вопрос автору<textarea id="message" name="message" maxlength="5000" rows="4" required></textarea></label>'],decision:['Зафиксировать итог',`<label for="outcome">Итог рассмотрения<select id="outcome" name="outcome">${transitions[x.status].filter(s=>terminal.includes(s)).map(s=>`<option value="${s}">${statuses[s]}</option>`).join('')}</select></label><div class="field"></div><label for="message">Объяснение решения<textarea id="message" name="message" maxlength="5000" rows="4" required></textarea></label><label for="followup">Дальнейшие действия <span class="hint">· необязательно</span><textarea id="followup" name="followup" maxlength="5000" rows="2"></textarea></label>`]};
  if(action==='clarification'&&!transitions[x.status].includes('awaiting_clarification')||action==='decision'&&!transitions[x.status].some(s=>terminal.includes(s)))return;
  $('#dialog-title').textContent=config[action][0];$('#dialog-body').innerHTML=`<form id="dialog-form" novalidate>${config[action][1]}<p id="dialog-error" class="field-error" role="alert"></p><button class="btn primary">${action==='clarification'?'Отправить вопрос':action==='decision'?'Сохранить итог':action==='assignment'?'Назначить':'Добавить комментарий'}</button></form>`;
  $('#action-dialog').showModal();
  $('#dialog-form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),text=String(f.get('message')||'').trim();
    if(action!=='assignment'&&!text){$('#dialog-error').textContent=action==='decision'?'Объясните решение или причину отказа.':'Введите текст сообщения.';$('#message').setAttribute('aria-invalid','true');$('#message').setAttribute('aria-describedby','dialog-error');$('#message').focus();return;}
    const time=now();
    if(action==='assignment'){x.assignee=ref.assignees.find(a=>a.id===f.get('assignee'));x.routing={queue:'assigned',reason:'manual_assignment'};const first=x.firstResponseAt;record(x,'Ответственный назначен вручную: '+x.assignee.name);x.firstResponseAt=first;}
    if(action==='comment'||action==='clarification'){x.comments.push({createdAt:time,author:{name:'Руководитель закупок'},text,kind:action==='comment'?'comment':'clarification_request'});if(action==='clarification')record(x,'Запрошено уточнение у автора.','awaiting_clarification');else {x.updatedAt=time;if(!x.firstResponseAt)x.firstResponseAt=time;}}
    if(action==='decision'){const s=String(f.get('outcome'));if(!transitions[x.status].includes(s))return;x.decision={outcome:s,explanation:text,actions:String(f.get('followup')||'').trim()||null,createdAt:time,author:{name:'Руководитель закупок'}};x.closedAt=time;record(x,'Зафиксирован итог: '+statuses[s],s);}
    updateNext(x);saveSession();$('#action-dialog').close();render(true);announce('Изменения сохранены.');
  };
}
function bind(){
  if ($('#export-queue')) $('#export-queue').onclick = exportQueue;
  document.querySelectorAll('[data-recover]').forEach(b=>b.onclick=()=>{mode='ready';$('#state').value=mode;const dest=b.dataset.recover;if(dest==='same'||dest===current().route){render(true);}else go(dest);announce('Данные загружены.');});
  document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=resetFilters);
  document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{quick=b.dataset.quick;render();$(`[data-quick="${quick}"]`).focus();announce('Фильтр применён. Найдено '+filtered().length);});
  document.querySelectorAll('.row').forEach(a=>a.onclick=()=>{lastListScroll=scrollY;});
  const back=$('[data-back]');if(back)back.onclick=()=>{setTimeout(()=>scrollTo(0,lastListScroll),50);};
  if($('#search'))$('#search').oninput=e=>{search=e.target.value;const caret=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(caret,caret);};
  [['categoryFilter',v=>cat=v],['statusFilter',v=>status=v],['departmentFilter',v=>dept=v],['dueAfter',v=>dueAfter=v],['dueBefore',v=>dueBefore=v]].forEach(([id,set])=>{if($('#'+id))$('#'+id).onchange=e=>{set(e.target.value);render();$('#'+id).focus();};});
  const form=$('#submitForm');
  if(form){
    form.oninput=()=>{const f=new FormData(form);draft={description:String(f.get('description')||''),type:String(f.get('type')||'problem'),category:String(f.get('category')??draft.category),solution:String(f.get('solution')||''),attachment:f.has('attachment')};for(const key of ['description','category'])if(draft[key].trim()&&draftErrors[key]){delete draftErrors[key];$('#'+key+'-error').textContent='';$('#'+key).setAttribute('aria-invalid','false');}if(mode!=='partial')$('#selected-category').textContent=draft.category?category(draft.category):'Категория определяет, кому поступит обращение.';saveSession();};
    form.onsubmit=e=>{e.preventDefault();if(mode!=='ready')return;draftErrors={};if(!draft.description.trim())draftErrors.description='Опишите ситуацию или предложение.';if(!draft.category)draftErrors.category='Выберите категорию.';if(Object.keys(draftErrors).length){render();$('#'+Object.keys(draftErrors)[0]).focus();return;}
      const c=ref.categories.find(x=>x.id===draft.category),time=now(),assigned=ref.assignees.find(a=>a.id===c.assigneeId)||null,n=Math.max(...items.map(x=>Number(x.number.slice(2))))+1;
      const x={id:'local-'+n,number:'A-'+String(n).padStart(3,'0'),type:draft.type,description:draft.description.trim(),categoryId:c.id,departmentId:'procurement',author:{id:'employee-1',name:'Сотрудник закупок'},proposedSolution:draft.solution.trim()||null,assignee:assigned,routing:{queue:assigned?'assigned':'unassigned',reason:assigned?'category_rule':'no_rule'},status:'new',createdAt:time,updatedAt:time,dueAt:new Date(Date.now()+c.dueInDays*86400000).toISOString(),firstResponseAt:null,closedAt:null,decision:null,comments:[],history:[{createdAt:time,actor:{name:'Сотрудник закупок'},text:'Обращение зарегистрировано в макете.'},{createdAt:time,actor:{name:'Система'},text:assigned?'Ответственный назначен по категории.':'Правило назначения не найдено. Обращение в общей очереди.'}],attachments:draft.attachment?[{name:'sample-request.txt',sizeBytes:120,isPlaceholder:true}]:[]};
      updateNext(x);items.unshift(x);lastCreated=x.id;draft=emptyDraft();saveSession();go('registered');announce(`Обращение ${x.number} зарегистрировано в макете.`);
    };
  }
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>dialog(b.dataset.action));
  document.querySelectorAll('[data-transition]').forEach(b=>b.onclick=()=>{const x=currentItem(),s=b.dataset.transition;if(role!=='manager'||!transitions[x.status].includes(s))return;record(x,'Статус изменён: '+statuses[s],s);updateNext(x);saveSession();render(true);announce('Статус изменён: '+statuses[s]);});
  const reply=$('#replyForm');if(reply)reply.onsubmit=e=>{e.preventDefault();const x=currentItem(),text=$('#reply').value.trim();if(!text){$('#reply-error').textContent='Введите ответ на вопрос.';$('#reply').setAttribute('aria-invalid','true');$('#reply').setAttribute('aria-describedby','reply-error');$('#reply').focus();return;}if(role!=='employee'||x.author.id!=='employee-1'||x.status!=='awaiting_clarification')return;x.comments.push({createdAt:now(),author:{name:'Сотрудник закупок'},text,kind:'clarification_response'});record(x,'Автор ответил на уточнение.','in_review');updateNext(x);saveSession();render(true);announce('Ответ отправлен. Обращение на рассмотрении.');};
}
$('#role').value = role;
const themeParam = new URLSearchParams(location.search).get('theme');
$('#theme').value = ['dark','light'].includes(themeParam) ? themeParam : savedSession.theme === 'light' ? 'light' : 'dark';
document.body.classList.toggle('dark', $('#theme').value === 'dark');
$('#role').onchange = event => {
  role = event.target.value;
  mode = 'ready';
  $('#state').value = mode;
  saveSession();
  if (current().route === 'detail' && role !== 'admin' || current().route === home()) render(true);
  else go(home());
};
$('#theme').onchange = event => {
  document.body.classList.toggle('dark', event.target.value === 'dark');
  if (themeParam) {
    const url = new URL(location.href);
    url.searchParams.delete('theme');
    if (location.protocol !== 'file:') history.replaceState(null, '', url);
  }
  saveSession();
};
$('#state').onchange=e=>{mode=e.target.value;render(true);};
$('#reset').onclick = () => {
  items = structuredClone(SEED.items);
  mode = 'ready';
  $('#state').value = mode;
  draft = emptyDraft();
  draftErrors = {};
  lastCreated = null;
  dashboardDepartmentId = '';
  seenNotifications.clear();
  saveSession();
  resetFilters();
  go(home());
  announce('Восстановлены исходные обращения.');
};
$('#close-dialog').onclick=()=>$('#action-dialog').close();
$('.skip').onclick=e=>{e.preventDefault();$('#main').focus();};
$('#action-dialog').addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});
window.addEventListener('hashchange',()=>render(true));
if(location.hash==='#main')location.hash='#'+home();
initMotion();
render();
