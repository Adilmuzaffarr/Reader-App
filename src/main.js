import './style.css';
import { FONTS } from './fonts.js';
import { t, getLang, setLang, applyI18n } from './i18n.js';
import * as db from './db.js';
import { EpubReader } from './epub-reader.js';
import { PdfReader, pdfCover } from './pdf-reader.js';
import ePub from 'epubjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- settings ---------- */
const DEFAULTS = { font: 'nastaliq', fontSize: 22, lineHeight: 2.4, theme: 'light', layout: 'paged', zoom: 1 };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('reader-settings') || '{}') }; } catch {}
const saveSettings = () => { try { localStorage.setItem('reader-settings', JSON.stringify(settings)); } catch {} };

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

async function refreshLibrary() {
  books = (await db.listBooks()).sort((a, b) => (b.lastOpened || b.added) - (a.lastOpened || a.added));
  renderLibrary();
}

function renderLibrary() {
  urls.splice(0).forEach(URL.revokeObjectURL);
  const q = $('#lib-search').value.trim().toLowerCase();
  const list = books.filter((b) => !q || `${b.title} ${b.author}`.toLowerCase().includes(q));
  $('#empty').hidden = books.length > 0;
  $('.lib-tools').hidden = books.length === 0;
  const shelf = $('#shelf');
  shelf.replaceChildren(...list.map(card));
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
  const status = !b.location ? t('newBook') : pct >= 99 ? t('done') : `${pct}%`;
  el.innerHTML = `
    <div class="cover">${cover}<span class="badge">${b.type.toUpperCase()}</span>
      <button class="del" aria-label="${t('remove')}" title="${t('remove')}">✕</button></div>
    <div class="meta"><div class="t" dir="auto">${esc(b.title)}</div>
      <div class="a" dir="auto">${esc(b.author || '')}</div>
      <div class="prog"><i style="width:${pct}%"></i></div><div class="s">${status}</div></div>`;
  el.addEventListener('click', (e) => {
    if (e.target.closest('.del')) return;
    openBook(b.id);
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openBook(b.id); });
  $('.del', el).addEventListener('click', async () => {
    if (confirm(t('confirmRemove'))) { await db.deleteBook(b.id); refreshLibrary(); }
  });
  return el;
}

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function importFiles(files) {
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
        cover: info.cover || null, added: Date.now(), lastOpened: 0, progress: 0, location: null, rtl: 'auto', marks: [],
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
  reader = new Cls($('#viewer'), { onProgress, onTap });
  await reader.open(blob, { settings, location, rtl: current.rtl });
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
  current = null; lastProgress = null;
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
      <label class="field"><span>${t('pdfZoom')}</span><input type="range" id="s-zoom" min="0.6" max="2.5" step="0.1" value="${reader.zoom}"></label>`
    : `<div class="field"><span>${t('font')}</span><div class="fonts" data-name="font">${fontBtns}</div></div>
      <label class="field"><span>${t('fontSize')}</span><input type="range" id="s-size" min="14" max="44" step="1" value="${settings.fontSize}"></label>
      <label class="field"><span>${t('lineHeight')}</span><input type="range" id="s-lh" min="1.3" max="3.2" step="0.1" value="${settings.lineHeight}"></label>
      <div class="field"><span>${t('layout')}</span>${seg('layout', [['paged', t('paged')], ['scroll', t('scroll')]], settings.layout)}</div>`}
    <div class="field"><span>${t('theme')}</span>
      <div class="themes" data-name="theme">${['light', 'sepia', 'dark', 'black'].map((k) =>
        `<button data-v="${k}" class="theme-opt th-${k} ${settings.theme === k ? 'on' : ''}">${t(k)}</button>`).join('')}</div></div>
    <div class="field"><span>${t('direction')}</span>${seg('dir', [['auto', t('auto')], ['rtl', t('rtl')], ['ltr', t('ltr')]], current.rtl || 'auto')}</div>`;

  $('#s-zoom')?.addEventListener('change', (e) => reader.setZoom(+e.target.value));
  const live = () => reader.applySettings(settings);
  $('#s-size')?.addEventListener('input', (e) => { settings.fontSize = +e.target.value; saveSettings(); live(); });
  $('#s-lh')?.addEventListener('input', (e) => { settings.lineHeight = +e.target.value; saveSettings(); live(); });

  $$('[data-name]', body).forEach((group) => group.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const v = b.dataset.v, name = group.dataset.name;
    if (name === 'font') { settings.font = v; settings.lineHeight = FONTS[v].lh; saveSettings(); live(); }
    else if (name === 'theme') { settings.theme = v; saveSettings(); applyTheme(); live(); }
    else if (name === 'layout') { settings.layout = v; saveSettings(); await remount(); }
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
  applyI18n();

  const input = $('#file-input');
  const pick = () => input.click();
  $('#import-btn').onclick = pick;
  $('#import-btn2').onclick = pick;
  input.onchange = async () => { await importFiles([...input.files]); input.value = ''; };
  $('#lib-search').oninput = renderLibrary;
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
  window.addEventListener('resize', debounce(() => reader?.rendition?.resize?.(), 150));

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
