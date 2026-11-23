const dict = {
  en: {
    appName: 'Urdu Reader', addBooks: 'Add books', searchLibrary: 'Search library',
    emptyTitle: 'Your library is empty', emptyHint: 'Add EPUB or PDF books. You can also drag and drop files here.',
    dropHere: 'Drop books to add them', contents: 'Contents', bookmarks: 'Bookmarks',
    searchBook: 'Search in book', display: 'Display', font: 'Font', fontSize: 'Text size',
    lineHeight: 'Line spacing', theme: 'Theme', layout: 'Layout', paged: 'Pages', scroll: 'Scroll',
    direction: 'Direction', auto: 'Auto', rtl: 'Right-to-left', ltr: 'Left-to-right',
    light: 'Light', sepia: 'Sepia', dark: 'Dark', black: 'Black',
    nastaliq: 'Nastaliq (نستعلیق)', naskh: 'Naskh (نسخ)', amiri: 'Amiri (امیری)', system: 'System',
    pdfNote: 'Font and spacing apply to EPUB books. PDFs keep their original look.',
    pdfZoom: 'Zoom', reading: 'Reading', done: 'Finished', newBook: 'New', page: 'Page',
    imported: 'Added', duplicate: 'Already in library', unsupported: 'Unsupported file', failed: 'Could not open this file',
    remove: 'Remove', confirmRemove: 'Remove this book from your device?', noResults: 'No results',
    noMarks: 'No bookmarks yet', noToc: 'No table of contents', bookmarkAdded: 'Bookmark added', bookmarkRemoved: 'Bookmark removed',
    pdfSearchNote: 'Search only works on PDFs that contain real text. Scanned or image-based PDFs cannot be searched.', opening: 'Opening…', searching: 'Searching…', of: 'of', location: 'Location',
  },
  ur: {
    appName: 'اردو ریڈر', addBooks: 'کتابیں شامل کریں', searchLibrary: 'لائبریری میں تلاش کریں',
    emptyTitle: 'آپ کی لائبریری خالی ہے', emptyHint: 'EPUB یا PDF کتابیں شامل کریں۔ آپ فائلیں یہاں گھسیٹ کر بھی چھوڑ سکتے ہیں۔',
    dropHere: 'کتابیں شامل کرنے کے لیے یہاں چھوڑیں', contents: 'فہرست', bookmarks: 'نشانیاں',
    searchBook: 'کتاب میں تلاش کریں', display: 'ظاہری شکل', font: 'فونٹ', fontSize: 'حرف کا سائز',
    lineHeight: 'سطروں کا فاصلہ', theme: 'تھیم', layout: 'ترتیب', paged: 'صفحات', scroll: 'اسکرول',
    direction: 'سمت', auto: 'خودکار', rtl: 'دائیں سے بائیں', ltr: 'بائیں سے دائیں',
    light: 'روشن', sepia: 'سیپیا', dark: 'تاریک', black: 'سیاہ',
    nastaliq: 'نستعلیق', naskh: 'نسخ', amiri: 'امیری', system: 'سسٹم',
    pdfNote: 'فونٹ اور فاصلہ صرف EPUB کتابوں پر لاگو ہوتے ہیں۔ PDF اپنی اصل شکل میں رہتی ہے۔',
    pdfZoom: 'زوم', reading: 'زیرِ مطالعہ', done: 'مکمل', newBook: 'نئی', page: 'صفحہ',
    imported: 'شامل ہو گئی', duplicate: 'پہلے سے لائبریری میں موجود ہے', unsupported: 'غیر تعاون یافتہ فائل', failed: 'یہ فائل نہیں کھل سکی',
    remove: 'ہٹائیں', confirmRemove: 'اس کتاب کو اپنے آلے سے ہٹا دیں؟', noResults: 'کوئی نتیجہ نہیں ملا',
    noMarks: 'ابھی کوئی نشانی نہیں', noToc: 'فہرست دستیاب نہیں', bookmarkAdded: 'نشانی لگا دی گئی', bookmarkRemoved: 'نشانی ہٹا دی گئی',
    pdfSearchNote: 'تلاش صرف ان PDF میں کام کرتی ہے جن میں اصل متن موجود ہو۔ اسکین شدہ یا تصویری PDF میں تلاش ممکن نہیں۔', opening: 'کھل رہی ہے…', searching: 'تلاش جاری ہے…', of: 'از', location: 'مقام',
  },
};

let lang = 'en';
try { lang = localStorage.getItem('ui-lang') || (navigator.language?.startsWith('ur') ? 'ur' : 'en'); } catch {}

export const getLang = () => lang;
export const t = (k) => dict[lang][k] ?? dict.en[k] ?? k;

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('ui-lang', l); } catch {}
  applyI18n();
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  const tg = document.getElementById('lang-toggle');
  if (tg) tg.textContent = lang === 'ur' ? 'English' : 'اردو';
}
