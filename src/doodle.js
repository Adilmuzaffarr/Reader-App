// Doodles: freehand pen/marker, hand-inked stamps and decorative frames drawn on a page.
//
// Geometry is stored in *relative units* so it survives zoom / font-size changes:
//   EPUB: attached to a character in the text (CFI) and measured in "em" (font-size at creation).
//   PDF : attached to a page and measured in page-widths.
import { getStroke } from 'perfect-freehand';

const NS = 'http://www.w3.org/2000/svg';

export const COLORS = ['ink', '#c8553d', '#e07a8f', '#efb98f', '#e3b341', '#9db596', '#6f98c9', '#9a5a6e', '#8a6fb8'];
export const STAMP_LIST = ['heart', 'heartO', 'trail', 'tower', 'vine', 'sparkle', 'star', 'sun', 'confetti', 'ring', 'squiggle', 'swirl'];
export const FRAME_STYLES = ['hearts', 'bubbles', 'sparkles'];

const isDark = (theme) => theme === 'dark' || theme === 'black';
export const inkOf = (theme) => (isDark(theme) ? '#efeadf' : '#23201d');
export const colorOf = (c, theme) => (c === 'ink' ? inkOf(theme) : c);

const f2 = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Hand-inked artwork. All stamps live in a 100×100 box centred on 0,0. */
/* Every shape = pastel "marker" fill nudged off-register + a fine ink  */
/* outline; the layer's wobble filter makes the lines slightly uneven.   */
/* ------------------------------------------------------------------ */
const HEART = 'M0,34 C-10,24 -40,8 -40,-14 C-40,-30 -28,-38 -17,-38 C-8,-38 -2,-32 0,-26 C2,-32 8,-38 17,-38 C28,-38 40,-30 40,-14 C40,8 10,24 0,34Z';
const SPARK = 'M0,-40 Q4,-6 38,0 Q4,6 0,40 Q-4,6 -38,0 Q-4,-6 0,-40Z';
const STAR = 'M0,-38 L11,-13 L38,-11 L17,6 L24,33 L0,18 L-24,33 L-17,6 L-38,-11 L-11,-13Z';

// filled shape with off-register marker fill and ink outline
function shape(d, { fill, ink, w = 2.5, off = [2.4, 1.8], op = 0.82, tf = '' }) {
  return `<g transform="${tf}">
    <path d="${d}" fill="${fill}" fill-opacity="${op}" transform="translate(${off[0]},${off[1]}) rotate(1.2)"/>
    <path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="${w * 0.55}" stroke-linecap="round" transform="rotate(-2.2) scale(1.03)"/></g>`;
}
const line = (d, c, w = 2.5, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const berry = (x, y, r, fill, ink) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" fill-opacity=".85" transform="translate(1,.8)"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ink}" stroke-width="2.1"/>`;
const leaf = (x, y, rot, s, fill, ink) => `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><path d="M0,0 C6,-9 18,-9 24,0 C18,9 6,9 0,0Z" fill="${fill}" fill-opacity=".8" transform="translate(1,1)"/><path d="M0,0 C6,-9 18,-9 24,0 C18,9 6,9 0,0Z M3,0 L20,0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></g>`;

export function stampInner(name, color, ink) {
  switch (name) {
    case 'heart': return shape(HEART, { fill: color, ink });
    case 'heartO': return `<g>${line(HEART, color, 5)}${line(HEART, ink, 1.6, 'stroke-opacity=".55" transform="rotate(-2) scale(1.04)"')}</g>`;
    case 'trail': return [[-30, 24, 0.5, -12], [2, -2, 0.66, 6], [30, -28, 0.82, -4]]
      .map(([x, y, s, r], i) => shape(HEART, { fill: i === 1 ? '#efb98f' : color, ink, w: 3.6, tf: `translate(${x},${y}) rotate(${r}) scale(${s})` })).join('');
    case 'tower': // three pastel hearts stacked over a berry branch, like a journal doodle
      return `<g transform="scale(.64) translate(0,-6)">
        ${line('M-8,76 C-40,60 -52,22 -40,-20 C-34,-40 -42,-60 -30,-80', ink, 3)}
        ${berry(-30, -80, 6.5, '#9db596', ink)}${berry(-44, -52, 5.5, '#efb98f', ink)}${berry(-46, -14, 5.5, '#9db596', ink)}
        ${line('M10,70 C42,56 54,20 44,-18 C38,-40 46,-56 36,-74', ink, 3)}
        ${berry(36, -74, 6.5, '#efb98f', ink)}${berry(48, -46, 5.5, '#9db596', ink)}${berry(50, -8, 5.5, '#efb98f', ink)}
        ${shape(HEART, { fill: '#9db596', ink, w: 3.4, tf: 'translate(0,-50) scale(.66)' })}
        ${shape(HEART, { fill: '#efb98f', ink, w: 3.2, tf: 'translate(0,-6) scale(.84)' })}
        ${shape(HEART, { fill: '#9a5a6e', ink, w: 3, tf: 'translate(0,48) scale(1.04)' })}
        ${line('M2,84 C6,96 -6,102 4,114', ink, 3)}</g>`;
    case 'vine': return `${line('M2,46 C-6,24 12,6 4,-16 C0,-28 -10,-34 -8,-46', ink, 2.6)}
      ${leaf(0, 34, -150, 0.5, color, ink)}${leaf(2, 22, -30, 0.5, color, ink)}${leaf(4, 4, -150, 0.46, color, ink)}${leaf(2, -10, -35, 0.44, color, ink)}
      ${line('M-1,-18 q-12,-4 -18,-14', ink, 2.2)}${berry(-20, -33, 5, color, ink)}
      ${line('M3,-6 q12,-2 18,-12', ink, 2.2)}${berry(21, -19, 5, color, ink)}
      ${line('M-8,-46 q6,-6 10,-14', ink, 2.2)}${berry(3, -62, 5, color, ink)}`;
    case 'sparkle': return `${shape(SPARK, { fill: color, ink, w: 2.6 })}
      <g transform="translate(34,-34) scale(.28)">${shape(SPARK, { fill: color, ink, w: 7 })}</g>
      <g transform="translate(-34,32) scale(.22)">${shape(SPARK, { fill: color, ink, w: 8 })}</g><circle cx="-30" cy="-30" r="2.6" fill="${ink}"/>`;
    case 'star': return shape(STAR, { fill: color, ink, w: 2.6 });
    case 'sun': return `${shape('M0,-16 A16,16 0 1 1 -0.1,-16Z', { fill: color, ink, w: 2.4 })}<circle r="3" fill="${ink}"/>
      ${line('M0,-26V-38 M18,-18L27,-27 M26,0H38 M18,18L27,27 M0,26V38 M-18,18L-27,27 M-26,0H-38 M-18,-18L-27,-27', ink, 2.4)}`;
    case 'confetti': return [[-34, -22, 3.4], [-8, -36, 2.4], [24, -30, 3.8], [36, 4, 2.8], [12, 26, 3.4], [-28, 22, 2.6], [-6, -6, 2], [-40, 40, 2.4], [38, 38, 2.4]]
      .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 === 0 ? ink : color}"/>`).join('')
      + `<g transform="translate(-20,6)">${line('M0,-6V6M-6,0H6', color, 2.6)}</g><g transform="translate(26,-8) scale(.2)">${shape(HEART, { fill: color, ink, w: 9 })}</g>
      <g transform="translate(-4,34) scale(.16)">${shape(HEART, { fill: color, ink, w: 11 })}</g>
      <circle cx="24" cy="18" r="6" fill="none" stroke="${ink}" stroke-width="1.8"/><circle cx="24" cy="18" r="1.6" fill="${ink}"/>`;
    case 'ring': return [[-18, 8, 14], [16, -14, 9], [22, 24, 6]].map(([x, y, r]) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity=".8" transform="translate(1.4,1)"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ink}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${Math.max(1.5, r * 0.22)}" fill="${ink}"/>`).join('');
    case 'squiggle': return `${line('M-44,2 q11,-20 22,0 t22,0 t22,0 t22,0', color, 8, 'stroke-opacity=".55" transform="translate(0,3)"')}${line('M-44,0 q11,-20 22,0 t22,0 t22,0 t22,0', ink, 2.4)}`;
    case 'swirl': return `${line('M0,0 C6,-6 14,-2 12,6 C10,16 -4,18 -12,10 C-22,0 -16,-18 0,-22 C18,-26 34,-12 32,6 C30,22 14,32 -4,30', ink, 2.6)}<circle cx="-4" cy="30" r="3.4" fill="${color}" stroke="${ink}" stroke-width="2"/>`;
    default: return '';
  }
}

export function stampThumb(name, color, theme) {
  return `<svg viewBox="-56 -56 112 112" width="46" height="46">${stampInner(name, colorOf(color, theme), inkOf(theme))}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Freehand strokes                                                    */
/* ------------------------------------------------------------------ */
function outlinePath(pts) {
  if (pts.length < 2) return '';
  const d = pts.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(f2(x0), f2(y0), f2((x0 + x1) / 2), f2((y0 + y1) / 2));
    return acc;
  }, ['M', f2(pts[0][0]), f2(pts[0][1]), 'Q']);
  d.push('Z');
  return d.join(' ');
}

export function strokeOutline(points, size, marker) {
  return getStroke(points, {
    size,
    thinning: marker ? 0 : 0.55,
    smoothing: 0.6,
    streamline: marker ? 0.6 : 0.45,
    simulatePressure: !marker,
    last: true,
    start: { taper: marker ? 0 : size * 1.2, cap: true },
    end: { taper: marker ? 0 : size * 3.5, cap: true },
  });
}

/* ------------------------------------------------------------------ */
/* Frames that hug the text                                            */
/* ------------------------------------------------------------------ */
function rounded(points, r) {
  const n = points.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[n - 1], points[0]);
  let d = `M${f2(start[0])},${f2(start[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i + n - 1) % n], p1 = points[i], p2 = points[(i + 1) % n];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [p1[0] - ((p1[0] - p0[0]) / l1) * rr, p1[1] - ((p1[1] - p0[1]) / l1) * rr];
    const b = [p1[0] + ((p2[0] - p1[0]) / l2) * rr, p1[1] + ((p2[1] - p1[1]) / l2) * rr];
    d += `L${f2(a[0])},${f2(a[1])}Q${f2(p1[0])},${f2(p1[1])} ${f2(b[0])},${f2(b[1])}`;
  }
  return `${d}Z`;
}

// Outline that follows the actual extent of each text line (a loose "cloud" around the phrase).
function blobPath(lines, u) {
  const padX = 0.34 * u;
  const L = lines.map((l) => ({ l: l.l - padX, r: l.r + padX, t: l.t, b: l.b }));
  const n = L.length;
  const padY = Math.min(0.32 * u, n > 1 ? Math.min(...L.slice(1).map((x, i) => (x.t - L[i].b) / 2)) : 0.32 * u);
  L[0].t -= Math.max(padY, 0.12 * u); L[n - 1].b += Math.max(padY, 0.12 * u);
  const pts = [[L[0].l, L[0].t], [L[0].r, L[0].t]];
  for (let i = 0; i < n - 1; i++) {
    const y = (L[i].b + L[i + 1].t) / 2;
    pts.push([L[i].r, y], [L[i + 1].r, y]);
  }
  pts.push([L[n - 1].r, L[n - 1].b], [L[n - 1].l, L[n - 1].b]);
  for (let i = n - 1; i > 0; i--) {
    const y = (L[i - 1].b + L[i].t) / 2;
    pts.push([L[i].l, y], [L[i - 1].l, y]);
  }
  // drop duplicate / collinear points
  const clean = pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5; });
  return rounded(clean, 0.75 * u);
}

function rng(seed) {
  let a = 0;
  for (const c of seed) a = (a * 31 + c.charCodeAt(0)) | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function frameSvg(d, lines, u, ink, col) {
  const r = rng(d.id);
  const dd = blobPath(lines, u);
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', dd);
  const total = path.getTotalLength();
  const hit = `<path class="hit" d="${dd}" fill="none" stroke="transparent" stroke-width="18"/>`;
  let out = '';
  if (d.style === 'bubbles') {
    const step = 0.3 * u, n = Math.max(10, Math.round(total / step));
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((i / n) * total);
      out += `<circle cx="${f2(p.x + (r() - 0.5))}" cy="${f2(p.y + (r() - 0.5))}" r="${f2(0.15 * u * (0.85 + r() * 0.3))}" fill="none" stroke="${col}" stroke-width="${f2(0.065 * u)}"/>`;
    }
  } else if (d.style === 'sparkles') {
    out += `<path d="${dd}" fill="none" stroke="${col}" stroke-width="${f2(0.07 * u)}" stroke-linecap="round" stroke-dasharray="${f2(0.5 * u)} ${f2(0.34 * u)}" filter="url(#wob-p)"/>`;
    const n = Math.max(5, Math.round(total / (1.5 * u)));
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength(((i + 0.5) / n) * total);
      const s = 0.0048 * u * (0.8 + r() * 0.5);
      out += `<g transform="translate(${f2(p.x)},${f2(p.y)}) rotate(${f2((r() - 0.5) * 20)}) scale(${f2(s)})" filter="url(#wob-s)">${shape(SPARK, { fill: col, ink, w: 5 })}</g>`;
    }
  } else { // hearts: fine ink loop with tiny hearts strung along it
    out += `<path d="${dd}" fill="none" stroke="${ink}" stroke-width="${f2(0.055 * u)}" stroke-opacity=".9" stroke-linecap="round" filter="url(#wob-p)"/>`;
    const step = 0.58 * u, n = Math.max(8, Math.round(total / step));
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((i / n) * total);
      const big = i % 2 === 0;
      const s = 0.0056 * u * (big ? 1 : 0.72) * (0.9 + r() * 0.2);
      const rot = (r() - 0.5) * 36;
      out += `<g transform="translate(${f2(p.x)},${f2(p.y)}) rotate(${f2(rot)}) scale(${f2(s)})" filter="url(#wob-s)">${shape(HEART, { fill: i % 3 === 2 ? '#efb98f' : col, ink, w: 6.5, off: [3, 2.4] })}</g>`;
    }
  }
  return `<g data-did="${d.id}">${hit}${out}</g>`;
}

/* ------------------------------------------------------------------ */
/* Rendering one doodle                                                */
/* ------------------------------------------------------------------ */
const DEFS = `<defs>
  <filter id="wob-s" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4.2"/></filter>
  <filter id="wob-p" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></defs>
<style>.hit{pointer-events:none}.erasing .hit{pointer-events:all}</style>`;

export function doodleSvg(d, ctx) {
  const { ox, oy, u, theme } = ctx;
  const ink = inkOf(theme);
  const col = colorOf(d.color, theme);
  if (d.kind === 'stroke') {
    const px = d.pts.map(([x, y]) => [ox + x * u, oy + y * u]);
    const marker = (d.alpha ?? 1) < 1;
    const size = Math.max(1, d.w * u);
    const dd = outlinePath(strokeOutline(px, size, marker));
    const blend = marker && !isDark(theme) ? 'mix-blend-mode:multiply;' : '';
    const center = 'M' + px.map((p) => `${f2(p[0])},${f2(p[1])}`).join('L');
    return `<g data-did="${d.id}" style="${blend}"><path class="hit" d="${center}" fill="none" stroke="transparent" stroke-width="${Math.max(18, size)}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${dd}" fill="${col}" fill-opacity="${marker ? d.alpha : 1}"/></g>`;
  }
  if (d.kind === 'stamp') {
    const s = (d.size * u) / 100;
    return `<g data-did="${d.id}" transform="translate(${f2(ox)},${f2(oy)}) rotate(${d.rot || 0}) scale(${f2(s)})">
      <circle class="hit" r="58" fill="transparent"/><g filter="url(#wob-s)">${stampInner(d.stamp, col, ink)}</g></g>`;
  }
  if (d.kind === 'frame' && ctx.lines) return frameSvg(d, ctx.lines, u, ink, col);
  return '';
}

function ensureLayer(doc, parent, id, css) {
  let svg = doc.getElementById(id);
  if (!svg) {
    svg = doc.createElementNS(NS, 'svg');
    svg.id = id;
    svg.setAttribute('class', 'dl');
    svg.style.cssText = css;
    parent.appendChild(svg);
  }
  return svg;
}

const rectOf = (range) => {
  const rs = range.getClientRects();
  return rs && rs.length ? rs[0] : range.getBoundingClientRect();
};

// One box per visual line of a selection (merging the fragments that share a line).
function lineBoxes(range) {
  const rs = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1).sort((a, b) => a.top - b.top || a.left - b.left);
  const lines = [];
  for (const r of rs) {
    const cy = (r.top + r.bottom) / 2;
    const L = lines.find((l) => cy > l.t && cy < l.b);
    if (L) { L.l = Math.min(L.l, r.left); L.r = Math.max(L.r, r.right); L.t = Math.min(L.t, r.top); L.b = Math.max(L.b, r.bottom); }
    else lines.push({ l: r.left, r: r.right, t: r.top, b: r.bottom });
  }
  return lines.sort((a, b) => a.t - b.t);
}

/* ---------- drawing onto the readers ---------- */
export function drawEpub(reader, doodles, { theme, erasing }) {
  if (!reader.rendition) return;
  const fs = reader.settings.fontSize;
  for (const contents of reader.rendition.getContents()) {
    const doc = contents.document;
    const svg = ensureLayer(doc, doc.documentElement, 'ur-doodles',
      'position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:40');
    svg.classList.toggle('erasing', !!erasing);
    let html = DEFS;
    for (const d of doodles) {
      const a = d.anchor;
      if (a.type !== 'epub' || a.sec !== contents.sectionIndex) continue;
      try {
        const range = contents.range(a.cfi);
        if (!range) continue;
        if (d.kind === 'frame') {
          const lines = lineBoxes(range);
          if (lines.length) html += doodleSvg(d, { u: fs, theme, lines });
        } else {
          const r = rectOf(range);
          html += doodleSvg(d, { ox: r.left + a.dx * fs, oy: r.top + a.dy * fs, u: fs, theme });
        }
      } catch { /* anchor no longer resolves */ }
    }
    svg.innerHTML = html;
  }
}

export function drawPdf(reader, doodles, { theme, erasing }) {
  reader.holders?.forEach((h, i) => {
    const page = i + 1;
    const W = h.clientWidth, H = h.clientHeight;
    const list = doodles.filter((d) => d.anchor.type === 'pdf' && d.anchor.page === page);
    let svg = h.querySelector('svg.dl');
    if (!list.length && !svg) return;
    svg = svg || ensureLayer(document, h, `dl-${page}`, 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none');
    if (!h.contains(svg)) h.appendChild(svg);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.classList.toggle('erasing', !!erasing);
    svg.innerHTML = DEFS + list.map((d) => doodleSvg(d, { ox: d.anchor.x * W, oy: d.anchor.y * W, u: W, theme })).join('');
  });
}

export const drawDoodles = (reader, doodles, opts) => (reader?.kind === 'pdf' ? drawPdf : drawEpub)(reader, doodles, opts);

/* ---------- live preview helpers (used by the ink overlay) ---------- */
export function liveStrokePath(points, size, marker) {
  return outlinePath(strokeOutline(points, size, marker));
}
export function liveStampSvg(name, color, theme, sizePx, x, y, rot = 0) {
  const s = sizePx / 100;
  return `<g transform="translate(${f2(x)},${f2(y)}) rotate(${rot}) scale(${f2(s)})" opacity=".85" filter="url(#wob-s)">${stampInner(name, colorOf(color, theme), inkOf(theme))}</g>`;
}
export const LIVE_DEFS = DEFS;

/* ---------- anchoring: viewport point → stored doodle ---------- */
function nearestChar(doc, x, y) {
  let node = null, off = 0;
  const caret = doc.caretRangeFromPoint?.(x, y);
  if (caret && caret.startContainer.nodeType === 3 && caret.startContainer.textContent.trim()) {
    node = caret.startContainer; off = caret.startOffset;
  } else { // blank area: pick the closest text node
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let best = Infinity;
    const rg = doc.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
        const dist = dx * dx + dy * dy;
        if (dist < best) { best = dist; node = n; off = 0; }
      }
    }
  }
  if (!node) return null;
  const len = node.textContent.length;
  const range = doc.createRange();
  for (let tries = 0; tries < 6; tries++) {
    const o = Math.min(Math.max(0, off + tries), len - 1);
    range.setStart(node, o); range.setEnd(node, o + 1);
    const r = rectOf(range);
    if (r && r.width > 0 && r.height > 0) return { range, rect: r };
  }
  range.setStart(node, 0); range.setEnd(node, Math.min(1, len));
  return { range, rect: rectOf(range) };
}

export function anchorAt(reader, x, y) {
  if (reader.kind === 'pdf') {
    for (let i = 0; i < reader.holders.length; i++) {
      const r = reader.holders[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const W = r.width;
        return { anchor: { type: 'pdf', page: i + 1, x: (x - r.left) / W, y: (y - r.top) / W }, toRel: (px, py) => [(px - x) / W, (py - y) / W], unit: W };
      }
    }
    return null;
  }
  const list = reader.rendition.getContents();
  let pick = null, bestD = Infinity;
  for (const c of list) {
    const fr = c.document.defaultView.frameElement.getBoundingClientRect();
    const dx = Math.max(fr.left - x, 0, x - fr.right), dy = Math.max(fr.top - y, 0, y - fr.bottom);
    if (dx * dx + dy * dy < bestD) { bestD = dx * dx + dy * dy; pick = { c, fr }; }
  }
  if (!pick) return null;
  const fs = reader.settings.fontSize;
  const ch = nearestChar(pick.c.document, x - pick.fr.left, y - pick.fr.top);
  if (!ch) return null;
  return {
    anchor: {
      type: 'epub', sec: pick.c.sectionIndex, cfi: pick.c.cfiFromRange(ch.range),
      dx: (x - pick.fr.left - ch.rect.left) / fs, dy: (y - pick.fr.top - ch.rect.top) / fs,
    },
    toRel: (px, py) => [(px - x) / fs, (py - y) / fs],
    unit: fs,
  };
}

// Light thinning only: freehand smoothing needs the points.
export function simplify(pts, eps = 0.0015) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = out[out.length - 1];
    if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) >= eps) out.push(pts[i]);
  }
  if (pts.length > 1) out.push(pts[pts.length - 1]);
  return out.map(([a, b]) => [Math.round(a * 10000) / 10000, Math.round(b * 10000) / 10000]);
}
