# Urdu Reader — اردو ریڈر

An offline-capable web app (installable PWA) for reading **EPUB** and **PDF** books in Urdu, built for right-to-left text.

## Features
- Import EPUB / PDF (button, drag & drop, or "Open with…" once installed). Books are stored on-device in IndexedDB.
- Automatic RTL detection (book language, metadata, or text sampling) with manual override; page turns follow RTL order.
- Bundled fonts that work offline: Noto Nastaliq Urdu (default), Noto Naskh, Amiri.
- Adjustable text size and line spacing, paged or scroll layout, Light / Sepia / Dark / Black themes (PDFs get dark mode too).
- Contents, bookmarks, in-book search, reading-progress slider, resume where you left off.
- Tap left/right edges, swipe, or arrow keys to turn pages; tap the centre to show/hide controls.
- **Highlights & notes** (EPUB): select text → floating menu with 5 colours, note, copy, dictionary (Wiktionary) and in-book search. Highlight colours retune per theme. Tap a highlight to recolour, edit the note or delete. Notes tab lists everything; export to Markdown or copy.
- **Doodles (✿ button):** pen, marker, 12 stamps (hearts, heart tower, sparkles, vine, flowers, dots…), eraser, undo, and a Hand tool to turn pages while the toolbar is open. Works on EPUB and PDF. In EPUBs, doodles attach to the nearby words and scale with text size; in PDFs they attach to the page position. **Frames:** select text → ❀ → heart-chain / scallop / dashed border around it.
- **Reading layout:** adjustable margins, and a two-page spread with a centre gutter shadow on wide screens (RTL-aware).
- **Library:** custom shelves/categories, filters (Reading / Unread / Finished), sort, "last read" times.
- **PDF → EPUB:** rebuilds a PDF's text layer into a reflowable EPUB (RTL, chapters from headings or every 8 pages, cover from page 1, running headers/page numbers stripped) so fonts, highlights and notes work.
- **OCR for scanned PDFs:** if a PDF has no usable text layer, the app offers to run Urdu OCR (Tesseract, fully on-device, works offline after first use, cancellable) and builds the EPUB from the result. Also available as "Convert with OCR" in the PDF display settings.
- UI in English or اردو.

## Run
```
npm install
npm run dev       # development
npm run build && npm run preview   # production build (service worker / install prompt)
```
Host the `dist/` folder on any static host (GitHub Pages, Netlify, …) and "Add to Home Screen" on your phone.

## Notes
- OCR accuracy depends on the print: clean Naskh text recognises very well (≈1% character errors in our tests); Nastaliq is readable but noticeably worse (≈10%), and poor scans will be worse still. Always proofread OCR output. OCR speed is a few seconds per page on a desktop; phones are slower.
- The OCR engine and Urdu model (~12 MB) are downloaded from this site the first time OCR is used, then cached. `npm run dev`/`build` copy them into `public/ocr` automatically.
- Wi-Fi transfer from a computer isn't possible in a browser app; use the Add button, drag & drop, or "Open with…" after installing.
- Cloud sync is not implemented (everything stays on the device).
- PDF text search only works on PDFs with a real text layer; scanned/image PDFs and some InPage exports can't be searched.
- PDFs are shown as images of the page, so font/spacing settings apply to EPUBs only.
