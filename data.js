'use strict';

// The teams, situations and responses below were invented for this public demo.
window.SEED = (() => {
  const departments = [
    { id: 'procurement', name: 'Снабжение' },
    { id: 'studio', name: 'Мастерская' },
    { id: 'customer-service', name: 'Сервис' },
    { id: 'administration', name: 'Администрация' },
  ];

  const assignees = [
    { id: 'facilities', name: 'Координатор рабочих пространств', role: 'manager', departmentId: 'administration' },
    { id: 'digital', name: 'Координатор цифровых инструментов', role: 'manager', departmentId: 'administration' },
    { id: 'stock-lead', name: 'Руководитель снабжения', role: 'manager', departmentId: 'procurement' },
    { id: 'studio-lead', name: 'Мастер смены', role: 'manager', departmentId: 'studio' },
    { id: 'service-lead', name: 'Руководитель сервиса', role: 'manager', departmentId: 'customer-service' },
  ];

  const categories = [
    { id: 'workplace', name: 'Рабочее пространство', dueInDays: 5, assigneeId: 'facilities' },
    { id: 'tools', name: 'Цифровые инструменты', dueInDays: 6, assigneeId: 'digital' },
    { id: 'supplies', name: 'Учёт и хранение', dueInDays: 8, assigneeId: 'stock-lead' },
    { id: 'handover', name: 'Передача смены', dueInDays: 6, assigneeId: 'studio-lead' },
    { id: 'service', name: 'Работа с клиентами', dueInDays: 7, assigneeId: 'service-lead' },
    { id: 'onboarding', name: 'Ввод в должность', dueInDays: 10, assigneeId: 'studio-lead' },
    { id: 'no_rule_demo', name: 'Другое', dueInDays: 7, assigneeId: null },
  ];

  const authors = {
    buyer: { id: 'employee-1', name: 'Сотрудник снабжения', role: 'employee', departmentId: 'procurement' },
    studio: { id: 'employee-studio', name: 'Сотрудник мастерской', role: 'employee', departmentId: 'studio' },
    service: { id: 'employee-service', name: 'Сотрудник сервиса', role: 'employee', departmentId: 'customer-service' },
    office: { id: 'employee-office', name: 'Сотрудник администрации', role: 'employee', departmentId: 'administration' },
  };
  const system = { name: 'Система', role: 'system' };

  const examples = [
    { daysAgo: 22, author: 'buyer', category: 'workplace', type: 'problem', status: 'new',
      description: 'У стола для проверки поставок не хватает света. Мелкие надписи на коробках приходится читать у окна.',
      solution: 'Установить настольный светильник с поворотным кронштейном.' },
    { daysAgo: 19, author: 'office', category: 'tools', type: 'suggestion', status: 'implemented',
      description: 'В календаре общих комнат трудно различить короткие встречи и бронирования на полдня.',
      solution: 'Добавить продолжительность в краткую карточку бронирования.',
      decision: 'Продолжительность встречи появилась рядом с названием. Изменение проверили в дневном и недельном видах.' },
    { daysAgo: 17, author: 'studio', category: 'handover', type: 'problem', status: 'in_review',
      description: 'При передаче смены иногда остаётся неясно, какое оборудование ждёт проверки.',
      solution: 'Ввести отдельное поле «Проверка не завершена» в журнале смены.' },
    { daysAgo: 16, author: 'service', category: 'service', type: 'praise', status: 'closed',
      description: 'Коллега из сервиса собрал ответы на вопросы о возвратах. На этой неделе по памятке удалось закрыть три обращения с первого звонка.',
      decision: 'Благодарность передана сервисной группе. Памятку закрепили в базе инструкций.' },
    { daysAgo: 14, author: 'buyer', category: 'supplies', type: 'suggestion', status: 'in_progress',
      description: 'Контейнеры с расходными материалами выглядят одинаково, когда стоят крышкой к проходу.',
      solution: 'Дублировать цветовую метку на боковой стороне каждого контейнера.',
      discussion: 'На стеллажах у входа начинаем пробную разметку. Через неделю сравним время поиска.' },
    { daysAgo: 13, author: 'studio', category: 'workplace', type: 'problem', status: 'rejected',
      description: 'Тележки, оставленные у входа в мастерскую, мешают открывать дверь на всю ширину.',
      solution: 'Сделать постоянную стоянку в соседнем коридоре.',
      decision: 'Коридор должен оставаться свободным. Вместо него для стоянки выделили место у заднего входа.',
      followup: 'Мастер смены покажет новую зону на планёрке.' },
    { daysAgo: 12, author: 'office', category: 'onboarding', type: 'suggestion', status: 'in_review',
      description: 'В первые дни новички повторно спрашивают, у кого забирать ключ от шкафчика и как оформить временный пропуск.',
      solution: 'Собрать контакты и порядок оформления на одной странице.' },
    { daysAgo: 11, author: 'service', category: 'service', type: 'problem', status: 'implemented',
      description: 'В шаблоне письма об отложенной доставке нет места для новой даты. Получатель вынужден уточнять её отдельно.',
      decision: 'В шаблон добавили строку с новой датой и пояснение, что указывать, если она пока неизвестна.' },
    { daysAgo: 10, author: 'buyer', category: 'tools', type: 'suggestion', status: 'in_review',
      description: 'После ввода артикула в журнале заявок клавиша Tab переводит курсор сразу к примечанию, пропуская количество.',
      solution: 'Изменить порядок полей при вводе с клавиатуры.' },
    { daysAgo: 9, author: 'studio', category: 'handover', type: 'suggestion', status: 'in_progress',
      description: 'Раз в неделю вместе работают сотрудники двух смен. Можно использовать это окно для короткой передачи незавершённых задач.',
      solution: 'Проверить формат десятиминутной встречи по средам.' },
    { daysAgo: 8, author: 'office', category: 'workplace', type: 'praise', status: 'closed',
      description: 'Спасибо за тихую зону на втором этаже. В ней получилось спокойно провести несколько встреч с новыми сотрудниками.',
      decision: 'Благодарность передали команде, которая подготовила помещение.' },
    { daysAgo: 7, author: 'service', category: 'onboarding', type: 'problem', status: 'awaiting_clarification',
      description: 'В вводном курсе для сервиса один и тот же экран показан с двумя разными названиями кнопки.',
      question: 'В каком разделе курса находится первый снимок экрана? Пришлите название урока.' },
    { daysAgo: 6, author: 'studio', category: 'supplies', type: 'problem', status: 'in_review',
      description: 'Если бирка отрывается от коробки, информацию о содержимом можно восстановить только по записи в журнале.',
      solution: 'Дублировать последние четыре цифры артикула маркером на крышке.',
      discussion: 'Руководитель проверяет, допустима ли маркировка на коробках с повторным использованием.' },
    { daysAgo: 5, author: 'buyer', category: 'supplies', type: 'suggestion', status: 'implemented',
      description: 'Переставить редко используемые держатели на нижнюю полку и освободить полку на уровне глаз для ежедневных расходников.',
      question: 'Какие расходники нужно поставить на освободившуюся полку в первую очередь?',
      reply: 'Пакеты для документов, бумажные пломбы и короткие стяжки.',
      decision: 'Полки переставили по предложенной схеме. Список трёх ежедневных позиций добавили к этикетке полки.',
      followup: 'Через две недели сверим остатки и проверим удобство нового расположения.' },
    { daysAgo: 4, author: 'office', category: 'tools', type: 'problem', status: 'in_progress',
      description: 'В расписании инструктажей отменённая встреча остаётся видна без отметки об отмене.',
      solution: 'Добавить текст «Отменено» рядом со временем и продублировать его в напоминании.' },
    { daysAgo: 3, author: 'service', category: 'service', type: 'suggestion', status: 'new',
      description: 'В памятке по обмену не хватает примера с покупкой из нескольких позиций. Такой вопрос регулярно приходит в чат.',
      solution: 'Добавить один пример, где клиент меняет только часть покупки.' },
    { daysAgo: 3, author: 'studio', category: 'onboarding', type: 'praise', status: 'new',
      description: 'Пробная прогулка по мастерской перед первой сменой помогла разобраться, где искать защитные очки и журнал инструктажей.' },
    { daysAgo: 2, author: 'office', category: 'no_rule_demo', type: 'suggestion', status: 'new',
      description: 'Организовать обмен ненужными книгами рядом с комнатой отдыха. Для начала хватит одной полки и простой таблички.',
      solution: 'Проверить интерес в течение месяца, затем решить, оставлять ли полку.' },
    { daysAgo: 1, author: 'buyer', category: 'tools', type: 'problem', status: 'awaiting_clarification',
      description: 'При печати карточек для инвентаризации последняя строка обрезается на некоторых принтерах.',
      question: 'Обрезается строка с примечанием или весь нижний край? Укажите формат бумаги и настройки масштаба.' },
    { daysAgo: 0, author: 'studio', category: 'handover', type: 'suggestion', status: 'new',
      description: 'Добавить в журнал смены поле «Что понадобится утром». Сейчас список инструмента часто теряется среди общих заметок.',
      solution: 'Проверить отдельное поле в течение двух недель на одной линии.' },
  ];

  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const sampleTime = Date.now();
  const iso = timestamp => new Date(timestamp).toISOString();
  const completion = new Set(['implemented', 'rejected', 'closed']);
  const statusText = {
    new: 'Новое', in_review: 'На рассмотрении', in_progress: 'В работе',
    awaiting_clarification: 'Ожидает уточнения', implemented: 'Реализовано',
    rejected: 'Отклонено', closed: 'Закрыто',
  };

  function createRequest(example, index) {
    const id = `complaint-${index + 1}`;
    const author = authors[example.author];
    const category = categories.find(entry => entry.id === example.category);
    const assignee = assignees.find(person => person.id === category.assigneeId) ?? null;
    const created = sampleTime - example.daysAgo * day - (example.daysAgo ? (index % 4) * hour : 0);
    const due = created + category.dueInDays * day;
    const status = example.status;
    const finished = completion.has(status);
    const history = [];
    const comments = [];

    function addEvent(kind, actor, time, message, fromStatus = null, toStatus = null) {
      history.push({
        id: `${id}-event-${history.length + 1}`, kind, actor, createdAt: iso(time),
        fromStatus, toStatus, text: message,
      });
    }

    function addComment(kind, actor, time, message) {
      comments.push({ id: `${id}-comment-${comments.length + 1}`, kind, author: actor, text: message, createdAt: iso(time) });
    }

    addEvent('created', author, created, 'Обращение зарегистрировано.', null, 'new');
    if (assignee) addEvent('assigned', system, created, `Назначен ответственный: ${assignee.name}.`);

    let lastUpdate = created;
    let firstResponseAt = null;
    if (status !== 'new' && assignee) {
      lastUpdate = created + (2 + (index * 3) % 7) * hour;
      firstResponseAt = iso(lastUpdate);
      addEvent('status_changed', assignee, lastUpdate, 'Рассмотрение началось.', 'new', 'in_review');
    }

    let previousStatus = status === 'new' ? 'new' : 'in_review';
    if (example.question) {
      lastUpdate += 2 * hour;
      addEvent('status_changed', assignee, lastUpdate, 'Автору отправлен вопрос.', 'in_review', 'awaiting_clarification');
      addComment('clarification_request', assignee, lastUpdate, example.question);
      previousStatus = 'awaiting_clarification';
    }
    if (example.reply) {
      lastUpdate += 7 * hour;
      addComment('clarification_response', author, lastUpdate, example.reply);
      addEvent('status_changed', author, lastUpdate, 'Ответ автора получен.', 'awaiting_clarification', 'in_review');
      previousStatus = 'in_review';
    }
    if (example.discussion) {
      lastUpdate += 3 * hour;
      addComment('comment', assignee, lastUpdate, example.discussion);
    }
    if (status === 'in_progress') {
      lastUpdate += 4 * hour;
      addEvent('status_changed', assignee, lastUpdate, 'Работа по обращению началась.', previousStatus, status);
    }

    let decision = null;
    if (finished) {
      lastUpdate += (24 + index % 4 * 12) * hour;
      decision = {
        outcome: status, explanation: example.decision, actions: example.followup ?? null,
        author: assignee, createdAt: iso(lastUpdate),
      };
      addEvent('decision', assignee, lastUpdate, `Зафиксирован итог: ${statusText[status]}.`, previousStatus, status);
    }

    const nextAction = decision?.explanation ?? {
      new: assignee ? 'Ответственный рассмотрит обращение.' : 'Руководитель назначит ответственного из общей очереди.',
      in_review: 'Ответственный оценивает ситуацию и определяет дальнейшие действия.',
      in_progress: 'Ответственный выполняет работу и зафиксирует итог в карточке.',
      awaiting_clarification: 'Автору нужно ответить на вопрос в карточке обращения.',
    }[status];

    return {
      id, number: `A-${String(index + 1).padStart(3, '0')}`,
      type: example.type, categoryId: category.id, departmentId: author.departmentId, author,
      description: example.description, proposedSolution: example.solution ?? null, priority: 'normal', attachments: [],
      status, assignee, routing: assignee ? { queue: 'assigned', reason: 'category_rule' } : { queue: 'unassigned', reason: 'no_rule' },
      createdAt: iso(created), updatedAt: iso(lastUpdate), dueAt: iso(due), firstResponseAt,
      closedAt: decision?.createdAt ?? null, overdue: !finished && due < sampleTime,
      comments, history, decision, nextAction, canUndo: false, undoExpiresAt: null,
    };
  }

  return { reference: { departments, categories, assignees }, items: examples.map(createRequest).reverse() };
})();
