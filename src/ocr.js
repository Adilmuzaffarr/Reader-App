// On-device OCR (Tesseract, Urdu model). Loaded lazily; assets are served locally.
const abs = (p) => new URL(p, document.baseURI).href;

export async function createOcrWorker(onStatus) {
  const { createWorker } = await import('tesseract.js');
  // Urdu only: adding the English model made Urdu headings noticeably worse in testing.
  return createWorker('urd', 1, {
    workerPath: abs('ocr/worker.min.js'),
    corePath: abs('ocr/core'),
    langPath: abs('ocr/lang'),
    gzip: true,
    logger: (m) => onStatus?.(m),
  });
}

const abortErr = () => Object.assign(new Error('aborted'), { name: 'AbortError', code: 'aborted' });

// Renders each PDF page to a canvas and recognises it. Returns pages shaped like the
// text-layer path: { lines: [{ text, y, h, w }] } with y growing upwards.
export async function ocrPdfPages(pdf, { onProgress, signal }) {
  onProgress(0, 'load');
  const worker = await createOcrWorker((m) => {
    if (/load|init/.test(m.status || '')) onProgress(0, 'load');
  });
  try {
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      if (signal?.aborted) throw abortErr();
      const page = await pdf.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, Math.max(1.2, 1900 / base.width));
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const raw = data.lines || data.blocks?.flatMap((b) => b.paragraphs.flatMap((q) => q.lines)) || [];
      const lines = raw
        .map((l) => ({ text: (l.text || '').replace(/\s+/g, ' ').trim(), conf: l.confidence ?? 100, b: l.bbox }))
        .filter((l) => l.text && !(l.conf < 25 && l.text.length < 6))
        .map((l) => ({ text: l.text, y: -l.b.y0 / scale, h: (l.b.y1 - l.b.y0) / scale, w: (l.b.x1 - l.b.x0) / scale }))
        .sort((a, b) => b.y - a.y);
      pages.push({ lines });
      canvas.width = canvas.height = 0; // free memory
      onProgress(p / pdf.numPages * 0.6, 'ocr');
    }
    return pages;
  } finally {
    await worker.terminate();
  }
}
