# Chapterwise

Chapterwise is a static, browser-only tool for planning a reading session.
`index.html` opens a local EPUB to see its total word count and a word-count
breakdown at the chapter level you choose; it can also generate a new EPUB with
a simplified table of contents and sub-chapter files folded into their parent
chapter. `pdf.html` does the same job for PDFs: it counts words per bookmark (or
per chosen page range), reshapes the chapter list, and can add a cover image.
Both tools also look for footnotes, endnotes and similar back matter so a
reading count is not inflated by text nobody reads; see
[Footnotes and note sections](#footnotes-and-note-sections).

The site is intended for GitHub Pages. There is no server, account, upload, or
book storage: the book is opened and processed entirely in the browser.

## What it does

- Reads the EPUB package, reading spine, and EPUB 3 navigation document or NCX,
  rather than blindly counting every HTML/XML file in the archive.
- Counts words in the reading files, while ignoring common non-reading markup
  such as navigation, scripts, styles, and semantic footnotes/endnotes.
- Lets the reader exclude individual reading files (useful for bibliographies,
  indexes, notes, and appendices) and edit the *counted text* for a file.
- Flags the notes it finds — semantic note markup, back-references, note blocks,
  whole notes sections, and (for PDFs) small-type text at the foot of the page —
  and removes exactly what you choose to remove from the count. Detection never
  changes anything by itself.
- Groups the displayed count by a selectable navigation depth. This makes it
  possible to treat nested sections as part of a parent chapter. For EPUBs
  whose contents are completely flat, a separate target-chapter control
  combines adjacent sections into practical, similarly sized reading chunks.
- Titles a combined flat chunk `[first chapter] – [last chapter]`, so the
  e-reader navigation says which range it covers instead of only where it
  starts.
- Groups the **Files & text** / **Pages & text** list by chapter, with a filter
  box and a "only flagged" toggle, so a book with hundreds of small files (or a
  long footnote review list) stays navigable.
- Exports a separate `_squished.epub`. The export trims the navigation below
  the chosen level, appends folded sub-chapter document bodies to the parent,
  and removes the folded documents from the EPUB spine. It keeps the original
  EPUB untouched.

## Use

1. Open the GitHub Pages site (or serve this directory locally) and choose an
   `.epub` file.
2. Review the **Overview** tab for the running total, the **Reading breakdown**,
   and a contents preview. Excluded chapters are greyed out; a partly included
   chapter shows *included / total*.
3. Open the **Files & text** tab to manage individual files. The list is grouped
   by chapter; the filter box narrows it by chapter, file name, or text, and
   **Show only files with detected notes** turns it into a review list.
   **Exclude all** clears every selection so you can tick only the sections you
   want, and selecting a file opens its counted text on the right for editing.
   Clicking a row selects it; use its checkbox to include or exclude it.
4. Check the **Footnotes** card: it reports what was found and offers **Remove
   high-confidence**, **Remove all flagged** and **Restore original text**. See
   [Footnotes and note sections](#footnotes-and-note-sections).
5. Set **Primary chapter level**. Level 1 means the top-level contents entries;
   a larger level preserves more nested sections.
6. For a flat contents list, use **Target chapters** to choose the maximum
   number of reading chapters in the rebuilt book. The default is 18 (or fewer
   when the book has fewer sections). Combined chapters are titled
   `first – last`.
7. Use **Download squished EPUB** only after reviewing the contents preview.
   Test the result on the target e-reader before replacing a copy in your
   library.

For PDFs, open `pdf.html` instead and follow the same shape of workflow: review
the per-bookmark word counts, choose a chapter level (or define page-based
chapters), check the notes found on the pages, and export either a rewritten
outline or a copy with a cover.

Edits in the text box deliberately affect only the displayed word count. They
are a safe way to refine an estimate: characters typed, deleted, or removed by a
note action change the count and nothing else. The exported book is structural
(it folds whole files), so removing notes never edits the exported EPUB, and the
squished EPUB still contains the notes you left in the reading text.

## Footnotes and note sections

The point of the **Files & text** / **Pages & text** tab is to keep notes out of a
*reading* word count, so `footnotes.js` looks for them in both tools and reports
what it found. It is deliberately conservative about acting on its own:

- **Nothing is removed automatically.** Every detection is a *flag* with a
  confidence, a reason, and the text it would remove. The count only changes when
  you press **Remove** (one item, one file/page, all high-confidence, or all
  flagged). **Restore original text** puts a file or page back, and the book file
  on disk is never touched.
- **Semantic markup is still ignored silently**, as before: EPUB `epub:type`
  or `role` values such as `footnote`, `endnote`, `rearnote`, `note`, and
  `doc-footnote`, plus `<aside>` and the usual `nav`/`script`/`style`/`svg`/`math`
  containers. The panel reports how many words that removed.
- High-confidence flags are checked first with **Remove high-confidence**;
  medium-confidence flags are the ones worth reading before you remove them.

For EPUBs the detector works on the document structure:

- note references (`epub:type="noteref"`, `role="doc-noteref"`, or a superscript
  link that is only a number) are dropped, and the block they point at becomes a
  flag;
- blocks that are only a back-reference (`[←58]`, `Back to text.`) and the
  note-shaped block that follows them are flagged — this covers per-chapter notes
  and the common "one XHTML file per note" layout;
- a notes/endnotes/bibliography/glossary/appendix heading followed by a run of
  numbered entries flags that run;
- a whole reading file is flagged as a **notes section** when its name says so
  (or it is a repeated, mostly numbered list), and small front-matter or
  back-matter files are flagged as **front matter**. These get an **Exclude
  file** button, which is usually cleaner than removing block by block.

For PDFs the detector uses the geometry pdf.js gives us, because page footnotes
have no markup to rely on. Lines are rebuilt from the text items with their
baseline position and glyph height, then a run of trailing lines is flagged when
several of these hold: smaller type than the page's dominant size, positioned in
the lower part of the page, set apart from the body by a larger gap, numbered
like notes, or containing back-references. A page that is entirely note-like is
flagged as a whole. PDF text extraction is an estimate, so treat this as a
review list: ruled-off footnotes set in body-sized type (no visual gap) can only
be caught by the weaker signals, and a stray line of small type at the foot of
a page (an imprint, a page number) may be flagged.

Two accuracy notes:

- The counted text is now split into paragraphs (and `<br>` becomes a line
  break). Word *counts* are unchanged by this, except where a book previously
  ran two words together across a line break or heading boundary (for example
  `ABBREVIATIONS` + `AASOR`); those now count as the two words they are, so a
  total can move up slightly after this change.
- Detection is a heuristic that runs in a few milliseconds per book and never
  reads the network. If it misses a note style you care about, the text editor is
  still there: remove anything by hand and the same **Restore original text**
  button undoes it.


- `index.html` — the EPUB application and all of its browser-side logic.
- `pdf.html` — the PDF application (a separate import pipeline).
- `styles.css` — the styles shared by both pages. Everything except the small
  page-specific blocks belongs here, so the two tools look and behave the same.
- `footnotes.js` — shared note/footnote detection used by both tools. It is
  dependency-free and works in the browser (`window.ChapterwiseNotes`) and in
  Node (`require`), so the heuristics can be exercised against real books.
- `legacy.html` — the former minimal word counter, retained for historical
  reference.

The EPUB tool has one runtime dependency, JSZip. The PDF tool adds pdf.js
(reading text and bookmarks) and pdf-lib (writing the cover and bookmarks). All
three are loaded from cdnjs, so GitHub Pages requires an internet connection for
them to load. `styles.css` and `footnotes.js` are plain local files
(`footnotes.js` is loaded synchronously because both pages use it as soon as
they run). No build step is needed.

## EPUB implementation notes

EPUBs vary considerably. The app finds the OPF through
`META-INF/container.xml`, uses its manifest and spine for reading order, then
prefers an EPUB 3 `nav` document and falls back to an NCX document. A book
without a readable navigation document can still be counted file by file, but
cannot be structurally remapped.

When folding standalone sub-chapters, the source XHTML is appended to its
retained parent and its relative links are rebased for the new location. Every
resulting chapter keeps its first reading file and folds the subsequent files
into it. The folded source documents remain in the ZIP manifest but are removed
from the spine; this helps retain internal links/resources while preventing the
normal reading flow from treating them as separate chapters. For a flat contents
list, adjacent entries are combined into the target chapter count by reading
length, and each combined chapter is titled `first – last` so its entry in the
rebuilt navigation shows the range it covers; because no contents entry precedes
it, any opening spine file (such as a cover) folds into the first chapter, which
is why that chapter's retained file is the book's opening file. Because
malformed or unusually constructed EPUBs are common, keep the original and
validate exported books in the e-reader that matters to you.

## PDF support (`pdf.html`)

PDF support is a separate import pipeline, because the page and outline model is
fundamentally different from EPUB; PDFs are never treated as EPUBs.

- Reading uses pdf.js: it reads the bookmark (outline) tree, resolves each
  entry's destination to a page, then extracts every page's text and counts words
  with the same tokenizer as the EPUB tool. The extracted lines keep their
  baseline position and glyph height so note detection on the page works (see
  [Footnotes and note sections](#footnotes-and-note-sections)).
- The **Pages & text** tab lists the pages grouped under the same chapters as the
  reading breakdown, with a filter box and a "show only pages with detected
  notes" toggle, and a group header that can include or exclude a whole chapter's
  pages at once.
- Chapters come from the bookmarks. A page belongs to the deepest bookmark that
  starts at or before it; anything before the first bookmark becomes "Front
  matter". The **Keep through level** slider folds deeper bookmarks into their
  parent, exactly like the EPUB tool's chapter level. For a flat bookmark list,
  **Target chapters** combines adjacent bookmarks by length into a chosen number.
- A PDF with no bookmarks falls back to a page-based chapter map: list chapter
  start pages by hand (one per line, `page` or `page Title`) or leave it empty to
  auto-split the pages into the target number of chapters.
- Export writes a new file and never changes the original:
  - **Download squished PDF** rewrites the PDF `/Outlines` to exactly the chapters
    shown, using pdf-lib's low-level objects (there is no high-level outline API).
  - **Add cover & download PDF** embeds a PNG/JPG and inserts it as page 1 with
    `insertPage`, so the existing bookmarks and links are preserved. The
    `native`/`contain`/`cover` fit, native page size (DPI), and explicit
    width/height follow the same logic as the standalone `addcover.js`, but the
    page is inserted into the loaded document instead of rebuilding it, which is
    what keeps the original contents intact.

PDF text extraction is an estimate, not a paginated-print pipeline: it follows
the same tokenizer as the EPUB tool and can be refined with the per-page text
editor. PDFs with a malformed cross-reference table may not load; repair them
with qpdf first. Because reader support for rewritten outlines varies, validate an
export in your own e-reader before replacing a copy in your library.

## Development / handoff notes

This repository is deliberately dependency-light so a future patch can remain
deployable to GitHub Pages. Keep all book processing local unless that privacy
promise is explicitly reconsidered. The highest-value future tests are a small
fixture set covering:

- EPUB 3 navigation only
- EPUB 2 NCX only
- nested navigation whose child sections are separate spine files
- a book with front/back matter excluded from estimates
- relative images and links inside a folded child chapter

Test exports in both a validator and at least one actual e-reader: EPUB
navigation and spine behavior differs between reading systems.
