# 4) Problem Library (Reader) — Detailed Plan

## 4.0 Experience north star

- **Feel:** Calm confidence. Clean typography, generous but disciplined spacing, quiet color accents, and **micro-interactions under 200 ms**. Nothing flashy; everything intentional.
- **Speed:** Perceived instant. **Cached TTFB** **&lt;** **200 ms**; **LCP** **&lt;** **1.2 s** on mid-tier. No layout jank.
- **Focus:** Reading first. Editor-friendly statements (math + code), zero distractions.

---

## 4.1 Information architecture (URLs & navigation)

- **/problems** — Library index (list + filters + search).
- **/problems/[slug]** — Problem details (statement, constraints, examples, samples).
- **/tags/[slug]** — Pre-filtered view of /problems.
- **/difficulty/[level]** — Pre-filtered view (Easy/Medium/Hard).
- **Search deep links** — Query param reflects filters: `?q=two+sum&tags=hashing,arrays&difficulty=easy`.

**Rules**

- Every filter/search action updates the URL (shareable state).
- Breadcrumbs: `Problems › Arrays › Two Sum` with gentle fade-in on navigation.

---

## 4.2 Pages & key sections

### A) Problem List (Library Index)

**Layout**

- **Left rail** (collapsible on mobile): Filters.
- **Main column**: Virtualized list of **Problem Cards**.
- **Top bar**: Search input + result count + sort (Relevance/Newest/Difficulty).

**Problem Card (compact, elegant)**

- Title (clickable), difficulty pill (color-coded, low saturation), small tag chips (max 3 visible + “+2”).
- Status chip (Solved / Attempted / Unseen) aligned right; neutral colors until hover.
- Tiny acceptance bar (subtle 1–2px track) with tooltip on hover.
- Row hover: **2 px elevation + 2% background tint**; **120 ms** ease-out.

**Filters (left rail)**

- Difficulty (radio), Tags (searchable checklist), Status (checkbox), Topics (grouped), “Only with editorial” (toggle).
- **“Clear all”** appears only when active.
- Apply changes instantly (debounced); no “Apply” button.

**Empty &amp; Loading**

- **Skeletons** with consistent rhythm (title line, two meta lines).
- Empty state: friendly copy + “Reset filters” button; never a blank page.

**Accessibility**

- Tab order: Search → Sort → Filters → Results.
- Arrow-key navigation within the results list.
- 44px touch targets everywhere.

---

### B) Problem Details (Reader)

**Header**

- Title, difficulty, tag chips, **status chip**, and a **“Start solving” primary action** (anchors to editor section).
- Secondary actions: **Save** (if you add favorites), **Share** (copy link), **Report issue** (modal).

**Content body (reading comfort)**

- **Readable line width** (66–78ch), **1.6–1.75 line-height**, generous spacing between sections.
- Sections: **Statement**, **Constraints**, **Examples**, **Notes/Hints** (if present), **Samples I/O** (collapsible).
- **KaTeX** for math, **inline code** and **fenced blocks** with copy buttons (quiet, appear on hover).
- Anchor links for H2/H3; appear as a subtle “#” on hover.

**Side rail (desktop)**

- **Quick nav** (sticky): jumps to sections; highlights current section on scroll (scroll-spy, 150 ms fade).
- “Related problems” list (max 5) with small difficulty pills.

**Micro-interactions**

- Anchor scrolling: **smooth, 180 ms**, respects reduced-motion.
- Copy-to-clipboard: brief toast, **90 ms** scale-in.
- Section collapse/expand (e.g., samples): **height auto** with **150 ms** easing; no accordion overkill.

**Status &amp; progress**

- If user is authed: show **attempted/solved** state inline; last submission timestamp with tiny clock icon.
- Gentle **progress meter** at the top for multi-part problems (optional).

---

## 4.3 Visual design system (balanced minimal)

- **Typography:** One clean sans (e.g., Inter) for UI; use a mono for code. Sizes: 18–20px base on desktop, 16–18px mobile. Titles +2 steps, section heads +1 step.
- **Color:** Neutral canvas; accent palette for difficulty (Easy mint, Medium amber, Hard coral) **at** **~40–50% saturation** to stay calm.
- **Elevation:** 0, 2, 4 levels only. Shadows ultra-soft; borders 1px subtle.
- **Spacing scale:** 8-pt. Keep consistent vertical rhythm; avoid cramped blocks.
- **Corners:** 10–12px radii; consistent across cards, inputs, pills.
- **Dark mode:** True support (not inverted): ensure contrast, soften hard whites, keep difficulty colors legible.

---

## 4.4 Motion & transitions (strictly subtle)

- **Durations:** 120–200 ms for most; 250 ms for page-level transitions.
- **Easing:** Standard curves (`easeOut`, `easeInOut`)—no bounce/elastic.
- **Scope:** Hover/focus, list row entrance (staggered 20 ms per item, capped at 6 items), filter panel open/close, anchor scroll.
- **Reduced motion:** Respect `prefers-reduced-motion`; turn motion into instantaneous state changes.

---

## 4.5 Search & filtering behavior

- **Search input:** Debounced 250 ms; shows result count changes live; retains the query on navigation back.
- **Synonyms &amp; fuzziness (optional):** Lightweight server synonym map (e.g., “two sum” → `two-sum`) before you add real search infra.
- **Sorting:** Relevance (default when q present), else **Newest**, with Difficulty as secondary sort stable.
- **Persistence:** Filters persist per session (query params are source of truth).

---

## 4.6 Performance plan (how it stays fast)

- **tRPC + React Query** with **edge/ISR** for public reads:
  - `/problems` and `/problems/[slug]` pre-rendered (ISR) with short TTL; React Query **hydrates** to avoid re-fetch.
  - Query **staleTime**: 60–300 s for public lists/details.

- **Virtualization** for large lists (2k+ items).
- **Image &amp; asset hygiene:** Lazy-load only related thumbnails (if any), avoid heavy images in statements.
- **Content versioning:** ProblemVersion exposes an `etag`/`dataHash` so client can short-circuit if unchanged.
- **Database:** Composite indexes for (`state`,`visibility`,`difficulty`,`createdAt`), and for tag filters.

---

## 4.7 Accessibility (baked in)

- Semantic structure: `h1` title, `nav` for quick nav, `section` per block.
- **Skip to content** link; keyboard focus outlines visible and tasteful.
- Alt text for any diagram; math has accessible text via KaTeX.
- Color contrast AA at minimum; check difficulty pills against background in both themes.

---

## 4.8 SEO & shareability

- **Dynamic metadata**: Title \= `Problem • <title> | OpenSolve`; description \= first 150–160 chars from statement (sanitized).
- **Sitemaps**: `/sitemap.xml` for problems, tags, difficulty.
- **OG images** (optional): auto-generated image with title, difficulty pill, and 2–3 tag chips.
- **Canonical URLs**: lock to lowercase slug; redirect old slugs via redirect map.
- **Structured data**: `FAQPage`/`Article`-style for statement sections (optional, non-spammy).

---

## 4.9 States & errors (graceful always)

- **Loading:** Skeletons only; no spinners for lists.
- **Partial failure:** If related problems fail, hide the rail, keep the reader.
- **Not found:** Charming 404 with quick search and a “Back to library” button.
- **Rate-limit/surge:** Calm banner (“Heavy traffic—results may be slower”); never block reading.

---

## 4.10 Telemetry & quality signals

- **UX metrics:** TTFB, LCP, CLS, scroll depth, copy-button usage, anchor clicks.
- **Content health:** Problems with high bounce or low completion get a “needs review” flag for curators.
- **Search quality:** Top queries with 0 results; tag/difficulty combinations with low CTR.

---

## 4.11 Mobile & responsiveness

- Filters slide-in from the bottom on small screens; **drag-to-dismiss** with 25% threshold.
- Problem Card condenses: two-line title clamp, status chip moves under title.
- Sticky **“Start solving”** button on details page when editor isn’t visible.

---

## 4.12 Security & privacy (reader scope)

- Don’t expose hidden test cases or editorial until published/released.
- Avoid embedding third-party iframes in statements; sanitize aggressively.
- Links in statements: open in new tab with `rel="noopener"` (conceptually—no code).

---

## 4.13 Definition of Done (Reader)

- **Findability:** Search + filters return relevant results; deep links reflect state.
- **Speed:** Library index **TTFB** **&lt;** **200 ms** cached; **LCP** **&lt;** **1.2 s** typical.
- **Readability:** Statement renders math, code, and examples perfectly on mobile & desktop.
- **Polish:** Subtle animations only; no distracting motion; dark mode looks native.
- **A11y:** Keyboard-navigable, screen-reader friendly; color contrast AA+.
- **Observability:** Dashboard shows UX metrics and search-zero results.
- **Consistency:** URL is the source of truth; back/forward works as expected with no state loss.

---

## 4.14 “Unique but tasteful” touches (optional)

- **Section progress dots** in the side rail that fill as you scroll (2px stroke, 150 ms fill).
- **Reading focus mode**: Toggle that collapses side rails and slightly increases font size/line-height—remembers preference.
- **Subtle confetti** (reduced-motion aware) when user gets their **first AC** on a problem, shown on returning to details page—single burst, under 600 ms.
