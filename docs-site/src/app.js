/* icomers docs viewer — works from file:// and from the docs server */
(() => {
  'use strict';

  const I18N = {
    ka: {
      groups: ['შესავალი', 'არქიტექტურა', 'Backend', 'Frontend', 'DevOps და უსაფრთხოება', 'გეგმა'],
      brandSub: 'ტექნიკური დოკუმენტაცია', status: 'დასამტკიცებელი', yourName: 'თქვენი სახელი', namePh: 'მაგ. გიორგი (Billing)',
      navFilter: 'ძებნა სარჩევში…', download: '⬇ პასუხების და დამატებების ჩამოტვირთვა',
      introTitle: 'icomers — ონლაინ მაღაზია',
      introText: 'კომპანიის საკუთარი პროდუქციის (EV დამტენების ნაწილები და აქსესუარები) ონლაინ მაღაზიის არქიტექტურა და ტექნიკური დოკუმენტაცია: backend, frontend, admin panel, API, ინტეგრაციები და deploy.',
      notFound: 'ვერ მოიძებნა', delAsk: 'წავშალო?', delYes: 'დიახ, წაშალე', no: 'არა', needName: 'ჯერ ზემოთ ჩაწერეთ თქვენი სახელი',
      deleted: 'წაიშალა', deleteFailed: 'ვერ წაიშალა: ', edited: 'შეცვლილია', cancel: 'გაუქმება', save: 'შენახვა', saved: 'შენახულია ✓',
      saveFailed: 'ვერ შეინახა: ', answered: 'პასუხგაცემული', openQ: 'ღია კითხვა', to: 'ადრესატი', edit: 'რედაქტირება', del: 'წაშლა',
      addComment: 'დაამატეთ კომენტარი ან დაზუსტება…', writeAnswer: 'დაწერეთ პასუხი…', sendBy: 'პასუხს გააგზავნის', nameFirst: '— ჩაწერეთ სახელი ზემოთ',
      send: 'გაგზავნა', answerSaved: 'პასუხი შენახულია ✓', onlyOpen: 'მხოლოდ ღია კითხვები', thStatus: 'სტატუსი', thQuestion: 'კითხვა',
      thTo: 'ადრესატი', thDoc: 'თავი', chipAnswer: 'პასუხი', chipOpen: 'ღია', allAnswered: 'ყველა კითხვას პასუხი აქვს 🎉',
      added: 'დამატებული', addBtn: '+ დამატება', newItem: 'ახალი პუნქტი', addPh: 'რა აკლია, რა უნდა შეიცვალოს, ან რა გინდათ, რომ დაემატოს…',
      author: 'ავტორი', add: 'დამატება', addedOk: 'დამატებულია ✓', exportTitle: 'icomers — კითხვები და პასუხები', downloadedAt: 'ჩამოტვირთულია',
      addedItems: 'დამატებული პუნქტები', answersCount: 'პასუხი', openCount: 'ღია კითხვები', addsCount: 'დამატებული პუნქტები',
      modeLocal: 'პასუხები ინახება ამ ბრაუზერში', modeServer: 'პასუხები ინახება სერვერზე',
    },
    en: {
      groups: ['Introduction', 'Architecture', 'Backend', 'Frontend', 'DevOps and security', 'Plan'],
      brandSub: 'Technical documentation', status: 'Pending approval', yourName: 'Your name', namePh: 'e.g. Giorgi (Billing)',
      navFilter: 'Search contents…', download: '⬇ Download answers and additions',
      introTitle: 'icomers — online shop',
      introText: "Architecture and technical documentation of the online shop for the company's own products (EV charger parts and accessories): backend, frontend, admin panel, API, integrations and deployment.",
      notFound: 'Not found', delAsk: 'Delete?', delYes: 'Yes, delete', no: 'No', needName: 'Please enter your name at the top first',
      deleted: 'Deleted', deleteFailed: 'Could not delete: ', edited: 'edited', cancel: 'Cancel', save: 'Save', saved: 'Saved ✓',
      saveFailed: 'Could not save: ', answered: 'Answered', openQ: 'Open question', to: 'For', edit: 'Edit', del: 'Delete',
      addComment: 'Add a comment or clarification…', writeAnswer: 'Write your answer…', sendBy: 'Answering as', nameFirst: '— enter your name at the top',
      send: 'Send', answerSaved: 'Answer saved ✓', onlyOpen: 'Open questions only', thStatus: 'Status', thQuestion: 'Question',
      thTo: 'For', thDoc: 'Section', chipAnswer: 'Answered', chipOpen: 'Open', allAnswered: 'All questions are answered 🎉',
      added: 'Added', addBtn: '+ Add', newItem: 'New item', addPh: 'What is missing, what should change, or what should be added…',
      author: 'Author', add: 'Add', addedOk: 'Added ✓', exportTitle: 'icomers — questions and answers', downloadedAt: 'Downloaded',
      addedItems: 'Added items', answersCount: 'answered', openCount: 'Open questions', addsCount: 'Added items',
      modeLocal: 'Answers are stored in this browser', modeServer: 'Answers are stored on the server',
    },
  };
  const LANG = (() => {
    let l = new URLSearchParams(location.search).get('lang');
    if (!l) { try { l = localStorage.getItem('lang'); } catch { /* ignore */ } }
    return l === 'en' ? 'en' : 'ka';
  })();
  const t = (k) => I18N[LANG][k] ?? I18N.ka[k] ?? k;
  const DOC_GROUPS = [
    ['00-overview', '01-tech-stack'], ['02-architecture', '03-integrations'], ['04-data-model', '05-api', '06-order-flow'],
    ['07-storefront', '08-admin-panel'], ['09-repo-and-dev', '10-deployment', '11-security'], ['12-roadmap'],
  ];
  const GROUPS = DOC_GROUPS.map((docs, i) => ({ title: t('groups')[i], docs }));
  const CONTENT = window.ICOMERS_DOCS || { docs: { ka: {}, en: {} }, diagrams: { ka: {}, en: {} } };
  const DOCS = Object.keys(CONTENT.docs[LANG] || {}).length ? CONTENT.docs[LANG] : CONTENT.docs.ka;
  const DIAGRAMS = { ...CONTENT.diagrams.ka, ...(LANG === 'en' ? CONTENT.diagrams.en : {}) };
  const LOCAL_KEY = 'icomers-answers';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (t) => t.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  const state = { answers: [], additions: [], questions: [], mode: 'local' }; // mode: 'server' | 'local'
  const LOCAL_ADD_KEY = 'icomers-additions';

  // ---------- answers storage ----------
  const store = {
    async detect() {
      if (!/^https?:$/.test(location.protocol)) return 'local';
      try { const r = await fetch('/api/answers', { cache: 'no-store' }); if (r.ok) return 'server'; } catch { /* ignore */ }
      return 'local';
    },
    async load() {
      if (state.mode === 'server') {
        const r = await fetch('/api/answers', { cache: 'no-store' });
        return r.ok ? r.json() : [];
      }
      try { return JSON.parse(storage.get(LOCAL_KEY) || '[]'); } catch { return []; }
    },
    async add(questionId, author, text) {
      if (state.mode === 'server') {
        const r = await fetch('/api/answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, author, text }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
        return r.json();
      }
      const a = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), questionId, author, text, createdAt: new Date().toISOString() };
      const list = await store.load(); list.push(a); storage.set(LOCAL_KEY, JSON.stringify(list));
      return a;
    },
  };

  async function updateItem(kind, id, text, editor) {
    const url = kind === 'answers' ? '/api/answers/' : '/api/additions/';
    if (state.mode === 'server') {
      const r = await fetch(url + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, editor }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      return r.json();
    }
    const key = kind === 'answers' ? LOCAL_KEY : LOCAL_ADD_KEY;
    let list = [];
    try { list = JSON.parse(storage.get(key) || '[]'); } catch { /* ignore */ }
    const item = list.find((x) => x.id === id);
    if (!item) throw new Error(t('notFound'));
    Object.assign(item, { text, editedBy: editor, editedAt: new Date().toISOString() });
    storage.set(key, JSON.stringify(list));
    return item;
  }

  async function removeItem(kind, id, editor) {
    if (state.mode === 'server') {
      const r = await fetch((kind === 'answers' ? '/api/answers/' : '/api/additions/') + encodeURIComponent(id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editor }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
      return;
    }
    const key = kind === 'answers' ? LOCAL_KEY : LOCAL_ADD_KEY;
    let list = [];
    try { list = JSON.parse(storage.get(key) || '[]'); } catch { /* ignore */ }
    storage.set(key, JSON.stringify(list.filter((x) => x.id !== id)));
  }

  // inline "are you sure?" for deleting an addition
  function confirmDelete(card, item) {
    if ($('.del-confirm', card)) return;
    const meta = $('.addition-meta', card);
    meta.insertAdjacentHTML('beforeend', `<span class="del-confirm">${t('delAsk')} <button type="button" class="del-yes">${t('delYes')}</button> <button type="button" class="del-no">${t('no')}</button></span>`);
    $('.del-no', card).addEventListener('click', () => $('.del-confirm', card).remove());
    $('.del-yes', card).addEventListener('click', async () => {
      const editor = $('#authorInput').value.trim();
      if (!editor) { toast(t('needName')); $('#authorInput').focus(); return; }
      try {
        await removeItem('additions', item.id, editor);
        state.additions = state.additions.filter((a) => a.id !== item.id);
        renderAdditions();
        updateCounts();
        toast(t('deleted'));
      } catch (err) { toast(t('deleteFailed') + err.message); }
    });
  }

  function editedNote(a) {
    return a.editedAt ? ` · <span class="edited">${t('edited')}${a.editedBy ? ` (${esc(a.editedBy)})` : ''} ${esc(fmtDate(a.editedAt))}</span>` : '';
  }

  // inline editor for an answer / addition text block
  function startEdit(container, item, kind, after) {
    if ($('.edit-form', container)) return;
    const textEl = $('.item-text', container);
    textEl.classList.add('hidden');
    textEl.insertAdjacentHTML('afterend', `
      <form class="edit-form">
        <textarea name="text" required maxlength="5000"></textarea>
        <div class="edit-actions"><button type="button" class="ghost">${t('cancel')}</button> <button class="primary" type="submit">${t('save')}</button></div>
      </form>`);
    const form = $('.edit-form', container);
    form.text.value = item.text;
    form.text.focus();
    $('.ghost', form).addEventListener('click', () => { form.remove(); textEl.classList.remove('hidden'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editor = $('#authorInput').value.trim();
      const text = form.text.value.trim();
      if (!editor) { toast(t('needName')); $('#authorInput').focus(); return; }
      if (!text) return;
      try {
        const updated = await updateItem(kind, item.id, text, editor);
        Object.assign(item, updated);
        after();
        toast(t('saved'));
      } catch (err) { toast(t('saveFailed') + err.message); }
    });
  }

  const additionsStore = {
    async load() {
      if (state.mode === 'server') {
        const r = await fetch('/api/additions', { cache: 'no-store' });
        return r.ok ? r.json() : [];
      }
      try { return JSON.parse(storage.get(LOCAL_ADD_KEY) || '[]'); } catch { return []; }
    },
    async add(sectionId, sectionTitle, author, text) {
      if (state.mode === 'server') {
        const r = await fetch('/api/additions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sectionId, sectionTitle, author, text }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
        return r.json();
      }
      const a = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), sectionId, sectionTitle, author, text, createdAt: new Date().toISOString() };
      const list = await additionsStore.load(); list.push(a); storage.set(LOCAL_ADD_KEY, JSON.stringify(list));
      return a;
    },
  };

  // ---------- markdown ----------
  function preprocess(md) {
    md = md.replace(/^:::question id="([^"]+)" to="([^"]*)"\n([\s\S]*?)\n:::$/gm, (_, id, to, text) =>
      `<div class="q" data-qid="${esc(id)}" data-to="${esc(to)}" data-md="${encodeURIComponent(text)}"></div>\n`);
    md = md.replace(/^:::questions-index\n:::$/gm, '<div class="q-index-host"></div>\n');
    md = md.replace(/<\/summary>\n(?!\n)/g, '</summary>\n\n');
    return md;
  }

  function kaSectionIds(docId) {
    const md = CONTENT.docs.ka[docId];
    if (!md) return [];
    const tmp = document.createElement('div');
    tmp.innerHTML = marked.parse(preprocess(md), { gfm: true });
    return $$('h2', tmp).map((h) => `${docId}--${slug(h.textContent)}`);
  }

  function applyStaticI18n() {
    document.documentElement.lang = LANG;
    document.title = LANG === 'en' ? 'icomers — documentation' : 'icomers — დოკუმენტაცია';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $('#authorInput').placeholder = t('namePh');
    $('#navFilter').placeholder = t('navFilter');
    $$('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === LANG);
      b.addEventListener('click', () => {
        if (b.dataset.lang === LANG) return;
        try { localStorage.setItem('lang', b.dataset.lang); } catch { /* ignore */ }
        const doc = $('.nav-doc.active')?.dataset.doc;
        const url = new URL(location.href);
        url.searchParams.set('lang', b.dataset.lang);
        url.hash = doc ? '#' + doc : '';
        location.href = url.toString();
      });
    });
  }

  function renderDocs() {
    const order = GROUPS.flatMap((g) => g.docs.map((d) => ({ id: d, group: g.title })));
    const host = $('#docs');
    host.innerHTML = '';
    order.forEach((d) => {
      const text = DOCS[d.id];
      if (!text) return;
      const sec = document.createElement('section');
      sec.className = 'doc';
      sec.id = d.id;
      sec.innerHTML = `<div class="doc-group">${esc(d.group)}</div>` + marked.parse(preprocess(text), { gfm: true });
      host.appendChild(sec);

      const h1 = $('h1', sec);
      if (h1) { h1.textContent = h1.textContent.replace(/^\d\d\s+—\s+/, ''); d.title = h1.textContent; }
      $$('h2, h3, h4', sec).forEach((h) => {
        h.id = `${d.id}--${slug(h.textContent)}`;
        h.insertAdjacentHTML('beforeend', `<a class="anchor" href="#${h.id}" aria-hidden="true">#</a>`);
      });
      $$('table', sec).forEach((t) => { const w = document.createElement('div'); w.className = 'table-wrap'; t.replaceWith(w); w.appendChild(t); });
      $$('a[href]', sec).forEach((a) => {
        const m = a.getAttribute('href').match(/^(\d\d-[\w-]+)\.md(?:#(.*))?$/);
        if (m) a.setAttribute('href', m[2] ? `#${m[1]}--${decodeURIComponent(m[2])}` : `#${m[1]}`);
      });
      $$('img[src^="diagrams/"]', sec).forEach((img) => {
        const name = img.getAttribute('src').replace(/^diagrams\/|\.svg$/g, '');
        const fig = document.createElement('figure');
        fig.className = 'diagram';
        fig.innerHTML = (DIAGRAMS[name] || '') + (img.alt ? `<figcaption>${esc(img.alt)}</figcaption>` : '');
        (img.closest('p') || img).replaceWith(fig);
      });
      // "+ დამატება" block at the end of every h2 section
      // additions are keyed by the Georgian section id, so both languages share them
      const kaIds = LANG === 'ka' ? null : kaSectionIds(d.id);
      $$('h2', sec).forEach((h, i) => {
        let end = h.nextElementSibling;
        while (end && end.tagName !== 'H2') end = end.nextElementSibling;
        const box = document.createElement('div');
        box.className = 'add-block';
        box.dataset.section = (kaIds && kaIds[i]) || h.id;
        box.dataset.title = `${d.title} → ${h.textContent.replace(/#$/, '')}`;
        sec.insertBefore(box, end);
      });
      $$('.q', sec).forEach((el) => state.questions.push({ id: el.dataset.qid, to: el.dataset.to, doc: d.id, docTitle: d.title, el }));
    });
    return order;
  }

  // ---------- questions ----------
  const answersFor = (id) => state.answers.filter((a) => a.questionId === id);
  const qText = (q) => decodeURIComponent(q.el.dataset.md);
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString('ka-GE', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; }
  }

  function renderQuestion(q) {
    const el = q.el;
    const ans = answersFor(q.id);
    const draft = $('.q-form textarea', el)?.value || '';
    el.classList.toggle('answered', ans.length > 0);
    el.id = `q-${q.id}`;
    el.innerHTML = `
      <div class="q-head">
        <span class="q-chip ${ans.length ? 'done' : 'open'}">${ans.length ? t('answered') : t('openQ')}</span>
        <a class="q-id" href="#q-${esc(q.id)}">${esc(q.id)}</a>
        <span class="q-to">${t('to')}: <b>${esc(q.to)}</b></span>
      </div>
      <div class="q-text">${marked.parse(qText(q))}</div>
      <div class="q-answers">${ans.map((a) => `
        <div class="q-answer" data-id="${esc(a.id)}">
          <div class="q-answer-meta"><b>${esc(a.author)}</b> · ${esc(fmtDate(a.createdAt))}${editedNote(a)} <button type="button" class="edit-btn">${t('edit')}</button></div>
          <div class="q-answer-text item-text">${esc(a.text)}</div>
        </div>`).join('')}</div>
      <form class="q-form">
        <textarea name="text" placeholder="${ans.length ? t('addComment') : t('writeAnswer')}" maxlength="5000" required></textarea>
        <div class="q-form-row">
          <span class="q-form-hint">${t('sendBy')}: <b class="q-author">${esc(storage.get('author') || t('nameFirst'))}</b></span>
          <button class="primary" type="submit">${t('send')}</button>
        </div>
      </form>`;
    $('.q-form textarea', el).value = draft;
    $('form.q-form', el).addEventListener('submit', (e) => submitAnswer(e, q));
    $$('.q-answer', el).forEach((box) => {
      const item = state.answers.find((a) => a.id === box.dataset.id);
      $('.edit-btn', box).addEventListener('click', () => startEdit(box, item, 'answers', () => { renderQuestion(q); }));
    });
  }

  async function submitAnswer(e, q) {
    e.preventDefault();
    const form = e.currentTarget;
    const author = $('#authorInput').value.trim();
    const text = form.text.value.trim();
    if (!author) { toast(t('needName')); $('#authorInput').focus(); return; }
    if (!text) return;
    const btn = $('button', form);
    btn.disabled = true;
    try {
      state.answers.push(await store.add(q.id, author, text));
      form.text.value = '';
      refreshAll();
      toast(t('answerSaved'));
    } catch (err) {
      toast(t('saveFailed') + err.message);
      btn.disabled = false;
    }
  }

  function renderIndex() {
    const host = $('.q-index-host');
    if (!host) return;
    const onlyOpen = storage.get('onlyOpen') === '1';
    const rows = state.questions.filter((q) => !onlyOpen || !answersFor(q.id).length);
    host.innerHTML = `
      <div class="q-index-tools"><label><input type="checkbox" id="onlyOpen" ${onlyOpen ? 'checked' : ''}> ${t('onlyOpen')}</label></div>
      <div class="table-wrap"><table class="q-index">
        <thead><tr><th>${t('thStatus')}</th><th>${t('thQuestion')}</th><th>${t('thTo')}</th><th>${t('thDoc')}</th></tr></thead>
        <tbody>${rows.map((q) => {
          const n = answersFor(q.id).length;
          const text = qText(q).replace(/[*`]/g, '');
          return `<tr>
            <td><span class="q-chip ${n ? 'done' : 'open'}">${n ? t('chipAnswer') : t('chipOpen')}</span></td>
            <td><a href="#q-${esc(q.id)}">${esc(text.length > 140 ? text.slice(0, 140) + '…' : text)}</a></td>
            <td>${esc(q.to)}</td>
            <td><a href="#${q.doc}">${esc(q.docTitle)}</a></td></tr>`;
        }).join('') || `<tr><td colspan="4">${t('allAnswered')}</td></tr>`}</tbody>
      </table></div>`;
    $('#onlyOpen').addEventListener('change', (e) => { storage.set('onlyOpen', e.target.checked ? '1' : '0'); renderIndex(); });
  }

  // ---------- additions (+ დამატება) ----------
  function renderAdditions() {
    $$('.add-block').forEach((box) => {
      const list = state.additions.filter((a) => a.sectionId === box.dataset.section);
      const openForm = box.querySelector('form.add-form');
      const draft = openForm ? openForm.text.value : null;
      box.innerHTML = list.map((a) => `
        <div class="addition" data-id="${esc(a.id)}">
          <div class="addition-meta"><span class="addition-tag">${t('added')}</span><b>${esc(a.author)}</b> · ${esc(fmtDate(a.createdAt))}${editedNote(a)} <button type="button" class="edit-btn">${t('edit')}</button> <button type="button" class="edit-btn del-btn">${t('del')}</button></div>
          <div class="addition-text item-text">${esc(a.text)}</div>
        </div>`).join('') + `<button type="button" class="add-btn">${t('addBtn')}</button>`;
      $$('.addition', box).forEach((card) => {
        const item = state.additions.find((a) => a.id === card.dataset.id);
        $('.edit-btn', card).addEventListener('click', () => startEdit(card, item, 'additions', renderAdditions));
        $('.del-btn', card).addEventListener('click', () => confirmDelete(card, item));
      });
      $('.add-btn', box).addEventListener('click', () => openAddForm(box));
      if (draft !== null) openAddForm(box, draft);
    });
  }

  function openAddForm(box, draft = '') {
    const btn = $('.add-btn', box);
    if (btn) btn.remove();
    if ($('form.add-form', box)) return;
    box.insertAdjacentHTML('beforeend', `
      <form class="add-form">
        <div class="add-form-title">${t('newItem')}: <b>${esc(box.dataset.title)}</b></div>
        <textarea name="text" required maxlength="5000" placeholder="${t('addPh')}"></textarea>
        <div class="q-form-row">
          <span class="q-form-hint">${t('author')}: <b class="q-author">${esc(storage.get('author') || t('nameFirst'))}</b></span>
          <span><button type="button" class="ghost">${t('cancel')}</button> <button class="primary" type="submit">${t('add')}</button></span>
        </div>
      </form>`);
    const form = $('form.add-form', box);
    form.text.value = draft;
    form.text.focus();
    $('.ghost', form).addEventListener('click', () => { form.remove(); box.insertAdjacentHTML('beforeend', `<button type="button" class="add-btn">${t('addBtn')}</button>`); $('.add-btn', box).addEventListener('click', () => openAddForm(box)); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = $('#authorInput').value.trim();
      const text = form.text.value.trim();
      if (!author) { toast(t('needName')); $('#authorInput').focus(); return; }
      if (!text) return;
      const sb = $('button[type=submit]', form); sb.disabled = true;
      try {
        state.additions.push(await additionsStore.add(box.dataset.section, box.dataset.title, author, text));
        form.remove();
        renderAdditions();
        updateCounts();
        toast(t('addedOk'));
      } catch (err) { toast(t('saveFailed') + err.message); sb.disabled = false; }
    });
  }

  // ---------- download answers (.md) ----------
  function exportMarkdown() {
    const lines = [`# ${t('exportTitle')}`, '', `${t('downloadedAt')}: ${new Date().toISOString()}`, ''];
    for (const q of state.questions) {
      const ans = answersFor(q.id);
      lines.push(`## [${ans.length ? t('answered') : t('chipOpen')}] ${q.id} — ${q.to} (${q.docTitle})`, '', qText(q), '');
      for (const a of ans) lines.push(`> **${a.author}** (${a.createdAt}${a.editedAt ? `, ${t('edited')} ${a.editedBy || ''} ${a.editedAt}` : ''}):`, ...a.text.split('\n').map((l) => `> ${l}`), '');
    }
    if (state.additions.length) {
      lines.push('---', '', `# ${t('addedItems')}`, '');
      for (const a of state.additions) lines.push(`## ${a.sectionTitle}`, '', `> **${a.author}** (${a.createdAt}${a.editedAt ? `, ${t('edited')} ${a.editedBy || ''} ${a.editedAt}` : ''}):`, ...a.text.split('\n').map((l) => `> ${l}`), '');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'icomers-feedback.md' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- sidebar ----------
  function renderNav(order) {
    const nav = $('#nav');
    nav.innerHTML = GROUPS.map((g) => `
      <div class="nav-group">${esc(g.title)}</div>
      ${g.docs.map((id) => {
        const d = order.find((o) => o.id === id);
        const sec = document.getElementById(id);
        if (!sec) return '';
        const subs = $$('h2', sec).map((h) => `<li><a href="#${h.id}" data-target="${h.id}">${esc(h.textContent.replace(/#$/, ''))}</a></li>`).join('');
        return `<div class="nav-doc" data-doc="${id}">
          <a href="#${id}"><span>${esc(d.title)}</span><span class="nav-badges"><span class="nav-adds hidden" data-adds="${id}"></span><span class="nav-count" data-count="${id}"></span></span></a>
          <ul class="nav-sub">${subs}</ul></div>`;
      }).join('')}`).join('');
    nav.addEventListener('click', (e) => { if (e.target.closest('a') && innerWidth <= 820) $('#sidebar').classList.remove('open'); });
  }

  function updateCounts() {
    const total = state.questions.length;
    const done = state.questions.filter((q) => answersFor(q.id).length).length;
    $('#progressText').textContent = `${done} / ${total} ${t('answersCount')}`;
    $('#progressFill').style.width = total ? `${(done / total) * 100}%` : '0';
    $$('[data-count]').forEach((el) => {
      const qs = state.questions.filter((q) => q.doc === el.dataset.count);
      const open = qs.filter((q) => !answersFor(q.id).length).length;
      el.textContent = qs.length ? (open || '✓') : '';
      el.classList.toggle('done', qs.length > 0 && open === 0);
      el.title = qs.length ? `${t('openCount')}: ${open} / ${qs.length}` : '';
      el.classList.toggle('hidden', !qs.length);
    });
    $$('[data-adds]').forEach((el) => {
      const n = state.additions.filter((a) => a.sectionId.startsWith(el.dataset.adds + '--')).length;
      el.textContent = n ? `+${n}` : '';
      el.title = n ? `${t('addsCount')}: ${n}` : '';
      el.classList.toggle('hidden', !n);
    });
  }

  function setupFilter() {
    $('#navFilter').addEventListener('input', (e) => {
      const v = e.target.value.trim().toLowerCase();
      $('#sidebar').classList.toggle('filtering', !!v);
      $$('.nav-doc').forEach((doc) => {
        let any = false;
        $$('.nav-sub li', doc).forEach((li) => { const hit = !v || li.textContent.toLowerCase().includes(v); li.classList.toggle('hidden', !hit); any ||= hit; });
        const titleHit = !v || $('a', doc).textContent.toLowerCase().includes(v);
        if (titleHit && v) $$('.nav-sub li', doc).forEach((li) => li.classList.remove('hidden'));
        doc.classList.toggle('hidden', !(titleHit || any));
      });
      $$('.nav-group').forEach((g) => {
        let n = g.nextElementSibling, vis = false;
        while (n && !n.classList.contains('nav-group')) { if (!n.classList.contains('hidden')) vis = true; n = n.nextElementSibling; }
        g.classList.toggle('hidden', !vis);
      });
    });
  }

  function setupScrollSpy() {
    const heads = $$('.doc, .doc h2');
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      let doc = null, h2 = null;
      for (const el of heads) {
        if (el.getBoundingClientRect().top - 80 > 0) break;
        if (el.classList.contains('doc')) { doc = el; h2 = null; } else h2 = el;
      }
      $$('.nav-doc').forEach((n) => n.classList.toggle('active', !!doc && n.dataset.doc === doc.id));
      $$('.nav-sub a').forEach((a) => a.classList.toggle('active', !!h2 && a.dataset.target === h2.id));
      const act = $('.nav-sub a.active') || $('.nav-doc.active > a');
      if (act && !$('#sidebar').classList.contains('filtering')) {
        const sb = $('#sidebar'), r = act.getBoundingClientRect(), sr = sb.getBoundingClientRect();
        if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) sb.scrollTop += r.top - sr.top - sr.height / 3;
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function refreshAll() {
    state.questions.forEach((q) => {
      const n = answersFor(q.id).length;
      if (q.rendered !== n) { renderQuestion(q); q.rendered = n; }
    });
    renderIndex();
    updateCounts();
  }

  async function init() {
    applyStaticI18n();
    const author = $('#authorInput');
    author.value = storage.get('author') || '';
    author.addEventListener('input', () => {
      storage.set('author', author.value.trim());
      $$('.q-author').forEach((b) => (b.textContent = author.value.trim() || t('nameFirst')));
    });
    $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#downloadBtn').addEventListener('click', exportMarkdown);

    const order = renderDocs();
    renderNav(order);
    setupFilter();

    state.mode = await store.detect();
    state.answers = await store.load().catch(() => []);
    state.additions = await additionsStore.load().catch(() => []);
    renderAdditions();
    $('#modeNote').textContent = state.mode === 'local' ? t('modeLocal') : t('modeServer');
    refreshAll();
    setupScrollSpy();

    if (location.hash) {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) setTimeout(() => t.scrollIntoView(), 50);
    }
    if (state.mode === 'server') {
      setInterval(async () => {
        try {
          const list = await store.load();
          if (JSON.stringify(list) !== JSON.stringify(state.answers)) { state.answers = list; state.questions.forEach((q) => { q.rendered = -1; }); refreshAll(); }
          const adds = await additionsStore.load();
          if (JSON.stringify(adds) !== JSON.stringify(state.additions)) { state.additions = adds; renderAdditions(); updateCounts(); }
        } catch { /* ignore */ }
      }, 20000);
    }
  }

  init();
})();
