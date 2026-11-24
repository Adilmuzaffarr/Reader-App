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
    all: 'All', unread: 'Unread', sortRecent: 'Recently read', sortAdded: 'Recently added', sortTitle: 'Title',
    category: 'Category', setCategory: 'Shelf / category', categoryHint: 'Shelf name (e.g. Poetry, Novels)', save: 'Save', cancel: 'Cancel', delete: 'Delete',
    notes: 'Notes', noNotes: 'Select text in the book to highlight it or add a note.', exportNotes: 'Export notes', copyNotes: 'Copy notes', copied: 'Copied',
    addNote: 'Add note', editNote: 'Note', dictionary: 'Dictionary', findInBook: 'Search in book', copy: 'Copy', highlightsN: 'highlights',
    margin: 'Margins', spread: 'Two-page spread (wide screens)', on: 'Auto', off: 'Single page',
    convertEpub: 'Convert to EPUB', converting: 'Converting', converted: 'Converted to EPUB', convertHint: 'Rebuilds the text as a reflowable EPUB so you can change fonts and use highlights and notes. Works only for PDFs with real text.',
    noText: 'This PDF has no readable text (it is scanned, or uses a custom Urdu font encoding), so it cannot be converted without OCR.',
    pdfNotesHint: 'Highlights and notes work in EPUB books. Convert this PDF to EPUB to use them.', convertedFrom: 'EPUB copy',
    ago: 'Read', never: '', lastRead: 'Read',
    ocrOffer: 'This PDF has no readable text layer (it is scanned or uses a special font encoding).\n\nRun OCR (text recognition) instead? It runs on your device and can take a while for long books. Printed Naskh text recognises well; Nastaliq and poor scans will contain errors, so check the result.',
    ocrLoading: 'Loading Urdu recognition data…', ocrRunning: 'Recognising text', ocrDone: 'Converted with OCR — please proofread, errors are possible',
    ocrEmpty: 'OCR could not find any text in this PDF.', convertOcr: 'Convert with OCR', cancelled: 'Cancelled',
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
    all: 'سب', unread: 'نئی', sortRecent: 'حالیہ مطالعہ', sortAdded: 'حال ہی میں شامل', sortTitle: 'عنوان',
    category: 'زمرہ', setCategory: 'شیلف / زمرہ', categoryHint: 'شیلف کا نام (مثلاً شاعری، ناول)', save: 'محفوظ کریں', cancel: 'منسوخ', delete: 'حذف کریں',
    notes: 'نوٹس', noNotes: 'ہائی لائٹ کرنے یا نوٹ لکھنے کے لیے کتاب میں متن منتخب کریں۔', exportNotes: 'نوٹس برآمد کریں', copyNotes: 'نوٹس کاپی کریں', copied: 'کاپی ہو گیا',
    addNote: 'نوٹ لکھیں', editNote: 'نوٹ', dictionary: 'لغت', findInBook: 'کتاب میں تلاش', copy: 'کاپی', highlightsN: 'ہائی لائٹس',
    margin: 'حاشیے', spread: 'دو صفحاتی منظر (بڑی اسکرین)', on: 'خودکار', off: 'ایک صفحہ',
    convertEpub: 'EPUB میں تبدیل کریں', converting: 'تبدیل ہو رہی ہے', converted: 'EPUB میں تبدیل ہو گئی', convertHint: 'متن کو دوبارہ ترتیب دے کر EPUB بناتا ہے تاکہ آپ فونٹ بدل سکیں اور ہائی لائٹ و نوٹس استعمال کر سکیں۔ صرف اصل متن والی PDF کے لیے۔',
    noText: 'اس PDF میں پڑھنے کے قابل متن نہیں ہے (یہ اسکین شدہ ہے یا مخصوص اردو انکوڈنگ استعمال کرتی ہے)، اس لیے OCR کے بغیر تبدیل نہیں ہو سکتی۔',
    pdfNotesHint: 'ہائی لائٹس اور نوٹس EPUB کتابوں میں کام کرتے ہیں۔ انہیں استعمال کرنے کے لیے اس PDF کو EPUB میں تبدیل کریں۔', convertedFrom: 'EPUB نقل',
    ago: 'پڑھی', never: '', lastRead: 'پڑھی',
    ocrOffer: 'اس PDF میں پڑھنے کے قابل متن نہیں ہے (یہ اسکین شدہ ہے یا مخصوص انکوڈنگ استعمال کرتی ہے)۔\n\nکیا OCR (متن کی شناخت) چلائیں؟ یہ آپ کے آلے پر چلتا ہے اور لمبی کتابوں میں وقت لگ سکتا ہے۔ چھپا ہوا نسخ متن اچھا پہچانا جاتا ہے؛ نستعلیق اور کمزور اسکین میں غلطیاں ہوں گی، اس لیے نتیجہ ضرور دیکھ لیں۔',
    ocrLoading: 'اردو شناخت کا ڈیٹا لوڈ ہو رہا ہے…', ocrRunning: 'متن پہچانا جا رہا ہے', ocrDone: 'OCR سے تبدیل ہو گئی — براہِ کرم پروف ریڈنگ کریں، غلطیاں ممکن ہیں',
    ocrEmpty: 'OCR کو اس PDF میں کوئی متن نہیں ملا۔', convertOcr: 'OCR سے تبدیل کریں', cancelled: 'منسوخ کر دیا گیا',
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
