// Doodles: freehand pen/marker, stamps and decorative frames drawn on top of a page.
//
// Geometry is stored in *relative units* so it survives zoom / font-size changes:
//   EPUB: attached to a character in the text (CFI) and measured in "em" (font-size at creation).
//   PDF : attached to a page and measured in page-widths.
const NS = 'http://www.w3.org/2000/svg';

export const COLORS = ['ink', '#b2492f', '#d9627f', '#e0b08a', '#d9a21b', '#8fa58a', '#5a82b4', '#8e4f5e', '#7b5ea7'];
export const STAMP_LIST = ['heart', 'heartO', 'heartMini', 'tower', 'sparkle', 'star', 'flower', 'vine', 'dots', 'plus', 'squiggle', 'swirl'];
export const FRAME_STYLES = ['hearts', 'scallop', 'dash'];

const isDark = (theme) => theme === 'dark' || theme === 'black';
export const inkOf = (theme) => (isDark(theme) ? '#ece7dd' : '#1d1d1d');
export const colorOf = (c, theme) => (c === 'ink' ? inkOf(theme) : c);

const HEART = 'M0,38 C-52,2 -34,-38 -14,-34 C-6,-33 0,-26 0,-20 C0,-26 6,-33 14,-34 C34,-38 52,2 0,38Z';

// Stamps are drawn in a 100×100 box centred on (0,0).
export function stampInner(name, color, ink) {
  const o = `stroke="${ink}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
  const line = (c, w = 4.5) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (name) {
    case 'heart': return `<path d="${HEART}" fill="${color}" fill-opacity=".85" ${o}/>`;
    case 'heartO': return `<path d="${HEART}" ${line(color)}/>`;
    case 'heartMini': return `<path d="${HEART}" fill="${color}" transform="scale(.62)"/>`;
    case 'tower': // three pastel hearts stacked, with a curly stem (as in hand-drawn journals)
      return `<g transform="scale(.6) translate(0,-8)">
        <path d="${HEART}" fill="#8fa58a" ${o} transform="translate(0,-42) scale(.62)"/>
        <path d="${HEART}" fill="#e0b08a" ${o} transform="translate(0,2) scale(.82)"/>
        <path d="${HEART}" fill="#8e4f5e" ${o} transform="translate(0,56) scale(1)"/>
        <path d="M0,96 C8,106 -4,114 8,124" ${line(ink, 3.4)}/></g>`;
    case 'sparkle': return `<path d="M0,-42 Q5,-5 42,0 Q5,5 0,42 Q-5,5 -42,0 Q-5,-5 0,-42Z" fill="${color}"/>`;
    case 'star': return `<path d="M0,-40 L12,-13 L41,-12 L18,7 L26,36 L0,19 L-26,36 L-18,7 L-41,-12 L-12,-13Z" ${line(color)}/>`;
    case 'flower': return `<circle r="17" ${line(color)}/><circle r="5" fill="${color}"/>
      <path d="M0,-30V-42 M26,-15L36,-21 M26,15L36,21 M0,30V42 M-26,15L-36,21 M-26,-15L-36,-21" ${line(color, 4)}/>`;
    case 'vine': return `<path d="M-4,46 C-10,20 18,12 8,-8 C2,-22 -14,-18 -10,-4" ${line(ink, 3)}/>
      <ellipse cx="14" cy="26" rx="9" ry="4.5" transform="rotate(-35 14 26)" fill="${color}" fill-opacity=".85" ${o}/>
      <ellipse cx="-14" cy="34" rx="9" ry="4.5" transform="rotate(30 -14 34)" fill="${color}" fill-opacity=".85" ${o}/>
      <ellipse cx="18" cy="-2" rx="8" ry="4" transform="rotate(-50 18 -2)" fill="${color}" fill-opacity=".85" ${o}/>
      <circle cx="-10" cy="-4" r="5.5" fill="${color}" ${o}/><circle cx="12" cy="-20" r="4.5" fill="${color}" ${o}/><circle cx="-18" cy="-18" r="3.5" fill="${color}" ${o}/>`;
    case 'dots': return [[-30, -20, 4], [-8, -34, 3], [22, -26, 5], [34, 4, 3.5], [10, 22, 4.5], [-26, 18, 3], [-4, 0, 2.5], [-38, 36, 3], [36, 34, 3]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`).join('');
    case 'plus': return `<path d="M0,-17V17M-17,0H17" ${line(color, 5.5)}/>`;
    case 'squiggle': return `<path d="M-46,0 q 11.5,-20 23,0 t 23,0 t 23,0 t 23,0" ${line(color, 5)}/>`;
    case 'swirl': return `<path d="M0,0 C6,-6 14,-2 12,6 C10,16 -4,18 -12,10 C-22,0 -16,-18 0,-22 C18,-26 34,-12 32,6" ${line(color, 4)}/>`;
    default: return '';
  }
}

// Preview for the stamp tray.
export function stampThumb(name, color, theme) {
  return `<svg viewBox="-55 -55 110 110" width="38" height="38">${stampInner(name, colorOf(color, theme), inkOf(theme))}</svg>`;
}

function rng(seed) { // tiny seeded PRNG so "hand-drawn" wobble is stable across redraws
  let a = 0;
  for (const c of seed) a = (a * 31 + c.charCodeAt(0)) | 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function smooth(pts) {
  if (pts.length < 3) return `M${pts[0][0]},${pts[0][1]}${pts.slice(1).map((p) => `L${p[0]},${p[1]}`).join('')}${pts.length === 1 ? 'h.01' : ''}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0]},${pts[i][1]} ${mx},${my}`;
  }
  const l = pts[pts.length - 1];
  return `${d}L${l[0]},${l[1]}`;
}

const f2 = (n) => Math.round(n * 100) / 100;

// Frame (border) around a block of text. `box` = {x,y,w,h} in px.
function frameSvg(d, box, u, ink, color, theme) {
  const r = rng(d.id);
  const pad = 0.4 * u;
  const x = box.x - pad, y = box.y - pad * 0.7, w = box.w + pad * 2, h = box.h + pad * 1.4;
  const rad = Math.min(h / 2, 0.9 * u);
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', `M${x + rad},${y} H${x + w - rad} A${rad},${rad} 0 0 1 ${x + w},${y + rad} V${y + h - rad} A${rad},${rad} 0 0 1 ${x + w - rad},${y + h} H${x + rad} A${rad},${rad} 0 0 1 ${x},${y + h - rad} V${y + rad} A${rad},${rad} 0 0 1 ${x + rad},${y}Z`);
  const total = path.getTotalLength();
  const col = colorOf(d.color, theme);
  const hit = `<path class="hit" d="${path.getAttribute('d')}" fill="none" stroke="transparent" stroke-width="18"/>`;
  let out = '';
  if (d.style === 'dash') {
    out += `<path d="${path.getAttribute('d')}" fill="none" stroke="${col}" stroke-width="${f2(0.1 * u)}" stroke-linecap="round" stroke-dasharray="${f2(0.45 * u)} ${f2(0.42 * u)}"/>`;
    for (const [px, py] of [[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
      out += `<g transform="translate(${f2(px)},${f2(py)}) scale(${f2(0.0035 * u)})">${stampInner('sparkle', col, ink)}</g>`;
  } else if (d.style === 'scallop') {
    const step = 0.46 * u;
    const n = Math.max(8, Math.round(total / step));
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((i / n) * total);
      out += `<circle cx="${f2(p.x + (r() - .5) * 1.2)}" cy="${f2(p.y + (r() - .5) * 1.2)}" r="${f2(0.2 * u)}" fill="none" stroke="${col}" stroke-width="${f2(0.075 * u)}"/>`;
    }
  } else { // hearts: hand-drawn outline with little hearts along it
    out += `<path d="${path.getAttribute('d')}" fill="none" stroke="${ink}" stroke-width="${f2(0.07 * u)}" stroke-opacity=".85" stroke-linecap="round" stroke-dasharray="${f2(0.9 * u)} ${f2(0.12 * u)}"/>`;
    const step = 1.05 * u;
    const n = Math.max(6, Math.round(total / step));
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength((i / n) * total);
      const rot = (r() - 0.5) * 30;
      out += `<g transform="translate(${f2(p.x)},${f2(p.y)}) rotate(${f2(rot)}) scale(${f2(0.0072 * u)})">${stampInner('heart', col, ink)}</g>`;
    }
  }
  return `<g data-did="${d.id}">${hit}${out}</g>`;
}

/**
 * Render one doodle to SVG markup.
 * @param ctx {ox, oy, u, theme, box?}  origin in px, px per unit
 */
export function doodleSvg(d, ctx) {
  const { ox, oy, u, theme } = ctx;
  const ink = inkOf(theme);
  const col = colorOf(d.color, theme);
  if (d.kind === 'stroke') {
    const pts = d.pts.map(([x, y]) => [f2(ox + x * u), f2(oy + y * u)]);
    const dd = smooth(pts);
    const marker = d.alpha < 1;
    const blend = marker && !isDark(theme) ? 'mix-blend-mode:multiply;' : '';
    return `<g data-did="${d.id}" style="${blend}"><path class="hit" d="${dd}" fill="none" stroke="transparent" stroke-width="${Math.max(18, d.w * u)}" stroke-linecap="round"/>
      <path d="${dd}" fill="none" stroke="${col}" stroke-opacity="${d.alpha ?? 1}" stroke-width="${f2(d.w * u)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  if (d.kind === 'stamp') {
    const s = (d.size * u) / 100;
    return `<g data-did="${d.id}" transform="translate(${f2(ox)},${f2(oy)}) rotate(${d.rot || 0}) scale(${f2(s)})">
      <circle class="hit" r="58" fill="transparent"/>${stampInner(d.stamp, col, ink)}</g>`;
  }
  if (d.kind === 'frame' && ctx.box) return frameSvg(d, ctx.box, u, ink, col, theme);
  return '';
}

const HIT_CSS = '.hit{pointer-events:none}.erasing .hit{pointer-events:all}';

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

function boxOf(range) {
  const rs = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  if (!rs.length) return null;
  const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top));
  const x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------- drawing onto the readers ----------
export function drawEpub(reader, doodles, { theme, erasing }) {
  if (!reader.rendition) return;
  const fs = reader.settings.fontSize;
  for (const contents of reader.rendition.getContents()) {
    const doc = contents.document;
    const svg = ensureLayer(doc, doc.documentElement, 'ur-doodles',
      'position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;z-index:40');
    svg.classList.toggle('erasing', !!erasing);
    let html = `<style>${HIT_CSS}</style>`;
    for (const d of doodles) {
      const a = d.anchor;
      if (a.type !== 'epub' || a.sec !== contents.sectionIndex) continue;
      try {
        const range = contents.range(a.cfi);
        if (!range) continue;
        if (d.kind === 'frame') {
          const box = boxOf(range);
          if (box) html += doodleSvg(d, { u: fs, theme, box });
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
    svg.innerHTML = `<style>${HIT_CSS}</style>` + list.map((d) => doodleSvg(d, { ox: d.anchor.x * W, oy: d.anchor.y * W, u: W, theme })).join('');
  });
}

export const drawDoodles = (reader, doodles, opts) => (reader?.kind === 'pdf' ? drawPdf : drawEpub)(reader, doodles, opts);

// ---------- anchoring: viewport point → stored doodle ----------
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

// Convert viewport points to an anchored doodle fragment: { anchor, rel(points) }.
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

export function simplify(pts, eps = 0.0025) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = out[out.length - 1];
    if (Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]) >= eps) out.push(pts[i]);
  }
  if (pts.length > 1) out.push(pts[pts.length - 1]);
  return out.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]);
}
