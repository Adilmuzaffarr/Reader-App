# Urdu Reader — اردو ریڈر

An offline-capable web app (installable PWA) for reading **EPUB** and **PDF** books in Urdu, built for right-to-left text.

## Features
- Import EPUB / PDF (button, drag & drop, or "Open with…" once installed). Books are stored on-device in IndexedDB.
- Automatic RTL detection (book language, metadata, or text sampling) with manual override; page turns follow RTL order.
- Bundled fonts that work offline: Noto Nastaliq Urdu (default), Noto Naskh, Amiri.
- Adjustable text size and line spacing, paged or scroll layout, Light / Sepia / Dark / Black themes (PDFs get dark mode too).
- Contents, bookmarks, in-book search, reading-progress slider, resume where you left off.
- Tap left/right edges, swipe, or arrow keys to turn pages; tap the centre to show/hide controls.
- UI in English or اردو.

## Run
```
npm install
npm run dev       # development
npm run build && npm run preview   # production build (service worker / install prompt)
```
Host the `dist/` folder on any static host (GitHub Pages, Netlify, …) and "Add to Home Screen" on your phone.

## Notes
- PDF text search only works on PDFs with a real text layer; scanned/image PDFs and some InPage exports can't be searched.
- PDFs are shown as images of the page, so font/spacing settings apply to EPUBs only.
