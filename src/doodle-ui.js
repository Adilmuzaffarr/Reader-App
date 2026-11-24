import { COLORS, STAMP_LIST, FRAME_STYLES, colorOf, stampThumb, drawDoodles, anchorAt, simplify, liveStrokePath, liveStampSvg, LIVE_DEFS } from './doodle.js';

const $ = (s) => document.querySelector(s);

export function initDoodles({ getReader, getBook, getSettings, save, toast, t, closePanels, showChrome }) {
  const S = { on: false, tool: 'pen', color: 'ink', stamp: 'heart', sizes: { pen: 3.2, marker: 18, stamp: 64 }, undo: [] };
  const ink = $('#ink'), live = $('#ink-live'), bar = $('#doodle-bar'), tray = $('#stamp-tray'), root = $('#reader');
  const theme = () => getSettings().theme;
  const list = () => (getBook().doodles ||= []);
  const sizeKey = () => (S.tool === 'marker' ? 'marker' : S.tool === 'stamp' ? 'stamp' : 'pen');

  /* ---------- rendering ---------- */
  let raf = 0;
  const redraw = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = getReader(), b = getBook();
      if (r && b) drawDoodles(r, list(), { theme: theme(), erasing: S.on && S.tool === 'eraser' });
    });
  };
  let saveT, pending = null;
  const flush = () => { clearTimeout(saveT); if (pending) { save(pending.id, pending.l); pending = null; } };
  const persist = () => { clearTimeout(saveT); pending = { id: getBook()?.id, l: list() }; saveT = setTimeout(flush, 350); };

  /* ---------- toolbar ---------- */
  const swatches = $('#dd-colors');
  const dot = $('#dd-dot');
  function updateDot() {
    const k = sizeKey();
    const px = Math.min(30, Math.max(3, k === 'stamp' ? S.sizes.stamp / 3 : S.sizes[k]));
    dot.style.width = dot.style.height = `${px}px`;
    dot.style.background = colorOf(S.color, theme());
    dot.style.opacity = S.tool === 'marker' ? 0.5 : 1;
    dot.style.borderRadius = S.tool === 'stamp' ? '30%' : '50%';
  }
  function buildColors() {
    swatches.replaceChildren(...COLORS.map((c) => {
      const b = document.createElement('button');
      b.className = `dd-c${S.color === c ? ' on' : ''}`;
      b.style.setProperty('--c', colorOf(c, theme()));
      b.setAttribute('aria-label', c);
      b.onclick = () => { S.color = c; buildColors(); buildTray(); updateDot(); };
      return b;
    }));
  }
  function buildTray() {
    tray.replaceChildren(...STAMP_LIST.map((n) => {
      const b = document.createElement('button');
      b.className = `stamp${S.stamp === n ? ' on' : ''}`;
      b.innerHTML = stampThumb(n, S.color, theme());
      b.onclick = () => { S.stamp = n; setTool('stamp'); tray.hidden = true; buildTray(); };
      return b;
    }));
  }
  function setTool(tool) {
    S.tool = tool;
    root.dataset.dtool = tool;
    for (const b of bar.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === tool);
    const size = $('#dd-size'), k = sizeKey();
    size.min = k === 'stamp' ? 24 : 1; size.max = k === 'stamp' ? 150 : k === 'marker' ? 44 : 14; size.step = k === 'pen' ? 0.2 : 1;
    size.value = S.sizes[k];
    const drawing = tool !== 'hand' && tool !== 'eraser';
    $('#dd-sizewrap').hidden = !drawing;
    swatches.hidden = !drawing;
    updateDot();
    redraw();
  }
  $('#dd-size').oninput = (e) => { S.sizes[sizeKey()] = +e.target.value; updateDot(); };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    tray.hidden = b.dataset.tool === 'stamp' ? (S.tool === 'stamp' ? !tray.hidden : false) : true;
    placeTray();
    setTool(b.dataset.tool);
  });
  $('#dd-undo').onclick = () => {
    const id = S.undo.pop();
    if (!id) return;
    const l = list(); const i = l.findIndex((d) => d.id === id);
    if (i >= 0) { l.splice(i, 1); persist(); redraw(); }
  };
  $('#dd-prev').onclick = () => getReader()?.prev();
  $('#dd-next').onclick = () => getReader()?.next();
  $('#dd-done').onclick = () => exit();
  const placeTray = () => { tray.style.bottom = `${bar.offsetHeight + 24}px`; };
  $('#dd-fold').onclick = () => { bar.classList.toggle('folded'); placeTray(); };

  function enter() {
    const r = getReader();
    if (!r) return;
    if (r.kind === 'epub' && getSettings().layout === 'scroll') return toast(t('doodleScroll'));
    S.on = true; S.undo = [];
    if (S.tool === 'hand' || S.tool === 'eraser') S.tool = 'pen'; // always start ready to draw
    closePanels();
    root.classList.add('doodling', 'chrome-hidden');
    bar.hidden = false; ink.hidden = false;
    buildColors(); buildTray(); setTool(S.tool);
  }
  function exit() {
    S.on = false;
    root.classList.remove('doodling');
    bar.hidden = true; ink.hidden = true; tray.hidden = true;
    live.replaceChildren();
    redraw();
    showChrome?.(false);
  }

  /* ---------- pointer handling ---------- */
  let cur = null;
  const uid = () => crypto.randomUUID();

  function add(d) { list().push(d); S.undo.push(d.id); if (S.undo.length > 60) S.undo.shift(); persist(); redraw(); }

  function eraseAt(x, y) {
    const r = getReader(); if (!r) return;
    const hit = new Set();
    const collect = (els) => els.forEach((el) => { const g = el.closest?.('[data-did]'); if (g) hit.add(g.dataset.did); });
    if (r.kind === 'pdf') collect(document.elementsFromPoint(x, y));
    else for (const c of r.rendition.getContents()) {
      const fr = c.document.defaultView.frameElement.getBoundingClientRect();
      collect(c.document.elementsFromPoint(x - fr.left, y - fr.top));
    }
    if (hit.size) {
      const l = list();
      for (let i = l.length - 1; i >= 0; i--) if (hit.has(l[i].id)) l.splice(i, 1);
      persist(); redraw();
    }
  }

  const strokeLive = () => {
    const marker = S.tool === 'marker';
    const col = colorOf(S.color, theme());
    live.innerHTML = `<path d="${liveStrokePath(cur.pts, S.sizes[S.tool], marker)}" fill="${col}" fill-opacity="${marker ? 0.45 : 1}" ${marker ? 'style="mix-blend-mode:multiply"' : ''}/>`;
  };
  const stampLive = (x, y) => { live.innerHTML = LIVE_DEFS + liveStampSvg(S.stamp, S.color, theme(), S.sizes.stamp, x, y, cur.rot); };

  ink.addEventListener('pointerdown', (e) => {
    if (!S.on || S.tool === 'hand') return;
    e.preventDefault();
    ink.setPointerCapture(e.pointerId);
    cur = { x0: e.clientX, y0: e.clientY, pts: [[e.clientX, e.clientY]], moved: 0, rot: Math.round((Math.random() - 0.5) * 14) };
    if (S.tool === 'pen' || S.tool === 'marker') strokeLive();
    else if (S.tool === 'stamp') stampLive(e.clientX, e.clientY);
    else if (S.tool === 'eraser') eraseAt(e.clientX, e.clientY);
  });

  ink.addEventListener('pointermove', (e) => {
    if (!cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs.length ? evs : [e]) {
      cur.moved = Math.max(cur.moved, Math.hypot(ev.clientX - cur.x0, ev.clientY - cur.y0));
      if (S.tool === 'pen' || S.tool === 'marker') cur.pts.push([ev.clientX, ev.clientY]);
      else if (S.tool === 'eraser') eraseAt(ev.clientX, ev.clientY);
    }
    cur.last = [e.clientX, e.clientY];
    if (S.tool === 'pen' || S.tool === 'marker') strokeLive();
    else if (S.tool === 'stamp') stampLive(e.clientX, e.clientY);
  });

  const finish = (e) => {
    if (!cur) return;
    const c = cur; cur = null;
    live.replaceChildren();
    const r = getReader(); if (!r) return;
    if (S.tool === 'pen' || S.tool === 'marker') {
      const a = anchorAt(r, c.pts[0][0], c.pts[0][1]);
      if (!a) return toast(t('doodleNoAnchor'));
      const rel = c.pts.map(([x, y]) => a.toRel(x, y));
      add({ id: uid(), kind: 'stroke', color: S.color, w: S.sizes[S.tool] / a.unit, alpha: S.tool === 'marker' ? 0.45 : 1, pts: simplify(rel, 0.6 / a.unit), anchor: a.anchor });
    } else if (S.tool === 'stamp') { // sticker-style: it lands where you let go
      const x = e.clientX, y = e.clientY;
      const a = anchorAt(r, x, y);
      if (!a) return toast(t('doodleNoAnchor'));
      add({ id: uid(), kind: 'stamp', stamp: S.stamp, color: S.color, size: S.sizes.stamp / a.unit, rot: c.rot, anchor: a.anchor });
    }
  };
  ink.addEventListener('pointerup', finish);
  ink.addEventListener('pointercancel', () => { cur = null; live.replaceChildren(); });

  /* ---------- frames around text ---------- */
  function addFrame(cfi, style) {
    const r = getReader();
    if (!r || r.kind !== 'epub') return;
    const sec = r.book.spine.get(cfi)?.index;
    add({ id: uid(), kind: 'frame', style, color: S.color === 'ink' ? '#e07a8f' : S.color, anchor: { type: 'epub', sec, cfi } });
  }

  return { enter, exit, redraw, flush, addFrame, isOn: () => S.on, FRAME_STYLES, color: () => S.color };
}
