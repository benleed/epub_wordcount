/* Chapterwise — shared note/footnote detection heuristics.
   Used by index.html (EPUB, DOM based) and pdf.html (PDF, line metrics based).
   Deliberately dependency free: it works in the browser (window.ChapterwiseNotes) and in
   Node (module.exports) so the heuristics can be exercised against real books. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ChapterwiseNotes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WORDS = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
  // A real roman numeral (so "Mid." and "Civil" are not mistaken for note numbers).
  const ROMAN = "(?=[ivxlcdm])(?:m{0,4})(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})";
  // "9 ", "[12]", "iv.", "A.", "† " — a leading note reference inside the text itself.
  const MARKER = new RegExp(`^\\s*(?:[\\[(](?:\\d{1,4}|${ROMAN})[\\])]|[*†‡§¶]{1,3}|\\d{1,3}(?=\\s)|(?:\\d{1,3}|${ROMAN})\\s*[.\\])\\-–—:]|[A-Za-z]\\s*[.)])[\\s\\u00a0]+`, "i");
  // The same reference with an explicit delimiter (stronger evidence than a bare number).
  const STRONG_MARKER = new RegExp(`^\\s*(?:[\\[(](?:\\d{1,4}|${ROMAN})[\\])]|[*†‡§¶]{1,3}|(?:\\d{1,3}|${ROMAN})\\s*[.\\])\\-–—:]|[A-Za-z]\\s*[.)])[\\s\\u00a0]+`, "i");
  // Text that points back at the passage a note belongs to: "[←58]", "↩", "Back to text."
  const BACKLINK = /[←↩↞⇦⇧↑⤴⤒]|back\s+to\s+(?:the\s+)?(?:text|page|note)|return\s+to\s+(?:the\s+)?(?:text|page|note)/i;
  const BACKLINK_ONLY = /^(?:[\[(]?\s*(?:\d{1,3}|[←↩↞⇦⇧↑⤴⤒])\s*[\])]?|\[\s*[←↩↞⇦⇧↑⤴⤒]\s*\d{0,4}\s*\])\s*$/i;
  const MARKER_ONLY = new RegExp(`^(?:[\\[(]?\\s*(?:\\d{1,4}|${ROMAN}|[*†‡§¶]{1,3})\\s*[\\])]?)\\s*$`, "i");
  // A heading that introduces notes. Front matter (preface, dedication, …) is handled by name
  // instead, because a preface is not a footnote block.
  const HEADING = /^[\s\d.,§¶]*(?:end\s?notes?|foot\s?notes?|notes?|annotations?|bibliography|works\s?cited|references|glossary|abbreviations|appendi(?:x|ces))[\s:.]*$/i;
  // Names must be whole words: "index_split_021" and "notes_1" are file-name conventions, not titles.
  const NOTES_NAME = /(?:^|[^a-z0-9_])(?:end\s?notes?|foot\s?notes?|notes?|annotations?|bibliography|works\s?cited|references|glossary|index|abbreviations|appendi(?:x|ces))(?![a-z0-9_])/i;
  const NON_READING_NAME = /(?:^|[^a-z0-9_])(?:cover|title\s?page|copyright|contents|dedication|epigraph|foreword|preface|acknowledge?ments?|about\s+the\s+author|colophon|advert\w*)(?![a-z0-9_])/i;

  const words = text => (String(text == null ? "" : text).match(WORDS) || []).length;
  const countWords = words;
  const isMarkerLine = text => MARKER.test(String(text == null ? "" : text));
  const isStrongMarkerLine = text => STRONG_MARKER.test(String(text == null ? "" : text));
  const isMarkerOnly = text => MARKER_ONLY.test(String(text == null ? "" : text).trim());
  const hasBacklink = text => BACKLINK.test(String(text == null ? "" : text));
  const isBacklinkLine = text => { const value = String(text == null ? "" : text).trim(); return BACKLINK_ONLY.test(value) || (hasBacklink(value) && value.split(/\s+/).length <= 5); };
  const isNotesHeading = text => HEADING.test(String(text == null ? "" : text).trim());
  const looksLikeNotesName = text => NOTES_NAME.test(String(text == null ? "" : text));
  const looksLikeFrontMatterName = text => NON_READING_NAME.test(String(text == null ? "" : text));
  const isShort = (text, limit) => String(text == null ? "" : text).trim().length <= (limit || 90);

  // Split text into trimmed lines, remembering the character range each line occupies.
  function splitLines(text) {
    const out = [];
    let cursor = 0;
    String(text == null ? "" : text).split("\n").forEach(raw => {
      const value = raw.trim();
      if (value) {
        const start = cursor + raw.indexOf(value);
        out.push({ text:value, start, end:start + value.length });
      }
      cursor += raw.length + 1;
    });
    return out;
  }
  function mergeRanges(ranges) {
    const sorted = [...(ranges || [])].filter(range => range && range.end > range.start).sort((a, b) => a.start - b.start);
    const merged = [];
    sorted.forEach(range => {
      const last = merged[merged.length - 1];
      if (last && range.start <= last.end + 2) last.end = Math.max(last.end, range.end);
      else merged.push({ start:range.start, end:range.end });
    });
    return merged;
  }
  // Drop the given character ranges and tidy up the paragraph breaks left behind.
  function removeRanges(text, ranges) {
    const merged = mergeRanges(ranges);
    if (!merged.length) return text;
    let out = "", cursor = 0;
    merged.forEach(range => { out += text.slice(cursor, range.start); cursor = Math.max(cursor, range.end); });
    out += text.slice(cursor);
    return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, "");
  }
  function median(values) {
    const list = (values || []).filter(value => Number.isFinite(value)).sort((a, b) => a - b);
    if (!list.length) return 0;
    const middle = Math.floor(list.length / 2);
    return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  }

  // ---- EPUB: DOM based analysis ----
  const BLOCK_SELECTOR = "p,div,li,blockquote,section,article,aside,h1,h2,h3,h4,h5,h6,td,th,tr,table,ol,ul,dl,dd,dt,pre,figcaption,figure,hr";
  const SEMANTIC_TYPE = /(?:^|\s)(?:footnote|endnote|rearnote|note|noteref|doc-footnote|doc-endnote|doc-noteref)(?:\s|$)/i;
  const NOTE_CLASS = /(?:^|[\s_-])(?:foot|end)?notes?(?:$|[\s_-])|noteref|note[-_]?ref|fnote|fn[-_]?\d|note[-_]?\d/i;
  const AUTO_IGNORE = "script,style,nav,svg,math,aside";

  // Text of one element, skipping nodes that are not counted (and turning <br> into newlines).
  function elementText(el, blocked) {
    let out = "";
    const visit = node => {
      if (node.nodeType === 3) { out += node.nodeValue.replace(/\s+/g, " "); return; }
      if (node.nodeType !== 1 || blocked.has(node)) return;
      if (node.tagName && node.tagName.toLowerCase() === "br") { out += "\n"; return; }
      if (!node.children || !node.children.length) { out += (node.textContent || "").replace(/\s+/g, " "); return; }
      [...node.childNodes].forEach(visit);
    };
    [...el.childNodes].forEach(visit);
    return out.replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{2,}/g, "\n").trim();
  }
  // Why an element is not counted, if it (or an ancestor) is on the ignore list.
  function ignoredAncestor(el, ignored) {
    for (let node = el; node; node = node.parentElement) if (ignored.has(node)) return ignored.get(node);
    return null;
  }

  /* Analyze one XHTML document. Returns the counted text (paragraph breaks preserved), the
     blocks behind it, notes that are already ignored, and note candidates as character ranges. */
  function analyzeMarkup(raw, opts) {
    const options = opts || {};
    const scope = options.window || (typeof globalThis !== "undefined" ? globalThis : null);
    const Parser = options.DOMParser || (scope && typeof scope.DOMParser === "function" ? scope.DOMParser : null);
    if (!Parser || typeof raw !== "string") return null;
    const doc = new Parser().parseFromString(raw, "text/html");
    const body = doc.body;
    if (!body) return null;
    doc.querySelectorAll(AUTO_IGNORE).forEach(node => node.remove());
    const ignored = new Map(), targets = new Set();
    const mark = (el, reason) => { if (el && !ignored.has(el)) ignored.set(el, reason); };
    [...body.querySelectorAll("[epub\\:type],[role]")].forEach(el => {
      const type = `${el.getAttribute("epub:type") || ""} ${el.getAttribute("role") || ""}`;
      if (SEMANTIC_TYPE.test(type)) mark(el, "semantic footnote markup");
    });
    [...body.querySelectorAll("a[href]")].forEach(anchor => {
      const cls = typeof anchor.className === "string" ? anchor.className : "";
      const type = `${anchor.getAttribute("epub:type") || ""} ${anchor.getAttribute("role") || ""} ${cls}`;
      const href = anchor.getAttribute("href") || "", label = (anchor.textContent || "").trim();
      const semantic = SEMANTIC_TYPE.test(type) || NOTE_CLASS.test(type);
      const markerLink = href.startsWith("#") && (isMarkerOnly(label) || label.length <= 3);
      if (!href.startsWith("#") || (!semantic && !markerLink)) return;
      const id = href.split("#")[1];
      if (id) targets.add(id);
      mark(anchor, "note reference");
      try { const sup = anchor.closest("sup"); if (sup) mark(sup, "note reference"); } catch (error) { /* no closest() */ }
    });
    const blocked = new Set(ignored.keys()), blocks = [], candidates = [], alreadyIgnored = [];
    let text = "";
    [...body.querySelectorAll(BLOCK_SELECTOR)].forEach(el => {
      if (el.querySelector(BLOCK_SELECTOR)) return;                       // keep leaf blocks only
      const value = elementText(el, blocked);
      if (!value) return;
      const reason = ignoredAncestor(el, ignored);
      if (reason) { alreadyIgnored.push({ text:value, reason, words:words(value) }); return; }
      const start = text.length ? text.length + 2 : 0;
      text += (text.length ? "\n\n" : "") + value;
      blocks.push({ text:value, start, end:start + value.length, id:el.id || "", className:typeof el.className === "string" ? el.className : "" });
    });
    const add = (block, reason, confidence) => candidates.push({ start:block.start, end:block.end, text:block.text, reason, confidence });
    blocks.forEach(block => {
      if (block.id && targets.has(block.id)) add(block, "text that a note reference points at", "high");
      else if (block.className && NOTE_CLASS.test(block.className)) add(block, "classed as a footnote", "medium");
    });
    blocks.forEach((block, index) => {
      if (isBacklinkLine(block.text)) {
        add(block, "back-reference to the text", "high");
        const next = blocks[index + 1];
        if (next && (isMarkerLine(next.text) || hasBacklink(next.text) || words(next.text) <= 60)) add(next, "note that follows a back-reference", "high");
      } else if (hasBacklink(block.text) && isShort(block.text, 140)) {
        add(block, "back-reference to the text", "high");
      }
    });
    // "Notes" heading followed by a run of numbered note lines (a contents list is not a note run).
    const headingIndex = blocks.findIndex(block => isNotesHeading(block.text.split("\n")[0] || block.text));
    if (headingIndex >= 0 && headingIndex < blocks.length - 1) {
      const following = blocks.slice(headingIndex + 1);
      const markerShare = following.filter(block => isMarkerLine(block.text)).length / following.length;
      if (markerShare >= 0.3) following.filter(block => isMarkerLine(block.text)).forEach(block => add(block, "numbered entry under a notes heading", isStrongMarkerLine(block.text) ? "high" : "medium"));
    }
    const unique = dedupeCandidates(candidates);
    return {
      text, blocks, alreadyIgnored,
      candidates:unique,
      notesFile:fileNoteReason(options.label, options.path, blocks, text),
      summary:{ candidateWords:unique.reduce((sum, item) => sum + words(item.text), 0), ignoredWords:alreadyIgnored.reduce((sum, item) => sum + item.words, 0), blockCount:blocks.length }
    };
  }

  function dedupeCandidates(candidates) {
    const seen = new Map();
    candidates.forEach(item => {
      const key = `${item.start}:${item.end}`, existing = seen.get(key);
      if (!existing || (existing.confidence !== "high" && item.confidence === "high")) seen.set(key, item);
    });
    return [...seen.values()].sort((a, b) => a.start - b.start);
  }
  // Does this whole file look like a notes section, bibliography or index?
  function fileNoteReason(label, path, blocks, text) {
    if (!blocks || !blocks.length) return null;
    const wordCount = words(text);
    const markers = blocks.filter(block => isMarkerLine(block.text)).length;
    const backlinks = blocks.filter(block => hasBacklink(block.text)).length;
    const distinct = new Set(blocks.map(block => block.text.slice(0, 40).toLowerCase())).size;
    const repetitive = blocks.length >= 4 && distinct / blocks.length < 0.5;
    const name = `${label || ""} ${path || ""}`;
    if (looksLikeNotesName(name) && (markers / blocks.length >= 0.3 || backlinks > 0 || repetitive)) return "labelled as a notes section";
    if (blocks.length <= 3 && backlinks > 0 && (markers > 0 || wordCount <= 80)) return "standalone note";
    if (blocks.length >= 6 && repetitive && markers / blocks.length >= 0.6) return "list of notes or references";
    if (looksLikeFrontMatterName(name) && blocks.length <= 4 && wordCount <= 120) return "front or back matter";
    return null;
  }

  // ---- PDF: line metrics ----
  /* Look for the classic PDF footnote block: a run of lines at the foot of the page, usually in
     smaller type, often numbered and set apart from the body by a gap. Nothing is removed here;
     the character range of the run is returned so the reader can decide. */
  function detectPageNotes(page, opts) {
    const options = opts || {};
    const lines = (page.lines || []).filter(line => line.text);
    const bodySize = page.bodySize || 0;
    if (lines.length < 3 || !bodySize) return { candidates:[], reason:null };
    const sizeDrop = options.sizeDrop == null ? 0.94 : options.sizeDrop;
    const isSmall = line => line.size > 0 && line.size <= bodySize * sizeDrop;
    const noteLike = line => isSmall(line) || isMarkerLine(line.text) || isMarkerOnly(line.text) || hasBacklink(line.text);
    const heights = lines.map(line => line.y);
    const lowest = Math.min(...heights), highest = Math.max(...heights);
    const span = Math.max(1, highest - lowest);
    const pitch = lines.length > 1 ? span / (lines.length - 1) : span;
    let start = lines.length;
    for (let index = lines.length - 1; index >= 0 && noteLike(lines[index]); index--) start = index;
    if (start >= lines.length) return { candidates:[], reason:null };
    const run = lines.slice(start);
    const runTop = Math.max(...run.map(line => line.y));
    const bottomFraction = (runTop - lowest) / span;
    const smallRatio = run.filter(isSmall).length / run.length;
    const markerRatio = run.filter(line => isMarkerLine(line.text) || isMarkerOnly(line.text)).length / run.length;
    const backlink = run.some(line => hasBacklink(line.text));
    const gap = start > 0 ? lines[start].y - lines[start - 1].y : pitch;
    const wordCount = run.reduce((sum, line) => sum + countWords(line.text), 0);
    // A one or two word line at the foot of a page is a page number or running head, not a note.
    if (wordCount < 3) return { candidates:[], reason:null };
    let score = 0;
    if (start > 0) score += 1;
    if (bottomFraction <= 0.45) score += 1;
    if (bottomFraction <= 0.28) score += 1;
    if (smallRatio >= 0.34) score += 1;
    if (smallRatio >= 0.7) score += 1;
    if (markerRatio >= 0.25) score += 1;
    if (backlink) score += 1;
    if (start > 0 && gap >= pitch * 1.35) score += 1;
    if (wordCount >= 3 && wordCount <= 2600) score += 1;
    if (start === 0 && smallRatio >= 0.6 && markerRatio >= 0.4) score += 2;    // a whole page of notes
    if (smallRatio < 0.2 && !backlink && markerRatio < 0.25) score -= 2;       // no real note signal
    const confidence = score >= 6 ? "high" : score >= 4 ? "medium" : null;
    if (!confidence) return { candidates:[], reason:null };
    const reasons = [];
    if (smallRatio >= 0.5) reasons.push("smaller type");
    if (bottomFraction <= 0.45) reasons.push("foot of the page");
    if (start > 0 && gap >= pitch * 1.35) reasons.push("set apart from the body");
    if (markerRatio >= 0.25) reasons.push("numbered note lines");
    if (backlink) reasons.push("back-references to the text");
    const first = run[0], last = run[run.length - 1];
    const startOffset = first.start == null ? 0 : first.start;
    const endOffset = last.end == null ? startOffset + last.text.length : last.end;
    return {
      candidates:[{ start:startOffset, end:endOffset, text:run.map(line => line.text).join("\n"), confidence }],
      reason: reasons.join(", ") || "possible note text"
    };
  }
  // Roll up what was found so the UI can describe it in one line.
  function summarize(items) {
    let files = 0, flagged = 0, flaggedWords = 0, high = 0, ignoredWords = 0;
    (items || []).forEach(item => {
      ignoredWords += (item.summary && item.summary.ignoredWords) || 0;
      const list = item.candidates || item.notes || [];
      if (!list.length) return;
      files += 1; flagged += list.length;
      flaggedWords += list.reduce((sum, candidate) => sum + countWords(candidate.text), 0);
      high += list.filter(candidate => candidate.confidence === "high").length;
    });
    return { files, flagged, flaggedWords, high, ignoredWords };
  }

  const internals = { MARKER, STRONG_MARKER, BACKLINK, BACKLINK_ONLY, MARKER_ONLY, HEADING, NOTES_NAME, NON_READING_NAME };
  return {
    internals, words, countWords, median,
    isMarkerLine, isStrongMarkerLine, isMarkerOnly, isBacklinkLine, hasBacklink, isNotesHeading,
    looksLikeNotesName, looksLikeFrontMatterName, isShort,
    splitLines, mergeRanges, removeRanges,
    analyzeMarkup, fileNoteReason, detectPageNotes, summarize
  };
});
