import './style.css';
import { FONTS } from './fonts.js';
import { t, getLang, setLang, applyI18n } from './i18n.js';
import * as db from './db.js';
import { EpubReader, HL, HL_COLORS } from './epub-reader.js';
import { pdfToEpub } from './convert.js';
import { PdfReader, pdfCover } from './pdf-reader.js';
import ePub from 'epubjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- settings ---------- */
const DEFAULTS = { font: 'nastaliq', fontSize: 22, lineHeight: 2.4, theme: 'light', layout: 'paged', zoom: 1, margin: 18, spread: 'auto' };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('reader-settings') || '{}') }; } catch {}
const saveSettings = () => { try { localStorage.setItem('reader-settings', JSON.stringify(settings)); } catch {} };

function applyMargin() { document.documentElement.style.setProperty('--mx', `${settings.margin}px`); }
function updateSpread() {
  const v = $('#viewer');
  v.classList.toggle('spread', !!reader && reader.kind === 'epub' && settings.layout === 'paged' && settings.spread === 'auto' && v.clientWidth >= 900);
}

function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  $('meta[name=theme-color]').content = { light: '#1f6f5c', sepia: '#f4ecd8', dark: '#1d2126', black: '#000' }[settings.theme];
}

/* ---------- helpers ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2400);
}

const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

async function sha1(buf) {
  const h = await crypto.subtle.digest('SHA-1', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- library ---------- */
let books = [];
const urls = [];
let filter = 'all';

function relTime(ts) {
  if (!ts) return '';
  const rtf = new Intl.RelativeTimeFormat(getLang() === 'ur' ? 'ur' : 'en', { numeric: 'auto' });
  const sec = (ts - Date.now()) / 1000;
  for (const [u, n] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(sec) >= n) return rtf.format(Math.round(sec / n), u);
  }
  return rtf.format(0, 'second');
}

async function refreshLibrary() {
  books = await db.listBooks();
  renderLibrary();
}

function renderLibrary() {
  urls.splice(0).forEach(URL.revokeObjectURL);
  const q = $('#lib-search').value.trim().toLowerCase();
  const inFilter = (b) => filter === 'all' ? true : filter === 'reading' ? b.location && b.progress < 0.99 : filter === 'unread' ? !b.location
    : filter === 'done' ? b.progress >= 0.99 : b.category === filter.slice(4);
  const sort = $('#lib-sort').value;
  const list = books.filter((b) => inFilter(b) && (!q || `${b.title} ${b.author}`.toLowerCase().includes(q)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ur') : sort === 'added' ? b.added - a.added : (b.lastOpened || b.added) - (a.lastOpened || a.added));
  $('#empty').hidden = books.length > 0;
  $('.lib-tools').hidden = books.length === 0;
  renderChips();
  const shelf = $('#shelf');
  shelf.replaceChildren(...list.map(card));
}

function renderChips() {
  const cats = [...new Set(books.map((b) => b.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ur'));
  const items = books.length ? [['all', t('all')], ['reading', t('reading')], ['unread', t('unread')], ['done', t('done')], ...cats.map((c) => [`cat:${c}`, c])] : [];
  if (!items.some(([k]) => k === filter)) filter = 'all';
  $('#chips').replaceChildren(...items.map(([k, l]) => {
    const b = document.createElement('button');
    b.className = `chip${k === filter ? ' on' : ''}`; b.textContent = l; b.dir = 'auto';
    b.onclick = () => { filter = k; renderLibrary(); };
    return b;
  }));
}

function card(b) {
  const el = document.createElement('article');
  el.className = 'card';
  el.tabIndex = 0;
  const pct = Math.round((b.progress || 0) * 100);
  let cover;
  if (b.cover) {
    const u = URL.createObjectURL(b.cover); urls.push(u);
    cover = `<img src="${u}" alt="" loading="lazy">`;
  } else {
    cover = `<div class="ph"><span dir="auto">${esc(b.title)}</span></div>`;
  }
  const status = [!b.location ? t('newBook') : pct >= 99 ? t('done') : `${pct}%`, b.lastOpened ? relTime(b.lastOpened) : ''].filter(Boolean).join(' · ');
  el.innerHTML = `
    <div class="cover">${cover}<span class="badge">${b.type.toUpperCase()}</span>
      <button class="del" aria-label="${t('remove')}" title="${t('remove')}">✕</button>
      <div class="acts"><button class="act cat" title="${t('setCategory')}">🏷</button>${b.type === 'pdf' ? `<button class="act conv" title="${t('convertEpub')}">→ EPUB</button>` : ''}</div></div>
    <div class="meta"><div class="t" dir="auto">${esc(b.title)}</div>
      <div class="a" dir="auto">${esc(b.author || '')}</div>
      ${b.category ? `<div class="cat-tag" dir="auto">${esc(b.category)}</div>` : ''}
      <div class="prog"><i style="width:${pct}%"></i></div><div class="s">${status}</div></div>`;
  el.addEventListener('click', (e) => {
    if (e.target.closest('.del, .act')) return;
    openBook(b.id);
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openBook(b.id); });
  $('.del', el).addEventListener('click', async () => {
    if (confirm(t('confirmRemove'))) { await db.deleteBook(b.id); refreshLibrary(); }
  });
  $('.cat', el).addEventListener('click', async () => {
    const r = await ask({ title: t('setCategory'), value: b.category || '', placeholder: t('categoryHint'), list: [...new Set(books.map((x) => x.category).filter(Boolean))] });
    if (r.action === 'ok') { await db.updateBook(b.id, { category: r.value.trim() }); refreshLibrary(); }
  });
  $('.conv', el)?.addEventListener('click', () => convertBook(b.id));
  return el;
}

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function importFiles(files, { category = '' } = {}) {
  let last;
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase();
    const type = ext === 'epub' || f.type === 'application/epub+zip' ? 'epub' : ext === 'pdf' || f.type === 'application/pdf' ? 'pdf' : null;
    if (!type) { toast(`${t('unsupported')}: ${f.name}`); continue; }
    try {
      const buf = await f.arrayBuffer();
      const hash = await sha1(buf);
      const dup = await db.findByHash(hash);
      if (dup) { toast(`${t('duplicate')}: ${dup.title}`); last = dup.id; continue; }
      const info = type === 'epub' ? await epubInfo(buf) : await pdfCover(f);
      const fallback = f.name.replace(/\.[^.]+$/, '');
      const meta = {
        id: crypto.randomUUID(), hash, type, name: f.name, size: f.size,
        title: (info.title || '').trim() || fallback, author: (info.author || '').trim(),
        cover: info.cover || null, category, added: Date.now(), lastOpened: 0, progress: 0, location: null, rtl: 'auto', marks: [],
      };
      await db.addBook(meta, new Blob([buf], { type: f.type || (type === 'pdf' ? 'application/pdf' : 'application/epub+zip') }));
      last = meta.id;
      toast(`${t('imported')}: ${meta.title}`);
    } catch (e) {
      console.error(e);
      toast(`${t('failed')}: ${f.name}`);
    }
  }
  await refreshLibrary();
  return last;
}

async function epubInfo(buf) {
  const book = ePub(buf);
  try {
    await book.ready;
    const m = book.packaging.metadata;
    let cover = null;
    try {
      const u = await book.coverUrl();
      if (u) cover = await (await fetch(u)).blob();
    } catch { /* no cover */ }
    return { title: m.title, author: m.creator, cover };
  } finally { book.destroy(); }
}

/* ---------- reader ---------- */
let reader = null;
let current = null; // book meta
let lastProgress = null;

async function openBook(id, { fromPop = false } = {}) {
  const meta = await db.getBook(id);
  const blob = await db.getFile(id);
  if (!meta || !blob) return toast(t('failed'));
  current = meta;
  $('#library').hidden = true;
  $('#reader').hidden = false;
  $('#reader-title').textContent = meta.title;
  $('#reader-title').dir = 'auto';
  setLoading(true);
  closePanels();
  showChrome(true);
  if (!fromPop) history.pushState({ reader: id }, '');
  try {
    await mountReader(blob, meta.location);
    await db.updateBook(id, { lastOpened: Date.now() });
    setTimeout(() => { if (current?.id === id) showChrome(false); }, 2200);
  } catch (e) {
    console.error(e);
    toast(t('failed'));
    closeReader();
  } finally { setLoading(false); }
}

async function mountReader(blob, location) {
  reader?.destroy();
  const Cls = current.type === 'pdf' ? PdfReader : EpubReader;
  reader = new Cls($('#viewer'), { onProgress, onTap, onSelect, onHighlight });
  await reader.open(blob, { settings, location, rtl: current.rtl, annots: current.annots || [] });
  updateSpread();
  $('#seek').dir = reader.rtl ? 'rtl' : 'ltr';
  $('#seek').classList.toggle('rtl', !!reader.rtl);
  $('#reader').dataset.dir = reader.rtl ? 'rtl' : 'ltr';
  // fill in better metadata discovered while opening (EPUB title etc.)
  buildToc();
}

function setLoading(on) {
  const l = $('#loading');
  l.hidden = !on; l.textContent = on ? t('opening') : '';
}

const persist = debounce(async (p) => {
  if (!current || !p.location) return;
  current.location = p.location;
  if (p.pct != null) current.progress = p.pct;
  await db.updateBook(current.id, { location: p.location, progress: current.progress });
}, 600);

function onProgress(p) {
  lastProgress = p;
  if (p.pct != null) $('#seek').value = Math.round(p.pct * 1000);
  const fmt = (n) => (getLang() === 'ur' ? n.toLocaleString('ur-PK') : n);
  $('#foot-left').textContent = p.chapter || '';
  $('#foot-left').dir = 'auto';
  $('#foot-right').textContent = [p.label, p.pct != null ? `${fmt(Math.round(p.pct * 100))}%` : ''].filter(Boolean).join('  ·  ');
  updateMarkIcon();
  persist(p);
}

function onTap(side) {
  const scrolling = reader.kind === 'epub' && settings.layout === 'scroll';
  if (side === 'center' || scrolling) return toggleChrome();
  closePanels();
  reader.step(side);
}

let chromeShown = true;
function showChrome(on) {
  if (!on && anyPanelOpen()) return; // keep the bars while a panel is open
  chromeShown = on;
  $('#reader').classList.toggle('chrome-hidden', !on);
}
const toggleChrome = () => { if (anyPanelOpen()) return closePanels(); showChrome(!chromeShown); };

async function closeReader() {
  if (reader) {
    if (lastProgress?.location) { current.location = lastProgress.location; await db.updateBook(current.id, { location: lastProgress.location, progress: lastProgress.pct ?? current.progress }); }
    reader.destroy(); reader = null;
  }
  current = null; lastProgress = null; hidePop();
  $('#viewer').innerHTML = '';
  $('#reader').hidden = true;
  $('#library').hidden = false;
  document.title = 'Urdu Reader — اردو ریڈر';
  await refreshLibrary();
}

/* ---------- panels ---------- */
const panels = ['#panel-toc', '#panel-search', '#panel-settings'];
const anyPanelOpen = () => panels.some((p) => !$(p).hidden);
function closePanels() { panels.forEach((p) => ($(p).hidden = true)); }
function togglePanel(sel, onOpen) {
  const open = $(sel).hidden;
  closePanels();
  $(sel).hidden = !open;
  if (open) { showChrome(true); onOpen?.(); }
}

function listItems(container, items, onPick, onDelete) {
  container.replaceChildren(...items.map((it) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.paddingInlineStart = `${14 + (it.depth || 0) * 16}px`;
    const b = document.createElement('button');
    b.className = 'row-main'; b.dir = 'auto'; b.textContent = it.label || '—';
    b.addEventListener('click', () => onPick(it));
    row.appendChild(b);
    if (onDelete) {
      const d = document.createElement('button');
      d.className = 'btn icon sm'; d.textContent = '✕';
      d.addEventListener('click', () => onDelete(it));
      row.appendChild(d);
    }
    return row;
  }));
}

function buildToc() {
  const items = reader.tocItems();
  const box = $('#toc-list');
  if (!items.length) { box.innerHTML = `<p class="hint">${t('noToc')}</p>`; return; }
  listItems(box, items, (it) => { reader.goTo(it.target); closePanels(); showChrome(false); });
}

function buildMarks() {
  const box = $('#marks-list');
  const marks = current.marks || [];
  if (!marks.length) { box.innerHTML = `<p class="hint">${t('noMarks')}</p>`; return; }
  listItems(box, marks.map((m) => ({ ...m, label: m.label })), (m) => { reader.goTo(m.target); closePanels(); showChrome(false); },
    async (m) => { current.marks = current.marks.filter((x) => x.target !== m.target); await db.updateBook(current.id, { marks: current.marks }); buildMarks(); updateMarkIcon(); });
}

function updateMarkIcon() {
  const here = lastProgress?.location;
  const has = here && (current?.marks || []).some((m) => m.target === (reader.kind === 'pdf' ? Number(here) : here));
  $('#mark-btn').textContent = has ? '★' : '☆';
  $('#mark-btn').classList.toggle('on', !!has);
}

async function toggleMark() {
  if (!lastProgress?.location) return;
  const target = reader.kind === 'pdf' ? Number(lastProgress.location) : lastProgress.location;
  const marks = current.marks || [];
  const idx = marks.findIndex((m) => m.target === target);
  if (idx >= 0) { marks.splice(idx, 1); toast(t('bookmarkRemoved')); }
  else {
    const pct = lastProgress.pct != null ? ` (${Math.round(lastProgress.pct * 100)}%)` : '';
    const label = reader.kind === 'pdf' ? `${t('page')} ${target}` : `${lastProgress.chapter || t('location')}${pct}`;
    marks.push({ target, label, ts: Date.now() });
    toast(t('bookmarkAdded'));
  }
  current.marks = marks;
  await db.updateBook(current.id, { marks });
  updateMarkIcon();
}

/* ---------- highlights, notes, popover ---------- */
let popState = null;
const hlColor = (c) => (HL[settings.theme] || HL.light)[c];

function hidePop() { $('#pop').hidden = true; popState = null; }

function showPop(rect, state) {
  popState = state;
  const pop = $('#pop');
  const a = state.mode === 'edit' ? current.annots.find((x) => x.id === state.id) : null;
  $('#pop-swatches').replaceChildren(...HL_COLORS.map((c) => {
    const b = document.createElement('button');
    b.className = `sw${a?.color === c ? ' on' : ''}`; b.dataset.c = c; b.style.background = hlColor(c); b.setAttribute('aria-label', c);
    return b;
  }));
  $('[data-act=del]', pop).hidden = state.mode !== 'edit';
  $('[data-act=note]', pop).textContent = a?.note ? '✎•' : '✎';
  pop.hidden = false;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const x = Math.min(innerWidth - w - 8, Math.max(8, (rect.left + rect.right) / 2 - w / 2));
  const y = rect.top - h - 12 >= 8 ? rect.top - h - 12 : Math.min(innerHeight - h - 8, rect.bottom + 12);
  pop.style.left = `${x}px`; pop.style.top = `${y}px`;
}

function onSelect(sel) {
  if (!sel || !sel.text) { if (popState?.mode === 'new') hidePop(); return; }
  closePanels();
  showPop(sel.rect, { mode: 'new', sel });
}

function onHighlight(id, e) {
  const x = e?.clientX ?? innerWidth / 2, y = e?.clientY ?? innerHeight / 2;
  showPop({ left: x, right: x, top: y - 14, bottom: y + 14 }, { mode: 'edit', id });
}

async function saveAnnots() {
  await db.updateBook(current.id, { annots: current.annots });
  reader.setHighlights(current.annots);
  if (!$('#notes-list').hidden) renderNotes();
}

async function createAnnot(sel, color) {
  const a = {
    id: crypto.randomUUID(), cfi: sel.cfiRange, text: sel.text, color, note: '',
    chapter: lastProgress?.chapter || '', pct: reader.pctOf(sel.cfiRange) ?? lastProgress?.pct ?? 0, ts: Date.now(),
  };
  current.annots = [...(current.annots || []), a];
  try { sel.contents.window.getSelection().removeAllRanges(); } catch { /* ignore */ }
  await saveAnnots();
  return a;
}

async function editNote(a) {
  const r = await ask({ title: t('editNote'), value: a.note || '', multi: true, canDelete: !!a.note });
  if (r.action === 'ok') a.note = r.value.trim();
  else if (r.action === 'del') a.note = '';
  else return;
  await saveAnnots();
}

async function popAction(act) {
  const st = popState; if (!st) return;
  const get = () => st.mode === 'edit' ? current.annots.find((x) => x.id === st.id) : null;
  const text = st.mode === 'new' ? st.sel.text : get()?.text || '';
  hidePop();
  if (act === 'copy') { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch { /* ignore */ } }
  else if (act === 'dict') {
    const words = text.split(/\s+/).filter(Boolean);
    const w = (words.length <= 3 ? words.join(' ') : words[0]).replace(/[۔،؛؟!.,;:"“”«»()]/g, '');
    window.open(`https://ur.wiktionary.org/wiki/${encodeURIComponent(w)}`, '_blank', 'noopener');
  } else if (act === 'find') {
    togglePanel('#panel-search', () => { $('#search-input').value = text.slice(0, 60); $('#search-form').requestSubmit(); });
  } else if (act === 'note') {
    const a = get() || await createAnnot(st.sel, 'yellow');
    await editNote(a);
  } else if (act === 'del') {
    current.annots = current.annots.filter((x) => x.id !== st.id);
    await saveAnnots();
  }
}

function renderNotes() {
  const box = $('#notes-list');
  if (reader.kind === 'pdf') {
    box.innerHTML = `<p class="hint">${t('pdfNotesHint')}<br><button class="btn primary" id="n-conv">${t('convertEpub')}</button></p>`;
    $('#n-conv').onclick = convertFromReader;
    return;
  }
  const list = [...(current.annots || [])].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || a.ts - b.ts);
  if (!list.length) { box.innerHTML = `<p class="hint">${t('noNotes')}</p>`; return; }
  box.replaceChildren();
  const tools = document.createElement('div');
  tools.className = 'note-tools';
  tools.innerHTML = `<button class="btn" id="n-exp">${t('exportNotes')}</button><button class="btn" id="n-copy">${t('copyNotes')}</button>`;
  box.appendChild(tools);
  $('#n-exp', tools).onclick = () => download(`${current.title}-notes.md`, notesMarkdown(list));
  $('#n-copy', tools).onclick = async () => { try { await navigator.clipboard.writeText(notesMarkdown(list)); toast(t('copied')); } catch { /* ignore */ } };
  for (const a of list) {
    const row = document.createElement('div');
    row.className = 'note-row';
    row.innerHTML = `<span class="note-bar" style="background:${hlColor(a.color)}"></span><div class="note-body">
      <div class="note-text" dir="auto">${esc(a.text)}</div>${a.note ? `<div class="note-note" dir="auto">${esc(a.note)}</div>` : ''}
      ${a.chapter ? `<div class="note-chap" dir="auto">${esc(a.chapter)}</div>` : ''}</div>
      <button class="btn icon sm" aria-label="${t('delete')}">✕</button>`;
    row.onclick = (e) => {
      if (e.target.closest('button')) return;
      reader.goTo(a.cfi); closePanels(); showChrome(false);
    };
    $('button', row).onclick = async () => { current.annots = current.annots.filter((x) => x.id !== a.id); await saveAnnots(); renderNotes(); };
    box.appendChild(row);
  }
}

function notesMarkdown(list) {
  let out = `# ${current.title}\n${current.author ? `*${current.author}*\n` : ''}\n`;
  let chap = null;
  for (const a of list) {
    if (a.chapter && a.chapter !== chap) { chap = a.chapter; out += `## ${chap}\n\n`; }
    out += `> ${a.text.replace(/\n+/g, ' ')}\n\n${a.note ? `${a.note}\n\n` : ''}`;
  }
  return out;
}

function download(name, text) {
  const u = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: u, download: name.replace(/[\\/:*?"<>|]/g, '_') });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

// Small promise-based dialog for text / category / note input.
function ask({ title, value = '', placeholder = '', multi = false, list = [], canDelete = false }) {
  const dlg = $('#ask'), inp = $('#ask-input'), ta = $('#ask-text');
  $('#ask-title').textContent = title;
  inp.hidden = multi; ta.hidden = !multi;
  const el = multi ? ta : inp;
  el.value = value; el.placeholder = placeholder;
  $('#ask-list').replaceChildren(...list.map((v) => Object.assign(document.createElement('option'), { value: v })));
  $('#ask-del').hidden = !canDelete;
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve({ action: dlg.returnValue || 'cancel', value: el.value }), { once: true });
    dlg.returnValue = '';
    dlg.showModal(); el.focus();
  });
}

/* ---------- PDF → EPUB ---------- */
function busy(on, text = '') { $('#busy').hidden = !on; $('#busy-text').textContent = text; }

async function convertBook(id) {
  const meta = await db.getBook(id), blob = await db.getFile(id);
  if (!meta || !blob) return null;
  busy(true, `${t('converting')}…`);
  try {
    const res = await pdfToEpub(blob, { title: meta.title, author: meta.author, onProgress: (p) => busy(true, `${t('converting')} ${Math.round(p * 100)}%`) });
    const file = new File([res.blob], `${meta.title}.epub`, { type: 'application/epub+zip' });
    const newId = await importFiles([file], { category: meta.category || '' });
    toast(t('converted'));
    return newId;
  } catch (e) {
    if (e?.code === 'noText') alert(t('noText')); else { console.error(e); toast(t('failed')); }
    return null;
  } finally { busy(false); }
}

async function convertFromReader() {
  closePanels();
  const id = await convertBook(current.id);
  if (id) { await closeReader(); openBook(id); }
}

/* ---------- settings sheet ---------- */
function seg(name, options, value) {
  return `<div class="seg" data-name="${name}">${options.map(([v, l]) =>
    `<button data-v="${v}" class="${String(v) === String(value) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

function buildSettings() {
  const isPdf = reader?.kind === 'pdf';
  const body = $('#settings-body');
  const fontBtns = Object.keys(FONTS).map((k) =>
    `<button data-v="${k}" class="font-opt ${settings.font === k ? 'on' : ''}" style="font-family:${FONTS[k].stack}"><span>اردو</span><small>${t(k)}</small></button>`).join('');
  body.innerHTML = `
    ${isPdf ? `<p class="hint">${t('pdfNote')}</p>
      <label class="field"><span>${t('pdfZoom')}</span><input type="range" id="s-zoom" min="0.6" max="2.5" step="0.1" value="${reader.zoom}"></label>
      <div class="field"><button class="btn primary" id="s-convert">${t('convertEpub')}</button><p class="hint" style="padding:0">${t('convertHint')}</p></div>`
    : `<div class="field"><span>${t('font')}</span><div class="fonts" data-name="font">${fontBtns}</div></div>
      <label class="field"><span>${t('fontSize')}</span><input type="range" id="s-size" min="14" max="44" step="1" value="${settings.fontSize}"></label>
      <label class="field"><span>${t('lineHeight')}</span><input type="range" id="s-lh" min="1.3" max="3.2" step="0.1" value="${settings.lineHeight}"></label>
      <label class="field"><span>${t('margin')}</span><input type="range" id="s-margin" min="0" max="90" step="2" value="${settings.margin}"></label>
      <div class="field"><span>${t('layout')}</span>${seg('layout', [['paged', t('paged')], ['scroll', t('scroll')]], settings.layout)}</div>
      ${settings.layout === 'paged' ? `<div class="field"><span>${t('spread')}</span>${seg('spread', [['auto', t('on')], ['single', t('off')]], settings.spread)}</div>` : ''}`}
    <div class="field"><span>${t('theme')}</span>
      <div class="themes" data-name="theme">${['light', 'sepia', 'dark', 'black'].map((k) =>
        `<button data-v="${k}" class="theme-opt th-${k} ${settings.theme === k ? 'on' : ''}">${t(k)}</button>`).join('')}</div></div>
    <div class="field"><span>${t('direction')}</span>${seg('dir', [['auto', t('auto')], ['rtl', t('rtl')], ['ltr', t('ltr')]], current.rtl || 'auto')}</div>`;

  $('#s-convert')?.addEventListener('click', convertFromReader);
  $('#s-zoom')?.addEventListener('change', (e) => reader.setZoom(+e.target.value));
  const live = () => reader.applySettings(settings);
  $('#s-size')?.addEventListener('input', (e) => { settings.fontSize = +e.target.value; saveSettings(); live(); });
  $('#s-margin')?.addEventListener('input', (e) => { settings.margin = +e.target.value; saveSettings(); applyMargin(); reader.rendition?.resize?.(); updateSpread(); });
  $('#s-lh')?.addEventListener('input', (e) => { settings.lineHeight = +e.target.value; saveSettings(); live(); });

  $$('[data-name]', body).forEach((group) => group.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const v = b.dataset.v, name = group.dataset.name;
    if (name === 'font') { settings.font = v; settings.lineHeight = FONTS[v].lh; saveSettings(); live(); }
    else if (name === 'theme') { settings.theme = v; saveSettings(); applyTheme(); live(); if (!$('#notes-list').hidden) renderNotes(); }
    else if (name === 'layout') { settings.layout = v; saveSettings(); await remount(); }
    else if (name === 'spread') { settings.spread = v; saveSettings(); await remount(); }
    else if (name === 'dir') { current.rtl = v; await db.updateBook(current.id, { rtl: v }); await remount(); }
    buildSettings();
  }));
}

async function remount() {
  const loc = lastProgress?.location || current.location;
  setLoading(true);
  try { await mountReader(await db.getFile(current.id), loc); } finally { setLoading(false); }
}

/* ---------- wiring ---------- */
function init() {
  applyTheme();
  applyMargin();
  applyI18n();

  const input = $('#file-input');
  const pick = () => input.click();
  $('#import-btn').onclick = pick;
  $('#import-btn2').onclick = pick;
  input.onchange = async () => { await importFiles([...input.files]); input.value = ''; };
  $('#lib-search').oninput = renderLibrary;
  $('#lib-sort').onchange = renderLibrary;
  $('#pop-swatches').addEventListener('click', async (e) => {
    const c = e.target.closest('.sw')?.dataset.c; if (!c || !popState) return;
    const st = popState; hidePop();
    if (st.mode === 'new') await createAnnot(st.sel, c);
    else { const a = current.annots.find((x) => x.id === st.id); if (a) { a.color = c; await saveAnnots(); } }
  });
  $$('#pop [data-act]').forEach((b) => (b.onclick = () => popAction(b.dataset.act)));
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#pop')) { if (popState?.mode === 'edit') hidePop(); } });
  $('#lang-toggle').onclick = () => { setLang(getLang() === 'ur' ? 'en' : 'ur'); renderLibrary(); };

  // drag & drop
  let depth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types?.includes('Files')) { depth++; $('#drop-overlay').hidden = false; } });
  window.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; $('#drop-overlay').hidden = true; } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault(); depth = 0; $('#drop-overlay').hidden = true;
    if (e.dataTransfer?.files?.length) { const id = await importFiles([...e.dataTransfer.files]); if (id && e.dataTransfer.files.length === 1) openBook(id); }
  });

  // reader chrome
  $('#back-btn').onclick = () => history.state?.reader ? history.back() : closeReader();
  $('#toc-btn').onclick = () => togglePanel('#panel-toc', () => { buildToc(); buildMarks(); });
  $('#search-btn').onclick = () => togglePanel('#panel-search', () => $('#search-input').focus());
  $('#set-btn').onclick = () => togglePanel('#panel-settings', buildSettings);
  $('#mark-btn').onclick = toggleMark;
  $$('[data-close]').forEach((b) => (b.onclick = closePanels));
  $$('.tab').forEach((tab) => (tab.onclick = () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === tab));
    $('#toc-list').hidden = tab.dataset.tab !== 'toc';
    $('#marks-list').hidden = tab.dataset.tab !== 'marks';
    $('#notes-list').hidden = tab.dataset.tab !== 'notes';
    if (tab.dataset.tab === 'notes') renderNotes();
  }));
  $('#seek').addEventListener('change', (e) => reader?.seek(e.target.value / 1000));

  $('#search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (!q) return;
    const box = $('#search-list');
    box.innerHTML = `<p class="hint">${t('searching')}</p>`;
    const res = await reader.search(q);
    if (!res.length) { box.innerHTML = `<p class="hint">${t('noResults')}${reader.kind === 'pdf' ? `<br><br>${t('pdfSearchNote')}` : ''}</p>`; return; }
    listItems(box, res, (r) => { reader.goTo(r.target); closePanels(); showChrome(false); });
  });

  window.addEventListener('keydown', (e) => {
    if (!reader || e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') return anyPanelOpen() ? closePanels() : $('#back-btn').click();
    reader.onKey(e);
  });
  window.addEventListener('popstate', () => { if (reader) closeReader(); });
  window.addEventListener('resize', debounce(() => { reader?.rendition?.resize?.(); updateSpread(); }, 150));

  // OS-level "Open with…" for installed PWAs
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (p) => {
      const files = await Promise.all((p.files || []).map((h) => h.getFile()));
      if (files.length) { const id = await importFiles(files); if (id) openBook(id); }
    });
  }

  refreshLibrary();
}

init();
