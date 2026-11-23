import ePub from 'epubjs';
import { FONTS, fontFaceCss } from './fonts.js';

const RTL_LANGS = /^(ur|ar|fa|ps|sd|ug|he|yi|ckb|ks)\b/i;
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;

export class EpubReader {
  constructor(el, { onProgress, onTap, onSelect, onHighlight }) {
    this.onSelect = onSelect || (() => {});
    this.onHighlight = onHighlight || (() => {});
    this.el = el;
    this.onProgress = onProgress;
    this.onTap = onTap;
    this.kind = 'epub';
  }

  async open(blob, { settings, location, rtl, annots }) {
    this.settings = settings;
    this.annots = annots || [];
    this.book = ePub(await blob.arrayBuffer());
    await this.book.ready;
    const meta = this.book.packaging?.metadata || {};
    this.meta = { title: meta.title, author: meta.creator, language: meta.language };
    this.rtl = rtl === 'rtl' ? true : rtl === 'ltr' ? false : await this.detectRtl(meta);
    this.cover = await this.book.coverUrl().catch(() => null);

    this.toc = await this.book.loaded.navigation.then((n) => n.toc).catch(() => []);
    this.render(location);

    // Page numbers / percentages need "locations"; generate in the background.
    this.book.locations.generate(1500).then(() => {
      this.ready = true;
      if (this.current) this.emit(this.current);
    });
  }

  async detectRtl(meta) {
    if (meta.direction === 'rtl' || RTL_LANGS.test(meta.language || '')) return true;
    if (meta.direction === 'ltr') return false;
    // Fall back to sampling the text of the first chapters.
    let ar = 0, la = 0;
    for (let i = 0; i < Math.min(5, this.book.spine.length) && ar + la < 300; i++) {
      try {
        const doc = await this.book.spine.get(i).load(this.book.load.bind(this.book));
        const txt = doc.body?.textContent || '';
        ar += (txt.match(ARABIC) || []).length;
        la += (txt.match(LATIN) || []).length;
      } catch { /* ignore */ }
    }
    return ar > la;
  }

  render(location) {
    this.el.innerHTML = '';
    const scroll = this.settings.layout === 'scroll';
    this.rendition = this.book.renderTo(this.el, {
      width: '100%',
      height: '100%',
      flow: scroll ? 'scrolled-doc' : 'paginated',
      spread: scroll || this.settings.spread === 'single' ? 'none' : 'auto',
      minSpreadWidth: 900,
      manager: 'default',
      defaultDirection: this.rtl ? 'rtl' : 'ltr',
      allowScriptedContent: false,
    });
    if (this.rtl && !scroll) this.rendition.direction?.('rtl');

    this.rendition.hooks.content.register((contents) => {
      const d = contents.document;
      const style = d.createElement('style');
      style.id = 'ur-style';
      d.head.appendChild(style);
      style.textContent = this.css();
      this.bindInput(contents);
    });

    this.rendition.on('selected', (cfiRange, contents) => {
      const range = contents.range(cfiRange);
      const r = range.getBoundingClientRect();
      const f = contents.document.defaultView.frameElement.getBoundingClientRect();
      this.onSelect({
        cfiRange, contents, text: range.toString().trim(),
        rect: { left: f.left + r.left, right: f.left + r.right, top: f.top + r.top, bottom: f.top + r.bottom },
      });
    });
    this.rendition.on('relocated', (loc) => {
      this.onSelect(null);
      this.current = loc;
      this.emit(loc);
    });
    this.rendition.display(location || undefined);
    this.setHighlights(this.annots || []);
  }

  css() {
    const s = this.settings;
    const th = THEMES[s.theme] || THEMES.light;
    const f = FONTS[s.font] || FONTS.nastaliq;
    return `${fontFaceCss()}
html{font-size:${s.fontSize}px !important;background:${th.bg} !important;}
body{background:${th.bg} !important;color:${th.fg} !important;
  font-family:${f.stack} !important;line-height:${s.lineHeight} !important;
  font-size:1rem !important;
  ${this.rtl ? 'direction:rtl !important;text-align:justify !important;' : ''}
  -webkit-text-size-adjust:none;}
body *:not(code):not(pre):not(svg):not(svg *){font-family:inherit !important;line-height:inherit !important;color:inherit !important;}
p,li,div,span,blockquote,td,th,dd,dt{font-size:1em !important;}
a,a *{color:${th.link} !important;}
img,svg,video{max-width:100% !important;height:auto;}
img{${th.img}}
::selection{background:${th.sel};}`;
  }

  hlStyle() {
    const dark = this.settings.theme === 'dark' || this.settings.theme === 'black';
    return { 'fill-opacity': dark ? '0.4' : '0.55', 'mix-blend-mode': dark ? 'normal' : 'multiply' };
  }

  // Colours are tuned per theme so highlights stay legible in light, sepia and dark.
  setHighlights(list) {
    this.annots = list;
    if (!this.rendition) return;
    for (const a of this.drawn || []) this.rendition.annotations.remove(a, 'highlight');
    this.drawn = [];
    const pal = HL[this.settings.theme] || HL.light;
    for (const a of list) {
      this.rendition.annotations.highlight(a.cfi, { id: a.id }, (e) => this.onHighlight(a.id, e), 'ur-hl', { fill: pal[a.color] || pal.yellow, ...this.hlStyle() });
      this.drawn.push(a.cfi);
    }
  }

  pctOf(cfi) { return this.ready ? this.book.locations.percentageFromCfi(cfi) : null; }

  applySettings(s) {
    const retint = this.settings.theme !== s.theme;
    this.settings = s;
    if (retint) this.setHighlights(this.annots || []);
    this.rendition?.getContents().forEach((c) => {
      const el = c.document.getElementById('ur-style');
      if (el) el.textContent = this.css();
    });
    this.rendition?.resize?.();
  }

  // Taps (left/centre/right zones), swipes and keys inside the iframe.
  bindInput(contents) {
    const d = contents.document;
    const frame = () => d.defaultView.frameElement?.getBoundingClientRect() || { left: 0 };
    let sx = 0, sy = 0, st = 0, moved = false;
    d.addEventListener('touchstart', (e) => {
      const p = e.changedTouches[0]; sx = p.clientX; sy = p.clientY; st = Date.now(); moved = false;
    }, { passive: true });
    d.addEventListener('touchend', (e) => {
      const p = e.changedTouches[0];
      const dx = p.clientX - sx, dy = p.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st < 700 && this.settings.layout !== 'scroll') {
        moved = true;
        // swipe right→left reveals the next page in RTL books, as with paper
        const forward = this.rtl ? dx > 0 : dx < 0;
        forward ? this.next() : this.prev();
      }
    }, { passive: true });
    d.addEventListener('click', (e) => {
      if (moved) { moved = false; return; }
      if (d.getSelection()?.toString()) return;
      if (e.target.closest?.('a[href]')) return;
      this.onSelect(null);
      const x = (frame().left + e.clientX) / window.innerWidth;
      this.onTap(x < 0.28 ? 'left' : x > 0.72 ? 'right' : 'center');
    });
    d.addEventListener('keydown', (e) => this.onKey(e));
  }

  onKey(e) {
    if (e.key === 'ArrowLeft') this.rtl ? this.next() : this.prev();
    else if (e.key === 'ArrowRight') this.rtl ? this.prev() : this.next();
    else if (e.key === 'PageDown' || e.key === ' ') this.next();
    else if (e.key === 'PageUp') this.prev();
  }

  next() { return this.rendition.next(); }
  prev() { return this.rendition.prev(); }
  goTo(target) { return this.rendition.display(target); }
  // physical left/right → logical next/prev, for tap zones
  step(side) { (side === 'left') === this.rtl ? this.next() : this.prev(); }

  emit(loc) {
    const cfi = loc.start?.cfi;
    let pct = null, label = '';
    if (this.ready && cfi) {
      pct = this.book.locations.percentageFromCfi(cfi);
      const idx = this.book.locations.locationFromCfi(cfi);
      label = `${(idx ?? 0) + 1} / ${this.book.locations.length()}`;
    } else if (loc.start?.index != null) {
      pct = loc.start.index / Math.max(1, this.book.spine.length - 1);
    }
    const chapter = this.chapterAt(loc.start?.href);
    this.onProgress({ location: cfi, pct, label, chapter });
  }

  chapterAt(href) {
    if (!href) return '';
    const clean = (h) => h.split('#')[0];
    const flat = (items) => items.flatMap((i) => [i, ...flat(i.subitems || [])]);
    const hit = flat(this.toc).filter((i) => clean(i.href) === clean(href)).pop();
    return hit?.label?.trim() || '';
  }

  seek(frac) {
    if (!this.ready) return;
    const cfi = this.book.locations.cfiFromPercentage(Math.min(0.9999, Math.max(0, frac)));
    this.goTo(cfi);
  }

  tocItems() {
    const walk = (items, depth = 0) => items.flatMap((i) => [
      { label: i.label.trim(), target: i.href, depth }, ...walk(i.subitems || [], depth + 1)]);
    return walk(this.toc);
  }

  async search(q) {
    const out = [];
    const items = [];
    this.book.spine.each((it) => items.push(it));
    for (const item of items) {
      try {
        await item.load(this.book.load.bind(this.book));
        out.push(...item.find(q).slice(0, 20).map((r) => ({ label: r.excerpt.trim(), target: r.cfi })));
      } catch { /* ignore */ }
      item.unload();
      if (out.length > 200) break;
    }
    return out;
  }

  cfiNow() { return this.current?.start?.cfi; }
  destroy() { try { this.rendition?.destroy(); this.book?.destroy(); } catch { /* ignore */ } }
}

export const THEMES = {
  light: { bg: '#ffffff', fg: '#1c1c1c', link: '#0b6b55', sel: '#bfe6d9', img: '' },
  sepia: { bg: '#f4ecd8', fg: '#4b3a26', link: '#8a4b12', sel: '#e6d3a8', img: 'mix-blend-mode:multiply;' },
  dark: { bg: '#1d2126', fg: '#d8d4cc', link: '#7fd0b5', sel: '#2f5a4c', img: 'filter:brightness(.85);' },
  black: { bg: '#000000', fg: '#c9c5bd', link: '#7fd0b5', sel: '#244a3d', img: 'filter:brightness(.8);' },
};

// Highlight palette per theme (same five hues, retuned for each background).
export const HL = {
  light: { yellow: '#ffd54f', green: '#81c784', blue: '#64b5f6', pink: '#f48fb1', purple: '#b39ddb' },
  sepia: { yellow: '#f2b83c', green: '#7fb069', blue: '#6fa3d8', pink: '#e68aa0', purple: '#a58bd0' },
  dark: { yellow: '#d9b23a', green: '#48a868', blue: '#4a8fd6', pink: '#d4608c', purple: '#8a6fd4' },
  black: { yellow: '#d9b23a', green: '#48a868', blue: '#4a8fd6', pink: '#d4608c', purple: '#8a6fd4' },
};
export const HL_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'];
