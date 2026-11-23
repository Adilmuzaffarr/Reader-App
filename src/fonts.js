// Fonts are bundled so they work offline, and are also injected into EPUB iframes.
import nq4 from '@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-400-normal.woff2?url';
import nq7 from '@fontsource/noto-nastaliq-urdu/files/noto-nastaliq-urdu-arabic-700-normal.woff2?url';
import nk4 from '@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2?url';
import nk7 from '@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff2?url';
import am4 from '@fontsource/amiri/files/amiri-arabic-400-normal.woff2?url';
import am7 from '@fontsource/amiri/files/amiri-arabic-700-normal.woff2?url';

const abs = (u) => new URL(u, document.baseURI).href;

export const FONTS = {
  nastaliq: { stack: "'UR Nastaliq', 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif", lh: 2.4 },
  naskh: { stack: "'UR Naskh', 'Noto Naskh Arabic', 'Geeza Pro', serif", lh: 1.9 },
  amiri: { stack: "'UR Amiri', 'Amiri', serif", lh: 1.9 },
  system: { stack: "system-ui, 'Segoe UI', Tahoma, sans-serif", lh: 1.8 },
};

const face = (family, url, weight) =>
  `@font-face{font-family:'${family}';src:url('${abs(url)}') format('woff2');font-weight:${weight};font-display:swap;}`;

// CSS for @font-face rules, with absolute URLs (iframes can't resolve relative ones).
export const fontFaceCss = () => [
  face('UR Nastaliq', nq4, 400), face('UR Nastaliq', nq7, 700),
  face('UR Naskh', nk4, 400), face('UR Naskh', nk7, 700),
  face('UR Amiri', am4, 400), face('UR Amiri', am7, 700),
].join('\n');

// Register fonts in the main document too.
const st = document.createElement('style');
st.textContent = fontFaceCss();
document.head.appendChild(st);
