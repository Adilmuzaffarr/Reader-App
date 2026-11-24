import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { THEMES } from './epub-reader.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Continuous-scroll PDF viewer with lazy page rendering.
export class PdfReader {
  constructor(el, { onProgress, onTap }) {
    this.el = el;
    this.onProgress = onProgress;
    this.onTap = onTap;
    this.kind = 'pdf';
    this.zoom = 1;
    this.rendered = new Map();
  }

  async open(blob, { settings, location, rtl }) {
    this.settings = settings;
    this.task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
    this.pdf = await this.task.promise;
    const info = (await this.pdf.getMetadata().catch(() => null))?.info || {};
    this.meta = { title: info.Title, author: info.Author };
    this.pages = this.pdf.numPages;
    this.page1 = await this.pdf.getPage(1);
    this.rtl = rtl === 'rtl' ? true : rtl === 'ltr' ? false : await this.detectRtl();
    this.outline = await this.pdf.getOutline().catch(() => null);

    this.scroller = document.createElement('div');
    this.scroller.className = 'pdf-scroll';
    this.el.innerHTML = '';
    this.el.appendChild(this.scroller);
    this.build();
    this.applySettings(settings);
    await this.loadToc();

    this.scroller.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.scroller.addEventListener('click', (e) => {
      const x = e.clientX / window.innerWidth;
      this.onTap(x < 0.28 ? 'left' : x > 0.72 ? 'right' : 'center');
    });
    window.addEventListener('resize', this.onResize = () => this.relayout());
    if (location) this.goTo(Number(location));
    else this.update();
  }

  async detectRtl() {
    let ar = 0, la = 0;
    for (let i = 1; i <= Math.min(4, this.pages) && ar + la < 300; i++) {
      try {
        const txt = (await (await this.pdf.getPage(i)).getTextContent()).items.map((x) => x.str).join(' ');
        ar += (txt.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
        la += (txt.match(/[A-Za-z]/g) || []).length;
      } catch { /* ignore */ }
    }
    return ar > la;
  }

  fitWidth() {
    const base = this.page1.getViewport({ scale: 1 });
    const w = Math.min(this.scroller.clientWidth - 16, 1100);
    return (w / base.width) * this.zoom;
  }

  build() {
    this.scroller.innerHTML = '';
    this.holders = [];
    const vp = this.page1.getViewport({ scale: this.fitWidth() });
    for (let i = 1; i <= this.pages; i++) {
      const h = document.createElement('div');
      h.className = 'pdf-page';
      h.dataset.page = i;
      h.style.width = `${vp.width}px`;
      h.style.height = `${vp.height}px`;
      this.scroller.appendChild(h);
      this.holders.push(h);
    }
    this.rendered.clear();
    setTimeout(() => this.onLayout?.(), 0);
  }

  relayout() {
    const page = this.currentPage || 1;
    this.build();
    this.goTo(page);
  }

  setZoom(z) { this.zoom = z; this.relayout(); }

  applySettings(s) {
    this.settings = s;
    const th = THEMES[s.theme] || THEMES.light;
    this.scroller.style.background = s.theme === 'light' ? '#e9e6df' : th.bg;
    // Invert colours for dark themes; hue-rotate keeps images looking natural.
    this.scroller.classList.toggle('pdf-dark', s.theme === 'dark' || s.theme === 'black');
    this.scroller.classList.toggle('pdf-sepia', s.theme === 'sepia');
  }

  onScroll() {
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.update());
  }

  update() {
    const mid = this.scroller.scrollTop + this.scroller.clientHeight * 0.35;
    let cur = 1;
    for (const h of this.holders) { if (h.offsetTop <= mid) cur = +h.dataset.page; else break; }
    this.currentPage = cur;
    // render window around the current page, free memory elsewhere
    for (let i = 1; i <= this.pages; i++) {
      if (Math.abs(i - cur) <= 2) this.renderPage(i);
      else if (this.rendered.has(i)) this.release(i);
    }
    this.onProgress({
      location: String(cur),
      pct: this.pages > 1 ? (cur - 1) / (this.pages - 1) : 1,
      label: `${cur} / ${this.pages}`,
      chapter: '',
    });
  }

  async renderPage(n) {
    if (this.rendered.has(n)) return;
    const token = {};
    this.rendered.set(n, token);
    const holder = this.holders[n - 1];
    try {
      const page = await this.pdf.getPage(n);
      const vp = page.getViewport({ scale: this.fitWidth() });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
      token.task = task;
      await task.promise;
      if (this.rendered.get(n) !== token) return; // released meanwhile
      holder.style.width = `${vp.width}px`;
      holder.style.height = `${vp.height}px`;
      holder.querySelector('canvas')?.remove();
      holder.prepend(canvas);
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') this.rendered.delete(n);
    }
  }

  release(n) {
    this.rendered.get(n)?.task?.cancel();
    this.rendered.delete(n);
    this.holders[n - 1]?.querySelector('canvas')?.remove();
  }

  next() { this.goTo((this.currentPage || 1) + 1); }
  prev() { this.goTo((this.currentPage || 1) - 1); }
  step(side) { (side === 'left') === this.rtl ? this.next() : this.prev(); }

  goTo(target) {
    const n = typeof target === 'number' ? target : Number(target);
    const h = this.holders[Math.min(this.pages, Math.max(1, n)) - 1];
    if (h) { this.scroller.scrollTop = h.offsetTop - 8; this.update(); }
  }

  seek(frac) { this.goTo(Math.round(frac * (this.pages - 1)) + 1); }

  async resolveDest(dest) {
    const d = typeof dest === 'string' ? await this.pdf.getDestination(dest) : dest;
    if (!d) return null;
    return (await this.pdf.getPageIndex(d[0])) + 1;
  }

  tocItems() { return this._toc || []; }
  async loadToc() {
    const out = [];
    const walk = async (items, depth) => {
      for (const it of items || []) {
        try { out.push({ label: it.title.trim(), target: await this.resolveDest(it.dest), depth }); } catch { /* skip */ }
        await walk(it.items, depth + 1);
      }
    };
    await walk(this.outline, 0);
    this._toc = out.filter((i) => i.target);
  }

  async search(q) {
    const out = [];
    const norm = (x) => x.normalize('NFKC').replace(/[\u0000\u200c\u200d\u064b-\u065f\u0670]/g, '').replace(/\s+/g, ' ').toLowerCase();
    const needle = norm(q);
    for (let i = 1; i <= this.pages && out.length < 200; i++) {
      const page = await this.pdf.getPage(i);
      const text = norm((await page.getTextContent()).items.map((x) => x.str).join(' '));
      const at = text.indexOf(needle);
      if (at >= 0) out.push({ label: `${i} — …${text.slice(Math.max(0, at - 30), at + 60)}…`, target: i });
    }
    return out;
  }

  cfiNow() { return String(this.currentPage || 1); }
  onKey(e) {
    if (e.key === 'ArrowLeft') this.step('left');
    else if (e.key === 'ArrowRight') this.step('right');
  }
  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.holders?.forEach((_, i) => this.rendered.get(i + 1)?.task?.cancel());
    this.task?.destroy();
  }
}

// First-page thumbnail for the library.
export async function pdfCover(blob) {
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: 360 / base.width });
  const c = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  const meta = (await pdf.getMetadata().catch(() => null))?.info || {};
  const cover = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
  const pages = pdf.numPages;
  task.destroy();
  return { cover, title: meta.Title, author: meta.Author, pages };
}
