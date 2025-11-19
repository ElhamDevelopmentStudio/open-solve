# ✅ Problem Library (Reader) — UI & UX Acceptance Checklist

---

## 🧭 1. Structure & Navigation

- [ ] **URLs follow IA:** `/problems`, `/problems/[slug]`, `/tags/[slug]`, `/difficulty/[level]`
- [ ] Every filter/search updates the URL query params correctly (no hidden state).
- [ ] Breadcrumbs show current hierarchy (`Problems › Arrays › Two Sum`) and animate in with a **&lt;150 ms fade**.
- [ ] Browser **Back/Forward** restores scroll and filters accurately.
- [ ] Deep link to any problem (with filters active) restores state on load.

---

## 📑 2. Problem List Page

- [ ] Layout:
  - [ ] Left rail (filters) collapsible; main list virtualized.
  - [ ] Top bar includes search input, result count, and sort selector.

- [ ] **Problem cards** show: title, difficulty pill, 2–3 tag chips (+ “+2”), and status chip.
- [ ] Status chips: Solved \= green tint (40% saturation), Attempted \= amber tint, Unseen \= neutral gray.
- [ ] Acceptance rate bar present (1–2 px track; tooltip on hover).
- [ ] Row hover: 2 px elevation + 2% background tint, ease-out 120 ms.
- [ ] Virtualization: \> 1,000 items scroll smoothly, no layout shifts.
- [ ] Filters update instantly (≤ 300 ms debounce) and are reflected in query string.
- [ ] “Clear all” only appears when filters are active.
- [ ] Empty state: friendly copy + “Reset filters” button.
- [ ] Loading skeleton: consistent rhythm (title + meta lines).
- [ ] Keyboard focus moves logically: Search → Sort → Filters → Results.

---

## 📖 3. Problem Details Page

- [ ] Header: Title, difficulty, tag chips, **status chip**, “Start Solving” button.
- [ ] Secondary actions visible on hover/focus: Save / Share / Report Issue.
- [ ] Reading width ≈ 66–78 ch; line-height ≈ 1.6–1.75.
- [ ] Sections: Statement → Constraints → Examples → Notes/Hints → Samples I/O.
- [ ] Math renders with KaTeX; code blocks with copy buttons (visible on hover).
- [ ] “Copy” toast animates in ≤ 100 ms, fades out ≤ 200 ms.
- [ ] Anchor links (section “#”) appear subtly on hover.
- [ ] Side rail scroll-spy works (current section highlights with 150 ms fade).
- [ ] Related problems list ≤ 5 items; difficulty pills consistent.
- [ ] Smooth scroll to anchors (≤ 180 ms, ease-in-out).
- [ ] Collapsible sections (e.g., samples) expand/collapse ≤ 150 ms, easing smooth.
- [ ] Solved/Attempted state visible if user authed; timestamp with clock icon.
- [ ] Optional progress meter at top updates as user scrolls.

---

## 🎨 4. Visual Design Consistency

- [ ] Font stack: clean sans (e.g., Inter) for text + mono for code.
- [ ] Font sizes: 18–20 px desktop, 16–18 px mobile; headings scale +2/+1 steps.
- [ ] Difficulty colors: mint / amber / coral at \~40–50% saturation.
- [ ] Elevation levels: only 0, 2, 4.
- [ ] Shadows ultra-soft; borders 1 px neutral gray.
- [ ] Spacing grid: 8-pt; vertical rhythm consistent.
- [ ] Corner radius: 10–12 px across UI.
- [ ] Dark mode fully styled (contrast AA+).
- [ ] Typography hierarchy consistent (no rogue font weights).

---

## 🌀 5. Motion & Transitions

- [ ] No animation exceeds **250 ms**.
- [ ] All animations use **easeOut/easeInOut**, no bounce/elastic.
- [ ] Filter drawer open/close: fade + translate ≤ 200 ms.
- [ ] List entrance: stagger ≤ 20 ms per item (max 6 items).
- [ ] Reduced-motion setting respected (instant state changes).
- [ ] Page transitions (Next.js route) ≤ 250 ms fade or slide; no blur/swoosh.
- [ ] Confetti trigger (optional): single burst ≤ 600 ms on first AC only.

---

## ⚙️ 6. Performance & Data

- [ ] tRPC + React Query: public data pre-rendered (ISR) + hydrated on client.
- [ ] React Query `staleTime`: 60–300 s for public pages; user data ≤ 10 s.
- [ ] TTFB \< 200 ms (cached edge); LCP \< 1.2 s mid-tier device.
- [ ] Images lazy-loaded; no layout shift on load.
- [ ] ProblemVersion `etag` respected—no unnecessary re-fetches.
- [ ] Infinite scroll or pagination smooth; no duplicates.

---

## ♿ 7. Accessibility

- [ ] Proper semantic headings: `h1` for title, `section` for parts.
- [ ] “Skip to content” link works.
- [ ] Focus outlines visible, high contrast.
- [ ] Keyboard navigation covers all interactive elements.
- [ ] Math & code accessible (KaTeX + alt text).
- [ ] Color contrast ≥ AA.
- [ ] Touch targets ≥ 44 px.
- [ ] Reduced motion preference respected.

---

## 🔍 8. Search & Filters

- [ ] Debounced search (250 ms).
- [ ] Search bar retains query on return/navigation.
- [ ] Sorting: Relevance (if search) → Newest (default) → Difficulty.
- [ ] Filters persist via query params + session.
- [ ] Reset works instantly; no stale state.

---

## 🔒 9. Security & Privacy

- [ ] Hidden tests/editorials never exposed.
- [ ] Problem page displays only **published** problems.
- [ ] All external links sanitized; open in new tab + `rel="noopener"`.
- [ ] No user data leak in source or meta tags.

---

## 📱 10. Mobile Responsiveness

- [ ] Filters slide up from bottom; drag-to-dismiss ≥ 25% threshold.
- [ ] Problem cards stack gracefully; status chip moves under title.
- [ ] Sticky “Start Solving” button visible when editor offscreen.
- [ ] Tap animations ≤ 100 ms fade/ripple; no lag or jump.

---

## 📈 11. Observability

- [ ] Metrics logged: TTFB, LCP, CLS, scroll depth, anchor clicks, copy usage.
- [ ] “Search \= 0 results” events tracked.
- [ ] Problem bounce / completion rates visible to curators.
- [ ] Error boundaries report context (route + user role + correlation id).

---

## 🎯 12. Definition of Done Recap

- [ ] Every problem is **findable, filterable, readable** across devices.
- [ ] All flows \< 200 ms perceived response.
- [ ] No over-the-top animation; micro-interactions smooth and precise.
- [ ] Dark/light parity confirmed.
- [ ] A11y & SEO validations pass.
- [ ] QA, design, and product have all signed off using this checklist.
