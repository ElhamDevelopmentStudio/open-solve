## 6.1 Architecture & Stack

- **Frontend:** Next.js (App Router) + **React + Codemirror**.
- **Data Layer:** **tRPC + React Query**.
- **Backend:** tRPC procedures (judge queue & status).
- **Realtime updates:** via WebSocket subscription.
- **Persistence:** LocalStorage or IndexedDB per user/problem/language draft.

---

## 6.2 Page Layout

**URL:** `/problems/[slug]/editor` and tabbed inside the Problem page (Both for better user experience).

### Main sections

1. **Top Bar**
   - Problem title + difficulty pill.
   - Tabs: _Description_, _Editorial (if released)_ , _Submissions_, _My Code_.
   - Timer indicator (for contests).

2. **Code Editor Panel (left)**
   - Codemierror instance (language aware, syntax-highlighted, dark/light theme sync).
   - Language selector dropdown (auto loads boilerplate aka code stub).
   - Line numbers, minimap hidden by default, toggleable.
   - Adjustable font size and theme (user preference persisted).
   - Autosave status (“Saved” / “Saving…” pulse).

3. **I/O &amp; Actions Panel (right)**
   - Input box (stdin) + output box (stdout).
   - Buttons:
     - **Run Code** → executes against _sample tests_.
     - **Submit Code** → sends to _judge queue_.

   - Result display area: verdicts, runtime, memory, per-test info.

4. **Console Panel (bottom)**
   - Shows logs, compiler messages, errors, judge feedback.
   - Collapsible with smooth 150 ms transition.

5. **Side Drawer (mobile)**
   - Problem statement toggle; editor and I/O stacked vertically.

---

## 6.3 Editor Features

- **Languages:** from your `Language` table (`cpp17`, `python3`, `java17`, `node20`…).
- **Boilerplate aka Code Stubs:** default snippets per language stored server-side and fetched once.
- **Syntax &amp; Formatting:** Codemirror with built-in prettier-style formatting per language.
- **Shortcuts:**
  - Ctrl+Enter / Cmd+Enter → Run
  - Ctrl+Shift+Enter → Submit
  - Ctrl+S → Save draft (manual)

- **Autosave:**
  - On typing pause (2 s debounce).
  - On language change.
  - On page/tab close (via beforeunload hook).

- **Draft key pattern:** `code:${userId}:${problemId}:${language}` in IndexedDB.

---

## 6.4 Actions & tRPC flow

### Run (fast path)

Purpose: quick check using **public samples only**.

**tRPC procedure:** `submissions.runSample`

- Input: problemId, languageCode, sourceCode.
- Behavior:
  - Uses local lightweight judge (no queue).
  - Runs against sample tests only.
  - Returns per-sample results (Expected vs Actual + runtime + memory).

- UX:
  - “Running…” state: button animates pulse (≤ 250 ms).
  - Verdicts fade-in sequentially.
  - Failures highlight with soft coral background; success \= mint tint.
  - Compile/runtime errors appear in console panel.

**Rules:** No hidden tests. Not recorded as a submission.

---

### Submit (full judge)

Purpose: enqueue for backend worker to run all tests.

**tRPC procedures:**

- `submissions.create` → enqueues job.
- `submissions.get(id)` → polls result until done.

**Flow:**

1. User clicks **Submit**.
2. `submissions.create` returns `submissionId`.
3. React Query starts polling `submissions.get(id)` every 1–2 s.
4. Judge worker runs all hidden tests in Docker sandbox.
5. Once verdicts ready → backend emits final state.

**Client states:**

- 🟡 _Pending_ — queued.
- 🔵 _Running_ — worker active; progress bar animates gently.
- 🟢 _Accepted_ — highlight mint; show runtime & memory summary.
- 🔴 _Wrong Answer / Error / TLE / MLE / RE / CE_ — red tint, expandable details.

**DoD:** user sees transition _pending → running → finished_ smoothly, no reload.

---

## 6.5 Result Display (Verdict Panel)

- **Top summary card:** overall verdict, time, memory, language icon.
- **Expandable per-test table:**
  - Columns: #, Status, Time (ms), Memory (KB), Input (toggle), Expected, Output, Error.
  - Animations: fade/slide in ≤ 200 ms per test.

- **Tabs:**
  - _All Tests_
  - _Failed Only_
  - _Details (stderr)_ .

- **Icons:** AC ✅, WA ❌, TLE ⏱️, MLE 💾, RE ⚙️, CE 🧩.
- **Retry link:** “Try again” resets console and highlights input box.

---

## 6.6 Code Persistence

- **Autosave locally** (per problem & language).
- **Cloud sync** (optional, if logged in):
  - tRPC: `submissions.saveDraft` / `getDraft`.
  - Keep 1–3 recent drafts per problem+language.

- **Recovery:** on page open, detect unsaved local code; prompt “Restore previous draft?”
- **Autosave indicator:** small dot next to filename fades in/out subtly on save.

---

## 6.7 Error & Edge Handling

- **Compile Errors:** Show compiler stderr in console with line highlights.
- **Runtime Errors:** Show message + stacktrace if language supports it.
- **TLE/MLE:** gentle warning color + explanation (“Time limit exceeded on Test #4”).
- **Disconnected:** retain state, pause polling, retry automatically on reconnect.
- **Judge overloaded:** fallback banner (“Judging queue is busy—expect slight delay”).
- **Multiple tabs:** warn if same problem open in another tab (prevent draft overwrite).

---

## 6.8 Accessibility & UX polish

- Full keyboard navigation:
  - Tab cycles inputs/buttons.
  - Escape closes modals or console.

- Font size & theme toggle persistent.
- High-contrast mode & reduced-motion support.
- Button states color-shift subtly (not flash).
- Smooth scrolling between I/O and results (\< 150 ms).
- Sounds disabled by default (optional success chime).

---

## 6.9 Performance & Responsiveness

- **React Query config:**
  - `staleTime = 0` for live verdicts.
  - Polling stops once `isTerminal = true`.

- **Network load:**
  - Sample runs light, instant; full judge runs async.
  - Queue concurrency metrics tracked.

- **Editor perf:** Lazy-load Codemirror on demand; split chunk for languages.
- **Edge caching:** Problem + language list pre-fetched server-side.

**Target UX metrics:**

- Initial editor load \< 1.5 s.
- Run response \< 300 ms for samples.
- Submit acknowledgment \< 200 ms.
- Verdict polling latency \< 2 s average.

---

## 6.10 Integration with Judge System

- `submissions.create` inserts job → Redis queue.
- Worker runs inside Docker with time/memory caps.
- Judge emits back results stored in DB (status, verdict, resource use).
- tRPC polls that state until `isTerminal = true`.

---

## 6.11 Contests & Ranking Mode (later)

- Same flow, but hide verdict details until contest end.
- Timer synced with contest window.
- Verdict displayed as “Submitted / Pending evaluation”.
- Post-contest → full feedback & upsolving enabled.

---

## 6.12 Definition of Done (Submission Flow)

- [ ] Monaco editor loads fast, theme matches global style.
- [ ] User can select any language; boilerplate loaded automatically.
- [ ] Autosave works across refresh and tabs.
- [ ] Run executes samples instantly; Submit enqueues judge.
- [ ] State transitions visible and smooth.
- [ ] Per-test results show correctly; errors informative.
- [ ] Verdict polling stops cleanly on completion.
- [ ] Drafts persistent; local restore works.
- [ ] Mobile layout usable (vertical stacking, collapsible console).
- [ ] UI aesthetic matches Reader: calm, clean, minimal, with subtle motion.
- [ ] No reloads needed for full interaction cycle.

---

## 6.13 Optional Delight Features ✨

- **Result celebration:** subtle confetti burst (≤ 600 ms) on first AC per problem.
- **Submission timeline:** side panel showing previous attempts with verdict colors.
- **Diff viewer:** compare current code to last Accepted.
- **Offline-ready drafts:** edit + run samples locally even when disconnected.

---

### 💡 Summary

This flow should make coding on OpenSolve feel like using a high-end IDE inside the browser —
**smooth, reliable, respectful of the user’s focus, and visually balanced.**
Every action—run, submit, view results—should be **instant in perception**, **polished in motion**, and **predictable in behavior**, without ever distracting from the craft of problem solving.
