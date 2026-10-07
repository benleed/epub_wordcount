# Chapterwise

Chapterwise is a static, browser-only tool for planning an EPUB reading session.
Open a local EPUB to see its total word count and a word-count breakdown at the
chapter level you choose. It can also generate a new EPUB with a simplified
table of contents and sub-chapter files folded into their parent chapter.

The site is intended for GitHub Pages. There is no server, account, upload, or
book storage: the EPUB is opened and processed in the browser.

## What it does

- Reads the EPUB package, reading spine, and EPUB 3 navigation document or NCX,
  rather than blindly counting every HTML/XML file in the archive.
- Counts words in the reading files, while ignoring common non-reading markup
  such as navigation, scripts, styles, and semantic footnotes/endnotes.
- Lets the reader exclude individual reading files (useful for bibliographies,
  indexes, notes, and appendices) and edit the *counted text* for a file.
- Groups the displayed count by a selectable navigation depth. This makes it
  possible to treat nested sections as part of a parent chapter.
- Exports a separate `_squished.epub`. The export trims the navigation below
  the chosen level, appends folded sub-chapter document bodies to the parent,
  and removes the folded documents from the EPUB spine. It keeps the original
  EPUB untouched.

## Use

1. Open the GitHub Pages site (or serve this directory locally) and choose an
   `.epub` file.
2. Check the **Reading breakdown**. Untick files that should not contribute to
   the estimate, or select one and edit the text used for its count.
3. Set **Primary chapter level**. Level 1 means the top-level contents entries;
   a larger level preserves more nested sections.
4. Use **Download squished EPUB** only after reviewing the contents preview.
   Test the result on the target e-reader before replacing a copy in your
   library.

Edits in the text box deliberately affect only the displayed word count. They
are a safe way to refine an estimate. The squished EPUB is structural: it
merges complete reading files and does not try to infer which paragraphs inside
one file are footnotes or bibliography.

## Project layout

- `index.html` — the application, styles, and all browser-side logic.
- `legacy.html` — the former minimal word counter, retained for historical
  reference.

The app has one runtime dependency, JSZip, loaded from cdnjs. GitHub Pages
requires an internet connection for that library to load. No build step is
needed.

## EPUB implementation notes

EPUBs vary considerably. The app finds the OPF through
`META-INF/container.xml`, uses its manifest and spine for reading order, then
prefers an EPUB 3 `nav` document and falls back to an NCX document. A book
without a readable navigation document can still be counted file by file, but
cannot be structurally remapped.

When folding standalone sub-chapters, the source XHTML is appended to its
retained parent and its relative links are rebased for the new location. The
source document remains in the ZIP manifest but is removed from the spine; this
helps retain internal links/resources while preventing the normal reading flow
from treating it as a separate chapter. Because malformed or unusually
constructed EPUBs are common, keep the original and validate exported books in
the e-reader that matters to you.

## Future direction: PDFs

PDF support is intentionally out of scope for the first version. A later
addition should be a separate import pipeline: extract text, present an
editable detected-outline/chapter map, report counts per selected chapter, and
write repaired chapter markers where the PDF format and reader support it.
Avoid treating PDFs as EPUBs; their page and outline model is fundamentally
different.

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
