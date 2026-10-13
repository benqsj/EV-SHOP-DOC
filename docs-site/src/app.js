/* icomers docs viewer — works from file:// and from the docs server */
(() => {
  'use strict';

  const GROUPS = [
    { title: 'შესავალი', docs: ['00-overview', '01-tech-stack'] },
    { title: 'არქიტექტურა', docs: ['02-architecture', '03-integrations'] },
    { title: 'Backend', docs: ['04-data-model', '05-api', '06-order-flow'] },
    { title: 'Frontend', docs: ['07-storefront', '08-admin-panel'] },
    { title: 'DevOps და უსაფრთხოება', docs: ['09-repo-and-dev', '10-deployment', '11-security'] },
    { title: 'გეგმა', docs: ['12-roadmap'] },
  ];
  const CONTENT = window.ICOMERS_DOCS || { docs: {}, diagrams: {} };
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
    if (!item) throw new Error('ვერ მოიძებნა');
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
    meta.insertAdjacentHTML('beforeend', `<span class="del-confirm">წავშალო? <button type="button" class="del-yes">დიახ, წაშალე</button> <button type="button" class="del-no">არა</button></span>`);
    $('.del-no', card).addEventListener('click', () => $('.del-confirm', card).remove());
    $('.del-yes', card).addEventListener('click', async () => {
      const editor = $('#authorInput').value.trim();
      if (!editor) { toast('ჯერ ზემოთ ჩაწერეთ თქვენი სახელი'); $('#authorInput').focus(); return; }
      try {
        await removeItem('additions', item.id, editor);
        state.additions = state.additions.filter((a) => a.id !== item.id);
        renderAdditions();
        updateCounts();
        toast('წაიშალა');
      } catch (err) { toast('ვერ წაიშალა: ' + err.message); }
    });
  }

  function editedNote(a) {
    return a.editedAt ? ` · <span class="edited">შეცვლილია${a.editedBy ? ` (${esc(a.editedBy)})` : ''} ${esc(fmtDate(a.editedAt))}</span>` : '';
  }

  // inline editor for an answer / addition text block
  function startEdit(container, item, kind, after) {
    if ($('.edit-form', container)) return;
    const textEl = $('.item-text', container);
    textEl.classList.add('hidden');
    textEl.insertAdjacentHTML('afterend', `
      <form class="edit-form">
        <textarea name="text" required maxlength="5000"></textarea>
        <div class="edit-actions"><button type="button" class="ghost">გაუქმება</button> <button class="primary" type="submit">შენახვა</button></div>
      </form>`);
    const form = $('.edit-form', container);
    form.text.value = item.text;
    form.text.focus();
    $('.ghost', form).addEventListener('click', () => { form.remove(); textEl.classList.remove('hidden'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editor = $('#authorInput').value.trim();
      const text = form.text.value.trim();
      if (!editor) { toast('ჯერ ზემოთ ჩაწერეთ თქვენი სახელი'); $('#authorInput').focus(); return; }
      if (!text) return;
      try {
        const updated = await updateItem(kind, item.id, text, editor);
        Object.assign(item, updated);
        after();
        toast('შენახულია ✓');
      } catch (err) { toast('ვერ შეინახა: ' + err.message); }
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

  function renderDocs() {
    const order = GROUPS.flatMap((g) => g.docs.map((d) => ({ id: d, group: g.title })));
    const host = $('#docs');
    host.innerHTML = '';
    order.forEach((d) => {
      const text = CONTENT.docs[d.id];
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
        fig.innerHTML = (CONTENT.diagrams[name] || '') + (img.alt ? `<figcaption>${esc(img.alt)}</figcaption>` : '');
        (img.closest('p') || img).replaceWith(fig);
      });
      // "+ დამატება" block at the end of every h2 section
      $$('h2', sec).forEach((h) => {
        let end = h.nextElementSibling;
        while (end && end.tagName !== 'H2') end = end.nextElementSibling;
        const box = document.createElement('div');
        box.className = 'add-block';
        box.dataset.section = h.id;
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
        <span class="q-chip ${ans.length ? 'done' : 'open'}">${ans.length ? 'პასუხგაცემული' : 'ღია კითხვა'}</span>
        <a class="q-id" href="#q-${esc(q.id)}">${esc(q.id)}</a>
        <span class="q-to">ადრესატი: <b>${esc(q.to)}</b></span>
      </div>
      <div class="q-text">${marked.parse(qText(q))}</div>
      <div class="q-answers">${ans.map((a) => `
        <div class="q-answer" data-id="${esc(a.id)}">
          <div class="q-answer-meta"><b>${esc(a.author)}</b> · ${esc(fmtDate(a.createdAt))}${editedNote(a)} <button type="button" class="edit-btn">რედაქტირება</button></div>
          <div class="q-answer-text item-text">${esc(a.text)}</div>
        </div>`).join('')}</div>
      <form class="q-form">
        <textarea name="text" placeholder="${ans.length ? 'დაამატეთ კომენტარი ან დაზუსტება…' : 'დაწერეთ პასუხი…'}" maxlength="5000" required></textarea>
        <div class="q-form-row">
          <span class="q-form-hint">პასუხს გააგზავნის: <b class="q-author">${esc(storage.get('author') || '— ჩაწერეთ სახელი ზემოთ')}</b></span>
          <button class="primary" type="submit">გაგზავნა</button>
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
    if (!author) { toast('ჯერ ზემოთ ჩაწერეთ თქვენი სახელი'); $('#authorInput').focus(); return; }
    if (!text) return;
    const btn = $('button', form);
    btn.disabled = true;
    try {
      state.answers.push(await store.add(q.id, author, text));
      form.text.value = '';
      refreshAll();
      toast('პასუხი შენახულია ✓');
    } catch (err) {
      toast('ვერ შეინახა: ' + err.message);
      btn.disabled = false;
    }
  }

  function renderIndex() {
    const host = $('.q-index-host');
    if (!host) return;
    const onlyOpen = storage.get('onlyOpen') === '1';
    const rows = state.questions.filter((q) => !onlyOpen || !answersFor(q.id).length);
    host.innerHTML = `
      <div class="q-index-tools"><label><input type="checkbox" id="onlyOpen" ${onlyOpen ? 'checked' : ''}> მხოლოდ ღია კითხვები</label></div>
      <div class="table-wrap"><table class="q-index">
        <thead><tr><th>სტატუსი</th><th>კითხვა</th><th>ადრესატი</th><th>თავი</th></tr></thead>
        <tbody>${rows.map((q) => {
          const n = answersFor(q.id).length;
          const text = qText(q).replace(/[*`]/g, '');
          return `<tr>
            <td><span class="q-chip ${n ? 'done' : 'open'}">${n ? 'პასუხი' : 'ღია'}</span></td>
            <td><a href="#q-${esc(q.id)}">${esc(text.length > 140 ? text.slice(0, 140) + '…' : text)}</a></td>
            <td>${esc(q.to)}</td>
            <td><a href="#${q.doc}">${esc(q.docTitle)}</a></td></tr>`;
        }).join('') || '<tr><td colspan="4">ყველა კითხვას პასუხი აქვს 🎉</td></tr>'}</tbody>
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
          <div class="addition-meta"><span class="addition-tag">დამატებული</span><b>${esc(a.author)}</b> · ${esc(fmtDate(a.createdAt))}${editedNote(a)} <button type="button" class="edit-btn">რედაქტირება</button> <button type="button" class="edit-btn del-btn">წაშლა</button></div>
          <div class="addition-text item-text">${esc(a.text)}</div>
        </div>`).join('') + `<button type="button" class="add-btn">+ დამატება</button>`;
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
        <div class="add-form-title">ახალი პუნქტი: <b>${esc(box.dataset.title)}</b></div>
        <textarea name="text" required maxlength="5000" placeholder="რა აკლია, რა უნდა შეიცვალოს, ან რა გინდათ, რომ დაემატოს…"></textarea>
        <div class="q-form-row">
          <span class="q-form-hint">ავტორი: <b class="q-author">${esc(storage.get('author') || '— ჩაწერეთ სახელი ზემოთ')}</b></span>
          <span><button type="button" class="ghost">გაუქმება</button> <button class="primary" type="submit">დამატება</button></span>
        </div>
      </form>`);
    const form = $('form.add-form', box);
    form.text.value = draft;
    form.text.focus();
    $('.ghost', form).addEventListener('click', () => { form.remove(); box.insertAdjacentHTML('beforeend', '<button type="button" class="add-btn">+ დამატება</button>'); $('.add-btn', box).addEventListener('click', () => openAddForm(box)); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = $('#authorInput').value.trim();
      const text = form.text.value.trim();
      if (!author) { toast('ჯერ ზემოთ ჩაწერეთ თქვენი სახელი'); $('#authorInput').focus(); return; }
      if (!text) return;
      const sb = $('button[type=submit]', form); sb.disabled = true;
      try {
        state.additions.push(await additionsStore.add(box.dataset.section, box.dataset.title, author, text));
        form.remove();
        renderAdditions();
        updateCounts();
        toast('დამატებულია ✓');
      } catch (err) { toast('ვერ შეინახა: ' + err.message); sb.disabled = false; }
    });
  }

  // ---------- download answers (.md) ----------
  function exportMarkdown() {
    const lines = ['# icomers — კითხვები და პასუხები', '', `ჩამოტვირთულია: ${new Date().toISOString()}`, ''];
    for (const q of state.questions) {
      const ans = answersFor(q.id);
      lines.push(`## [${ans.length ? 'პასუხგაცემული' : 'ღია'}] ${q.id} — ${q.to} (${q.docTitle})`, '', qText(q), '');
      for (const a of ans) lines.push(`> **${a.author}** (${a.createdAt}${a.editedAt ? `, შეცვლილია ${a.editedBy || ''} ${a.editedAt}` : ''}):`, ...a.text.split('\n').map((l) => `> ${l}`), '');
    }
    if (state.additions.length) {
      lines.push('---', '', '# დამატებული პუნქტები', '');
      for (const a of state.additions) lines.push(`## ${a.sectionTitle}`, '', `> **${a.author}** (${a.createdAt}${a.editedAt ? `, შეცვლილია ${a.editedBy || ''} ${a.editedAt}` : ''}):`, ...a.text.split('\n').map((l) => `> ${l}`), '');
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
    $('#progressText').textContent = `${done} / ${total} პასუხი`;
    $('#progressFill').style.width = total ? `${(done / total) * 100}%` : '0';
    $$('[data-count]').forEach((el) => {
      const qs = state.questions.filter((q) => q.doc === el.dataset.count);
      const open = qs.filter((q) => !answersFor(q.id).length).length;
      el.textContent = qs.length ? (open || '✓') : '';
      el.classList.toggle('done', qs.length > 0 && open === 0);
      el.title = qs.length ? `ღია კითხვები: ${open} / ${qs.length}` : '';
      el.classList.toggle('hidden', !qs.length);
    });
    $$('[data-adds]').forEach((el) => {
      const n = state.additions.filter((a) => a.sectionId.startsWith(el.dataset.adds + '--')).length;
      el.textContent = n ? `+${n}` : '';
      el.title = n ? `დამატებული პუნქტები: ${n}` : '';
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
    const author = $('#authorInput');
    author.value = storage.get('author') || '';
    author.addEventListener('input', () => {
      storage.set('author', author.value.trim());
      $$('.q-author').forEach((b) => (b.textContent = author.value.trim() || '— ჩაწერეთ სახელი ზემოთ'));
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
    $('#modeNote').textContent = state.mode === 'local' ? 'პასუხები ინახება ამ ბრაუზერში' : 'პასუხები ინახება სერვერზე';
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
