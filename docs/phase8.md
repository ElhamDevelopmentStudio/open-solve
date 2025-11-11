
# 8) Submissions & History

## 🎯 Goals

Make users’ progress **visible, trustworthy, and actionable**.  
A user should quickly review past attempts, understand why a run failed, and resubmit confidently — while staff can audit any submission.

----------

## 8.1 Information Architecture & Routes

-   **/submissions** — “My Submissions” hub (filters + table or cards).
    
-   **/submissions/[id]** — Submission detail (verdict, per-test, code, timeline).
    
-   **/problems/[slug]/submissions** — Contextual list scoped to a problem.
    
-   **Share links** — `/share/s/[publicId]` (read-only view if user shared).
    

**URL state** mirrors filters & paging (deep-linkable):  
`/submissions?problem=two-sum&status=WA,AC&lang=cpp17&from=2025-10-01&to=2025-11-13&page=2`

----------

## 8.2 Views & UX

### A) My Submissions (List)

-   **Filters**: Problem, Status (AC/WA/TLE/MLE/RE/CE/Manual), Language, Date range, Contest/non-contest.
    
-   **Sort**: Newest (default), Fastest (time), Lowest memory, First AC.
    
-   **Artifacts shown** per row:
    
    -   Verdict pill + icon, runtime, memory, language, problem link, timestamp.
        
    -   If AC: small “First AC” star on the earliest accepted for that problem.
        
-   **Row Interactions**:
    
    -   Hover micro-elevation (≤120 ms); click opens detail.
        
    -   Quick actions: “Open code”, “Resubmit”, “Copy id”.
        
-   **Empty/Loading**:
    
    -   Skeletons with steady rhythm.
        
    -   Friendly empty state (“No submissions yet — pick a problem to start!”).
        

**Pagination**: Cursor-based infinite scrolling (with “Jump to top” chip).

----------

### B) Submission Detail

-   **Header**: Verdict + problem title, language chip, submitted at, wall-clock runtime, memory, judge node (optional), manual/auto badge.
    
-   **Summary card**: overall result + short explanation (e.g., “Wrong answer on test #7”).
    
-   **Per-test panel**:
    
    -   Tabs: **All**, **Failed only**, **Stderr**.
        
    -   Table columns: #, Status, Time, Memory, toggle Input/Expected/Output, Error (if any).
        
    -   Smooth reveal (≤200 ms). Large I/O collapsible with “View more…”.
        
-   **Code viewer**:
    
    -   Read-only, monospaced, copy button on hover.
        
    -   Optional line-wrap toggle; go-to-line from compiler diagnostics.
        
-   **Timeline**:
    
    -   `QUEUED → RUNNING → FINISHED` with timestamps (and `MANUAL_PENDING → MANUAL_ACCEPTED/REJECTED` if manual).
        
    -   “Resubmit” button aligned right; subtle affordance, not loud.
        

**Contest mode** (when applicable):

-   During contest: restrict details (no per-test breakdown), show “Evaluation pending or hidden until contest ends”.
    
-   After contest: unlock full breakdown and enable upsolving banner.
    

----------

## 8.3 Actions & Constraints

-   **Re-run**: Disabled (keeps determinism & prevents gaming).
    
-   **Resubmit**: Allowed; confirm modal if same code hash (warns “Same code as last time”).
    
-   **Share**:
    
    -   Default **private**.
        
    -   User can **toggle shareable link** → creates publicId (read-only view; no personal metadata).
        
    -   Revoking share invalidates the publicId.
        
-   **Delete submission**: Not allowed (auditability). Users may request **code hide** (staff can hide from public profile; still visible to staff).
    

----------

## 8.4 Diffs & Comparisons

-   **Attempt vs Accepted** (optional initial or v1.1):
    
    -   Side-by-side or inline diff (unified), whitespace-aware.
        
    -   Quick selects: “Compare with previous”, “Compare with last AC”.
        
-   **Performance deltas**:
    
    -   Chips showing time/memory difference vs last attempt (▲/▼ with neutral colors).
        
-   **Edge case**: If languages differ, show diff with language badges; suppress formatter diffs.
    

----------

## 8.5 Privacy & Sharing

-   **Default**: Only the owner and staff see the code.
    
-   **Share link**: anonymous, read-only, expiring if user revokes.
    
-   **Public profiles**:
    
    -   Show verdict history **without code** by default.
        
    -   If user opts-in to “Show code for ACs”, expose only AC code under a separate opt-in flag.
        
-   **Manual judge privacy**:
    
    -   Reviewer notes are **staff-only**; user sees “Reviewed” + optional public note if provided.
        

----------

## 8.6 Anti-Cheat & Integrity

-   **Duplicate detection**: same code hash, rapid repeat submissions → gentle cooldown.
    
-   **Similarity** (optional later): near-duplicate detection across users (locality-sensitive hashing).
    
-   **Contest protections**: throttling, hidden feedback until finish, no share links during contest.
    
-   **Anomaly flags**: sudden spike of ACs, IP churn, device change → staff review queue.
    

----------

## 8.7 tRPC Surface (conceptual, no code)

**Queries**

-   `submissions.listMine({ filters, cursor, limit })`
    
-   `submissions.listByProblem({ problemId, filters, cursor })`
    
-   `submissions.get({ id })`
    
-   `submissions.getShare({ publicId })` (read-only)
    
-   `submissions.getTimeline({ id })` (optional separate endpoint)
    

**Mutations**

-   `submissions.create({ problemId, languageCode, sourceRef })` (already in Section 6/7)
    
-   `submissions.resubmit({ fromSubmissionId })`
    
-   `submissions.share.enable({ id })` → returns `publicId`
    
-   `submissions.share.disable({ id })`
    
-   `submissions.hideFromProfile({ id })` (user-owned flag)
    
-   **Admin**: `admin.submissions.setVisibility`, `admin.submissions.rejudge`, `admin.submissions.note`
    

**Auth & RBAC**

-   USER can access only their own submissions.
    
-   MODERATOR/PROBLEM_CURATOR/ADMIN can fetch any submission.
    
-   Manual judge notes require curator/admin.
    

----------

## 8.8 React Query & Performance

-   **Keys**:
    
    -   `['trpc','submissions.listMine', hash(filters)]`
        
    -   `['trpc','submissions.get', id]`
        
-   **Stale times**:
    
    -   Lists: 15–60 s.
        
    -   Detail: 0–10 s until terminal; then 5–10 min.
        
-   **Infinite lists** for history; cursor never duplicates.
    
-   **Prefetch** detail data when hovering list row (tiny perceived speed win).
    
-   **Edge/ISR**: none for private data; public share pages can be short-cached if code is static.
    

----------

## 8.9 Data Model Notes (tie-in to Section 2)

-   `Submission` stores:
    
    -   `userId`, `problemId`, `languageCode`, `sourceCodeRef`, `codeHash`
        
    -   `verdict`, `timeUsedMs`, `memoryUsedKb`, `judgeNodeId`, `isManual`, `manualReviewerId?`, `score?` (for partial)
        
-   `SubmissionCaseResult` for per-test details.
    
-   `SubmissionShare` (or fields on Submission): `publicId`, `sharedAt`, `revokedAt`.
    
-   Indexes for (`userId`,`problemId`,`createdAt`), (`problemId`,`verdict`,`createdAt`), `codeHash`.
    

----------

## 8.10 Admin & Staff Tools

-   **Global search** by user, problem, verdict, date, language, code hash.
    
-   **Open submission**: full detail, per-test, logs.
    
-   **Actions**:
    
    -   Rejudge (single / bulk by problem/version).
        
    -   Hide/unhide from public profile.
        
    -   Add staff note (private).
        
    -   Mark for manual review (retroactively), assign reviewer.
        
-   **Batch views** for incidents (e.g., checker bug → rejudge cohort).
    

----------

## 8.11 Accessibility & UI polish

-   Keyboard-navigable tables and tabs.
    
-   Copy buttons for code and submission id with **<100 ms** feedback.
    
-   Gentle color palette: success mint, warn amber, fail coral — low saturation.
    
-   Large I/O blocks collapsed by default; “Expand all” available.
    
-   Reduced-motion honored (no stagger animations).
    

----------

## 8.12 Telemetry & Quality

-   Metrics:
    
    -   Submissions per user/day, AC rate, attempts-to-AC median.
        
    -   Time from submit → verdict (P50/P95).
        
    -   Re-submit rate after failure, same-hash resubmits.
        
-   Zero-result filters tracked to improve UX copy or defaults.
    
-   Staff dashboard: “High churn problem” and “Suspicious ACs” cards.
    

----------

## 8.13 Definition of Done (Submissions & History)

-   Users can filter, sort, and browse their history without jank.
    
-   Submission detail shows verdict summary + per-test breakdown clearly.
    
-   Re-run disabled; **resubmit** works with confirmation on same code hash.
    
-   **Privacy default** is private; share links are opt-in, revocable, read-only.
    
-   (Optional) Code **diff** available vs previous or last AC; performance deltas shown.
    
-   Contest constraints respected (limited feedback until end).
    
-   Admins/moderators can inspect any submission and take actions (rejudge/hide/note).
    
-   React Query keys and pagination stable; no duplicate rows on scroll.
    
-   A11y and performance targets met (quick open, smooth transitions).
    

----------

## 8.14 Optional Delight Features ✨

-   **Submission timeline strip** on problem page: tiny colored dots showing attempt history at a glance.
    
-   **“Learning moment” chips** on failures (e.g., “Overflow likely”, “Off-by-one” — non-AI heuristics).
    
-   **Saved filters** (“Show only WA in Python” preset).
    
-   **Story mode**: narrates journey from first try → AC (for social share, without code).