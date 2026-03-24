# Pagination architecture for ProseMirror screenplay editors

**Widget decorations with a hidden measurement div is the proven approach for screenplay pagination in ProseMirror/Tiptap.** A developer named Ben Cahan reported on the ProseMirror forum in late 2025 that he "completely solved" screenplay pagination — including widow/orphan controls, element-specific keep-together rules, and (MORE)/(CONT'D) insertion — using exactly this technique. The approach preserves ProseMirror's single-editor model, gives you native cursor/selection/undo behavior for free, and avoids the schema complexity of page-node splitting. Every major professional editor (Google Docs, OnlyOffice) eventually built custom layout engines because browser text rendering is insufficiently precise for WYSIWYG pagination — but for monospaced screenplay formatting, the browser's layout engine is predictable enough that a measurement-based decoration approach works well.

---

## How professional editors actually handle pagination

No production paginated editor relies on browser contentEditable for layout. Each has taken a different escape route, and the progression reveals a clear pattern: the more serious the pagination requirements, the further editors move from the browser's native text rendering.

**Google Docs** built a fully custom JavaScript editing surface called "kix" around 2010. Even pre-canvas, it never used contentEditable — the user typed into a hidden `<textarea>` in an off-screen iframe, and the visible cursor was a custom blinking `<div>`. In 2021, Google migrated the rendering layer to `<canvas>`, motivated by Steve Newman's observation that "modern browser engines provide a feature set unlikely to exactly match the exacting requirements of a WYSIWYG word processor." The document model, pagination logic, and custom layout engine remained the same; only the final paint step changed from DOM manipulation to pixel drawing. Pages are lazily rendered — scrolling to page 50 of a 99-page document triggers rendering on demand.

**OnlyOffice** took an even more extreme approach: full canvas rendering from inception, with a custom font metrics engine that bypasses the browser entirely. Their developers explicitly rejected browser font measurement as "inaccurate and inconsistent across browsers" and built their own text rendering pipeline. The pagination mimics desktop word processors: only visible pages are rendered, with incremental layout recalculation. Their OOXML-native document model means the same layout engine handles editing, preview, and export with claimed "100% fidelity."

**CKEditor 5** is the closest analog to what you're building — it uses a DOM-based single contenteditable with a pagination overlay. Their commercial pagination plugin measures content heights using configured page dimensions and injects visual page-break markers into the editor view. Critically, it only works reliably in Blink-based browsers (Chrome/Edge) because it depends on the browser's text layout engine for height calculations, and **Firefox produces different results**. Since Tauri on Windows uses WebView2 (Chromium) and macOS/Linux use WebKit, this cross-engine inconsistency is directly relevant.

**Collabora Online** (LibreOffice Web) sidesteps the problem entirely: documents are rendered server-side by the full LibreOffice C++ layout engine, and the browser receives pre-rendered image tiles via WebSocket, composited onto a canvas using Leaflet (the map library). Pagination is handled by the same code that runs in desktop LibreOffice.

**Fidus Writer**, built on ProseMirror for academic writing, attempted CSS Regions-based pagination in 2012-2013. When Chromium removed CSS Regions support, the approach died. Creator Johannes Wilm eventually gave up on editing-time pagination entirely, concluding it "is not that important for our users" — pagination now happens only at export time via Vivliostyle.

The key takeaway: **canvas-based editors (Google Docs, OnlyOffice) achieve pixel-perfect pagination but require enormous engineering investment. DOM-based editors (CKEditor) achieve "good enough" pagination with measurement-based overlays but face cross-browser inconsistencies.** For a Tauri app with a single target WebView per platform, the DOM-based measurement approach is viable and dramatically simpler.

---

## ProseMirror pagination: three competing patterns

The ProseMirror community has converged on three distinct architectures for pagination, each with different trade-offs. Marijn Haverbeke has consistently stated that pagination is "out of scope" for ProseMirror since it's a semantic editor, but multiple teams have built solutions on top of it.

### Pattern 1: page nodes in the schema (node-splitting)

Used by Celtx (the production screenplay editor), `prosemirror-pagination` (Todor Stoev), and `@adalat-ai/page-extension`. The schema becomes `doc → page+ → block+`. When content overflows a page node, it splits to the next page; when content is deleted, it pulls from the next page. JCHollett, likely a Celtx developer, described "several iterations on pagination" using a hybrid of fragment-moving between pages and join/split for overflow/underflow.

The advantage is that page structure lives in the document model — it persists, works with collaboration, and page metadata (headers, footers, page numbers) attaches naturally. The disadvantage is severe complexity. Casey Beck, who built `@adalat-ai/page-extension`, reported **spending 500+ hours** and called it "one of, if not the most, difficult programming tasks I've ever worked on." The split/join logic cascades: moving content to the next page may cause *that* page to overflow, triggering another split, and so on. Tables spanning page boundaries remain an unsolved problem in every open-source implementation.

### Pattern 2: CSS float-based visual pagination

Used by Badon Writer (IgorMadeira), demonstrated handling **450+ pages** with good performance. The trick: the editor uses `display: contents`, and a sibling "pages div" at the same DOM level uses CSS floats to create visual page boundaries. The content flows continuously, and CSS handles the visual breaks without any node manipulation.

This approach is performant and elegant but fundamentally **not content-aware**. The breaks fall wherever the CSS layout engine places them. You cannot insert (MORE)/(CONT'D) markers, enforce screenplay-specific keep-together rules, or prevent orphaned character names. IgorMadeira confirmed that a custom table plugin was necessary because "every element must adhere to specific constraints" — for screenplay pagination with its complex rules, this approach alone is insufficient.

### Pattern 3: widget decorations with height measurement

Used by Ben Cahan for his screenplay editor, `tiptap-pagination-plus` (Romik Makavana), and `tiptap-pagination-breaks`. The document remains a single continuous flow. A ProseMirror plugin calculates page break positions by measuring content heights, then returns `Decoration.widget()` elements that render visual page gaps.

The critical technical challenge is the **decoration feedback loop**: inserting a widget with height shifts all subsequent content down, invalidating the height measurements used to place it. Ben Cahan solved this with a **hidden measurement div** — an invisible div below the editor that mirrors the editor's CSS (fonts, margins, line-heights). Node content is measured in this hidden div, completely independent of widget decorations in the live editor. He described this in November 2025:

> "I have mostly solved the issue by creating a hidden div below the editor that carries over the css (for margins etc), using that to calculate the height of nodes with their current contents... **The key to this working is that the plugin is called before anything is being done to update the DOM**, so I can get it all right so that it looks like a Word-like page."

This is the approach most directly proven for screenplay editing in ProseMirror and is the recommended path.

### Available packages worth examining

- **Tiptap Pro Pages Extension** (`@tiptap-pro/extension-pages`): Official commercial extension, alpha stage, supports A4/Letter/custom formats with `cmToPixels()`/`inchToPixels()` utilities, headers/footers, page gaps. Requires paid Team plan. Could serve as a reference or fallback.
- **`tiptap-pagination-plus`**: Open-source CSS-based approach for Tiptap v2/v3 with page gap styling, headers/footers with `{page}`/`{total}` tokens, and a companion table pagination plugin.
- **`prosemirror-pagination`**: Todor Stoev's node-splitting approach, schema `doc(page(header, body, footer, pageCounter))`. Useful for understanding the node-splitting pattern but limited (no paragraph splitting across pages).
- **`@adalat-ai/page-extension`**: Node-based with binary search pagination, the most feature-complete open-source option but complex.

---

## Screenplay pagination rules and why line counting almost works

Screenplay formatting's monospaced constraint makes pagination dramatically simpler than general-purpose typesetting — but "simpler" is not "simple." The industry standard is **Courier 12pt** (10 characters per inch horizontally, 6 lines per inch vertically) on **US Letter (8.5" × 11")** with margins of **1.5" left, 1" right, 1" top, and ~0.5"–1" bottom**.

The modern consensus is approximately **55 lines per page** for the text body, though this has drifted over decades. John August's research on screenwriting.io found that older scripts (pre-2000) averaged 56-60 lines per page while modern scripts average 52-55. Production personnel break pages into eighths (~7 lines each) for scheduling and budgeting, which is why some sources cite 56 lines (8 × 7). Final Draft, Highland, and other major tools do not publicly document their exact line count — and importantly, **no screenplay file format stores pagination**. FDX, Fountain, and every other format computes page breaks on the fly.

### Why pure line counting breaks down

For monospaced text with fixed margins, you can calculate wrapped line counts exactly: `physical_lines = ceil(character_count / chars_per_line_width)`. Action blocks are ~61 characters wide; dialogue is ~33 characters wide. This makes wrapping deterministic. However, several gotchas undermine naive line counting:

**Font metric variation is real.** Not all "Courier 12pt" fonts produce identical line heights. Courier New is narrower than Courier Prime, which differs from Courier Final Draft (Final Draft's custom font). Beat's developer documented evolving from "word-by-word height checking" to "line fragment calculation" using native macOS text rendering (NSLayoutManager) because pure line counting produced inconsistent results. Movie Magic Screenwriter ships its own "Courier MM Screenwriter" font to guarantee consistency.

**Inter-element spacing creates complexity.** Scene headings require 2 blank lines before them; character names need 1 blank line; dialogue follows with no blank line. A naive line counter must track element types to account for these spacing differences.

**Page break constraint satisfaction is the real algorithmic challenge.** The industry rules are strict:

- **Never orphan a character name** at the bottom of a page — must have at least one line of dialogue following
- **Never split a parenthetical** from its adjacent dialogue
- **Dialogue breaks only at sentence boundaries**, with at least 2 lines before the break, and require **(MORE)** at page bottom and **(CONT'D)** at the next page top
- **Action blocks** break only after at least 2 lines and at sentence boundaries
- **Scene headings** must have at least one following element on the same page
- **Never start a page with a transition**

These constraints create a **recursive constraint satisfaction problem**. Moving an orphaned character name to the next page may cause that page to overflow, triggering another break adjustment. Afterwriting's open-source `liner.js` implements this with a recursive `break_lines()` function. Adding (MORE)/(CONT'D) lines themselves consume space, potentially causing further cascading adjustments.

**Dual dialogue** (two characters speaking simultaneously) creates a completely different layout problem where block height equals the maximum of left and right column heights. Afterwriting has known bugs with this calculation.

### How production editors actually paginate

Two approaches dominate. **Line-counting editors** (Trelby, Afterwriting, Fountain Mode for Emacs) parse the screenplay into typed elements, calculate physical line counts from text length and element width, accumulate per page, then apply constraint rules when approaching ~55 lines. **Layout-engine editors** (Beat, Kit Scenarist/STARC, Final Draft) use native text rendering engines (NSLayoutManager, QTextDocument, proprietary) to lay out text with actual font metrics and apply screenplay constraints as post-processing. Beat's developer found that different apps produce page counts within **±1-2 pages** of each other for feature-length scripts — implementations converge but never exactly agree.

---

## Evaluating six architectural approaches for your editor

### Approach A (widget decorations): the recommended path

A single continuous ProseMirror editor with `Decoration.widget()` injecting visual page gaps at calculated positions. This is the approach Ben Cahan used to "completely solve" screenplay pagination, and it's the most directly proven for your exact use case.

**Implementation architecture:**

1. Define a `PaginationPlugin` as a ProseMirror `StateField` that returns a `DecorationSet`
2. On every transaction, iterate top-level block nodes and measure heights using a hidden measurement div
3. Accumulate heights; when exceeding the page content area (**864px** for US Letter at 96 dpi with 1" top/bottom margins, or adjust for screenplay's specific margins), determine the break position
4. Apply screenplay rules: check if the break would orphan a character name, split dialogue, etc. Adjust the break position accordingly
5. At each break position, insert a `Decoration.widget()` with `side: -1` that renders the page gap visual (gray area, page shadow, page number)
6. Where dialogue splits, insert additional widget decorations for (MORE) and (CONT'D)

**The hidden measurement div pattern** is critical. Create an offscreen `<div>` with identical CSS (font-family, font-size, line-height, width, margins, padding) to the editor's content area. To measure a node's height, clone its content into this div and read `getBoundingClientRect().height`. This avoids the feedback loop where widget heights corrupt subsequent measurements. Marijn confirmed that the plugin's `apply` function runs before DOM updates, so decorations are calculated against a stable state.

**Known technical issues to handle:**
- `view.coordsAtPos(pos)` may return widget coordinates instead of content node coordinates (ProseMirror issue #723) — may need custom `scrollIntoView` logic
- Widget decorations should use `key` for efficient diffing across transactions
- Use `DecorationSet.map(tr.mapping)` to update positions on document changes, with full recalculation only when content actually changes

**Performance:** ~120 widget decorations and ~6,600 paragraph nodes is well within ProseMirror's comfort zone. Debounce recalculation with `requestAnimationFrame` and recalculate incrementally from the changed page forward — changes on page 3 cannot affect pages 1-2.

### Approach B (multiple editor instances): avoid this

120+ ProseMirror instances will cause severe performance degradation. Marijn directly warned that performance issues come from "browser layout and editing handling" with many instances. Cross-instance selection, cursor movement, and unified undo/redo have no built-in support and would require enormous custom infrastructure. **No production editor uses this approach for pagination.**

### Approach C (CSS floats): useful for visual layer only

Badon Writer proves this handles 450+ pages performantly. The technique — `display: contents` on the editor wrapper with float-based page dividers — creates beautiful visual page boundaries. However, breaks are purely visual and **not content-aware**. For screenplay rules requiring (MORE)/(CONT'D) insertion, character-name keep-together, and sentence-boundary breaks, this alone is insufficient. A hybrid approach — CSS floats for the visual layer combined with a content-aware plugin that adjusts break positions — could work but adds complexity over the pure widget approach.

### Approach D (overflow clipping): non-viable

A single contenteditable can only exist once in the DOM. You cannot create multiple "viewports" into the same editable element. Browser selection and cursor rendering are tied to the single DOM instance. **This approach is fundamentally incompatible with how contenteditable works.**

### Approach E (CSS transforms): risky and unproven

CSS `transform: translateY()` on nodes would visually push content past page gaps. However, `getBoundingClientRect()` returns post-transform coordinates, which would confuse ProseMirror's coordinate mapping. WebKit has documented bugs with contenteditable cursor positioning when transforms are applied. The ProseMirror changelog includes specific fixes for `scrollRectIntoView` with `transform: scale`. **No editor uses this approach, and browser bugs make it unreliable.**

### Approach F (virtual scrolling): premature optimization

Marijn said in November 2025 that virtual scrolling for ProseMirror is "definitely tricky to get right, but I don't see a reason why it couldn't work." However, no working implementation exists. For a 120-page screenplay (~6,600 simple paragraph nodes), ProseMirror handles the full DOM without virtual scrolling. If performance becomes an issue later, decoration-based occlusion culling (hiding off-screen pages via decorations) can be layered on without architectural changes.

---

## Technical pitfalls that will bite you

### Subpixel accumulation ruins naive height math

`getBoundingClientRect()` returns floating-point values (e.g., `height: 18.333px`). Over 55 lines, summing individual heights introduces floating-point drift. **Always measure containers holistically** — compute `lastChild.getBoundingClientRect().bottom - container.getBoundingClientRect().top` rather than summing individual `height` values. Use tolerance-based comparison with **~0.5px epsilon** for page overflow detection: `if (contentHeight > pageHeight - 0.5)`. Never use `Math.round()` on intermediate measurements; only round at the final comparison.

```javascript
// Correct: direct offset measurement
function contentExceedsPage(container, pageHeight) {
  const containerTop = container.getBoundingClientRect().top;
  const lastChild = container.lastElementChild;
  const lastBottom = lastChild.getBoundingClientRect().bottom;
  return (lastBottom - containerTop) > (pageHeight - 0.5);
}
```

### The inch-to-pixel problem has a simple answer

**CSS `1in` always equals exactly `96px`** — this is a fixed mathematical relationship, not a physical one. On a 110 DPI display, a CSS "inch" is actually ~0.87 physical inches. You cannot make CSS inches match physical inches on arbitrary screens. The correct approach for your editor: **define US Letter as 816×1056 CSS pixels** (8.5 × 96, 11 × 96). Work exclusively in CSS pixels for all measurement and pagination logic. Physical accuracy only matters at print time, and browsers handle CSS-to-physical mapping correctly for `@media print`.

Screenplay margins in CSS pixels at 96 dpi: **144px left** (1.5"), **96px right** (1"), **96px top** (1"), **72–96px bottom** (0.75"–1"). Content area width: **576px**. Content area height: approximately **864–888px** depending on bottom margin choice.

### Bundle your font or accept cross-platform drift

Browsers read different metric tables from font files: **macOS uses the `hhea` table**, Windows uses the **`OS/2` table**, and Firefox respects the `useTypoMetrics` flag. This means identical Courier New font files produce different `line-height: normal` values across platforms. The fix is absolute: **bundle Courier Prime (open-source, designed for screenplays) as a WOFF2 file via `@font-face`** and set an explicit pixel-based line-height.

```css
@font-face {
  font-family: "ScreenplayCourier";
  src: url("courier-prime.woff2") format("woff2");
}

.editor-content {
  font-family: "ScreenplayCourier", "Courier New", monospace;
  font-size: 16px;        /* ~12pt at 96dpi */
  line-height: 20px;      /* Fixed pixel value — never use 'normal' */
}

.editor-content * {
  line-height: inherit;   /* Prevent strut-related height surprises */
}
```

The CSS "strut" — an invisible zero-width character at the start of every line box that inherits the parent's font metrics — can add 1-5px of unexpected height per line if different fonts appear inline. Setting `line-height: inherit` on all children prevents this. **Never use `line-height: normal`** for pagination — it's the single largest source of cross-platform measurement inconsistency.

### Lock the zoom and own the scaling

**Disable browser zoom in Tauri** using `zoom_hotkeys_enabled: false` in `WebviewBuilder` and disable pinch zoom (on Windows: `--disable-pinch` via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`). Implement your own zoom via `transform: scale()` on the document container. This keeps all internal measurements in a stable CSS pixel coordinate system. `getBoundingClientRect()` returns post-transform values, so if you need raw measurements, divide by the current scale factor.

Tauri 2.0's `set_zoom()` API can also set the WebView zoom programmatically. Listen for `onScaleChanged` events to detect when the window moves between monitors with different DPI.

### Use ProseMirror's transaction hooks, not DOM observers

For change detection, **ProseMirror's plugin `apply` and `appendTransaction` hooks are superior to both ResizeObserver and MutationObserver**. They fire at the document model level on every state change, before DOM updates. Use `ResizeObserver` only as a safety net for cases where external factors (window resize, font loading) change layout without triggering a ProseMirror transaction.

**Debounce pagination via `requestAnimationFrame`** — it runs before the next repaint, naturally coalesces multiple calls per frame, and ensures measurements reflect the current layout. Never use `requestIdleCallback` for DOM measurements as it forces a synchronous layout reflow.

```javascript
let paginationPending = false;
let paginationStartPage = Infinity;

function schedulePagination(fromPageIndex = 0) {
  paginationStartPage = Math.min(paginationStartPage, fromPageIndex);
  if (!paginationPending) {
    paginationPending = true;
    requestAnimationFrame(() => {
      paginationPending = false;
      const startPage = paginationStartPage;
      paginationStartPage = Infinity;
      recalculateFromPage(startPage);
    });
  }
}
```

**Incremental recalculation** is essential: only recalculate from the edited page forward. Content changes on page 3 cannot affect pages 1-2. For a 120-page document, this typically means recalculating 1-3 pages per keystroke rather than all 120.

---

## Concrete implementation recommendation

For a Tauri 2.0 + React + Tiptap v2 screenplay editor, the architecture should be:

**Single Tiptap editor** with a custom screenplay schema (scene-heading, action, character, dialogue, parenthetical, transition nodes). A `PaginationPlugin` implemented as a ProseMirror `StateField` returns a `DecorationSet` with widget decorations at page break positions. Page dimensions fixed at **816×1056 CSS pixels**. A hidden measurement div with matching CSS provides node height calculations free from the decoration feedback loop. Screenplay-specific constraint rules (orphan prevention, dialogue splitting with MORE/CONT'D, sentence-boundary breaks) applied as a post-processing pass over the initial break positions. Font: bundled Courier Prime at `font-size: 16px; line-height: 20px`. Zoom: locked in Tauri, custom zoom via `transform: scale()`.

This architecture is proven by Ben Cahan's screenplay editor, aligns with CKEditor's commercial pagination approach, and is the only approach that combines ProseMirror's native editing experience with content-aware screenplay pagination rules. Celtx — the major production screenplay editor built on ProseMirror — uses a node-splitting variant, but the widget decoration approach is simpler to implement and maintain while achieving equivalent results for the screenplay use case where page structure doesn't need to persist in the document model (since no screenplay format stores pagination).

For reference implementations, examine Ben Cahan's ProseMirror forum posts (discuss.prosemirror.net, username "bencahan", November 2025 threads on widget decorations and node measurement), `tiptap-pagination-plus` on GitHub for CSS-based visual page gap styling, and Afterwriting's `liner.js` on GitHub for the screenplay-specific constraint satisfaction algorithm that handles recursive break adjustment with (MORE)/(CONT'D) insertion.