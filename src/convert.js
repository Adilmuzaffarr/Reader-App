// PDF → EPUB: rebuilds reflowable text from a PDF's text layer (RTL aware).
import JSZip from 'jszip';
import './pdf-reader.js'; // sets up the pdf.js worker
import * as pdfjs from 'pdfjs-dist';

const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g;
const PRES = /[ﭐ-﷿ﹰ-﻿]+/g;
const END = /[۔.!؟?:؛"”»)]\s*$/;
const DIGITS = /[0-9٠-٩۰-۹]+/g;
const tick = () => new Promise((r) => setTimeout(r));
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const esc = (s) => s.replace(CTRL, '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function pdfToEpub(blob, { title, author, lang, onProgress = () => {} }) {
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const pdf = await task.promise;
  const n = pdf.numPages;
  let chars = 0, bad = 0, ar = 0, la = 0;
  const pages = [];

  // 1. read every page into visual lines
  for (let p = 1; p <= n; p++) {
    const page = await pdf.getPage(p);
    const items = [];
    for (const i of (await page.getTextContent()).items) {
      if (!i.str) continue;
      chars += i.str.length;
      bad += (i.str.match(CTRL) || []).length;
      ar += (i.str.match(AR) || []).length;
      la += (i.str.match(/[A-Za-z]/g) || []).length;
      const s = i.str.replace(CTRL, '').replace(PRES, (m) => m.normalize('NFKC'));
      if (s) items.push({ s, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height || 10 });
    }
    pages.push({ items, width: page.getViewport({ scale: 1 }).width });
    onProgress(p / n * 0.6);
    if (p % 3 === 0) await tick();
  }

  if (chars < 15 * n || bad / Math.max(1, chars) > 0.2) {
    task.destroy();
    throw Object.assign(new Error('no-text'), { code: 'noText' });
  }
  const rtl = ar > la;
  const labels = rtl ? { start: 'آغاز', pages: 'صفحات', contents: 'فہرست' } : { start: 'Start', pages: 'Pages', contents: 'Contents' };

  // 2. items → lines (reading order)
  for (const pg of pages) {
    const its = pg.items.sort((a, b) => b.y - a.y);
    const lines = [];
    for (const it of its) {
      const L = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(2, 0.45 * Math.min(l.h, it.h)));
      if (L) { L.items.push(it); L.h = Math.max(L.h, it.h); } else lines.push({ y: it.y, h: it.h, items: [it] });
    }
    pg.lines = lines.map((l) => {
      l.items.sort((a, b) => (rtl ? b.x - a.x : a.x - b.x));
      let text = '';
      let prev = null;
      for (const it of l.items) {
        if (prev) {
          const gap = rtl ? prev.x - (it.x + it.w) : it.x - (prev.x + prev.w);
          if (gap > 0.12 * l.h && !/\s$/.test(text) && !/^\s/.test(it.s)) text += ' ';
        }
        text += it.s; prev = it;
      }
      const x0 = Math.min(...l.items.map((i) => i.x)), x1 = Math.max(...l.items.map((i) => i.x + i.w));
      return { text: text.replace(/\s+/g, ' ').trim(), y: l.y, h: l.h, w: x1 - x0 };
    }).filter((l) => l.text).sort((a, b) => b.y - a.y);
  }

  // 3. strip running headers/footers and bare page numbers
  const key = (t) => t.replace(DIGITS, '#').trim();
  const freq = new Map();
  for (const pg of pages) {
    new Set([...pg.lines.slice(0, 2), ...pg.lines.slice(-2)].map((l) => key(l.text))).forEach((k) => freq.set(k, (freq.get(k) || 0) + 1));
  }
  for (const pg of pages) {
    const edge = new Set([...pg.lines.slice(0, 2), ...pg.lines.slice(-2)]);
    pg.lines = pg.lines.filter((l) => {
      if (!edge.has(l)) return true;
      const k = key(l.text);
      return !(k === '#' || (n >= 4 && (freq.get(k) || 0) >= 0.4 * n));
    });
  }

  // 4. lines → paragraphs & headings
  const mh = median(pages.flatMap((p) => p.lines.map((l) => l.h)));
  const blocks = []; // {type:'p'|'h', text, h, page}
  let cur = null;
  const flush = () => { if (cur) blocks.push(cur); cur = null; };
  pages.forEach((pg, pi) => {
    const maxW = Math.max(1, ...pg.lines.map((l) => l.w));
    const gaps = pg.lines.slice(1).map((l, i) => pg.lines[i].y - l.y).filter((g) => g > 0);
    const lead = median(gaps) || mh * 1.3;
    pg.lines.forEach((l, i) => {
      const isHead = l.h >= mh * 1.35 && l.text.length <= 120;
      const prev = pg.lines[i - 1];
      if (isHead) {
        if (cur?.type === 'h' && Math.abs(cur.h - l.h) < 1) cur.text += ' ' + l.text;
        else { flush(); cur = { type: 'h', text: l.text, h: l.h, page: pi + 1 }; }
        return;
      }
      const newPara = !cur || cur.type === 'h'
        || (prev && (prev.y - l.y > 1.55 * lead || prev.w < 0.55 * maxW))
        || (!prev && END.test(cur.text));
      if (newPara) { flush(); cur = { type: 'p', text: l.text, page: pi + 1 }; }
      else cur.text += ' ' + l.text;
    });
  });
  flush();

  // 5. chapters: split on the largest headings, otherwise every 8 pages
  const heads = blocks.filter((b) => b.type === 'h');
  const top = Math.max(0, ...heads.map((h) => h.h));
  const isChap = (b) => b.type === 'h' && b.h >= top * 0.85;
  let sections = [];
  if (blocks.filter(isChap).length >= 2) {
    for (const b of blocks) {
      if (isChap(b) || !sections.length) sections.push({ title: isChap(b) ? b.text : labels.start, blocks: [] });
      if (!isChap(b)) sections.at(-1).blocks.push(b);
    }
  } else {
    for (const b of blocks) {
      const idx = Math.floor((b.page - 1) / 8);
      if (!sections[idx] && sections.length <= idx) {
        while (sections.length <= idx) sections.push({ title: `${labels.pages} ${sections.length * 8 + 1}–${Math.min(n, sections.length * 8 + 8)}`, blocks: [] });
      }
      sections[idx].blocks.push(b);
    }
    sections = sections.filter((s) => s.blocks.length);
  }
  onProgress(0.7);

  // 6. cover = first page
  let cover = null;
  try {
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 600 / page.getViewport({ scale: 1 }).width });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    cover = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
  } catch { /* optional */ }
  task.destroy();

  // 7. package
  const language = lang || (rtl ? 'ur' : 'en');
  const dir = rtl ? 'rtl' : 'ltr';
  const id = 'urn:uuid:' + crypto.randomUUID();
  const xhtml = (t, body) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${language}" xml:lang="${language}" dir="${dir}">
<head><meta charset="utf-8"/><title>${esc(t)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body dir="${dir}">${body}</body></html>`;

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file('OEBPS/style.css', `body{direction:${dir};text-align:${rtl ? 'justify' : 'left'};line-height:1.9;margin:0 .5em}
h1,h2{text-align:center;line-height:1.6;margin:1.2em 0 .8em}h1{font-size:1.6em}h2{font-size:1.3em}p{margin:0 0 .9em}`);
  sections.forEach((s, i) => {
    const body = (i === 0 && s.title === labels.start ? '' : `<h1>${esc(s.title)}</h1>`) +
      s.blocks.map((b) => b.type === 'h' ? `<h2>${esc(b.text)}</h2>` : `<p>${esc(b.text)}</p>`).join('\n');
    zip.file(`OEBPS/s${i + 1}.xhtml`, xhtml(s.title, body));
  });
  zip.file('OEBPS/nav.xhtml', xhtml(labels.contents, `<nav epub:type="toc"><h1>${esc(labels.contents)}</h1><ol>${sections.map((s, i) => `<li><a href="s${i + 1}.xhtml">${esc(s.title)}</a></li>`).join('')}</ol></nav>`));
  zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${id}"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${sections.map((s, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(s.title)}</text></navLabel><content src="s${i + 1}.xhtml"/></navPoint>`).join('')}</navMap></ncx>`);
  if (cover) zip.file('OEBPS/cover.jpg', cover);
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${id}</dc:identifier><dc:title>${esc(title)}</dc:title>${author ? `<dc:creator>${esc(author)}</dc:creator>` : ''}<dc:language>${language}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z/, 'Z')}</meta></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${cover ? '<item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>' : ''}${sections.map((_, i) => `<item id="s${i + 1}" href="s${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest>
<spine toc="ncx" page-progression-direction="${dir}">${sections.map((_, i) => `<itemref idref="s${i + 1}"/>`).join('')}</spine></package>`);

  const out = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' }, (m) => onProgress(0.7 + m.percent / 100 * 0.3));
  return { blob: out, sections: sections.length, pages: n, rtl };
}
