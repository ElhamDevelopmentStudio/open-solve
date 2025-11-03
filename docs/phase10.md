# 10) Discussions, Editorials & Approach Trails

## 10.0 Purpose

Provide a rich, safe, and structured communication layer around problems and the platform as a whole, composed of **three systems**:

1. **Discussions** – per-problem and global threads + replies (Q&A, hints, meta).
2. **Editorials** – official staff-written explanations for each problem.
3. **Approach Trails** – structured, community-generated maps of *how* people thought about a problem (unique feature).

All features are built on **tRPC**, consumed via **React Query**, and governed by:

```ts
enum UserRole {
  USER
  PROBLEM_CURATOR
  MODERATOR
  ADMIN
}

## 10.1 Discussions

### 10.1.1 Goals

-   Allow users to ask questions, share hints, and discuss approaches.
    
-   Provide a global space for algorithm/meta topics.
    
-   Keep content useful, civil, and spoiler-conscious.
    
-   Give moderators strong but simple tools to keep things healthy.
    

### 10.1.2 Discussion Types

**1. Per-Problem Discussions**

-   URL: `/problems/[slug]/discuss`
    
-   Scoped to a single problem.
    
-   Used for:
    
    -   Clarifying statement/constraints.
        
    -   Discussing edge cases and failing test ideas.
        
    -   High-level solution ideas (without full code).
        

**2. Global Discussions Feed**

-   URL: `/discuss`
    
-   Aggregated view of:
    
    -   Global threads not tied to a specific problem (problemId = null).
        
    -   Highlighted per-problem threads (e.g., trending/hot discussions).
        
-   Used for:
    
    -   General learning (“How to get better at DP?”).
        
    -   Platform meta (“Feature ideas”, “Bug reports”).
        
    -   Cross-problem patterns (“All problems that use KMP”).
        

### 10.1.3 UX & Layout

**Per-Problem Discussions**

-   Layout:
    
    -   Left: thread list (for that problem).
        
    -   Center: selected thread + replies.
        
    -   Right: problem info (difficulty, tags), editorial link (if released), rules.
        
-   Thread list:
    
    -   Sort: `Top`, `Recent`, `Unanswered`.
        
    -   Each item: title, score, reply count, author, timestamp, spoiler chip if applicable.
        
-   Thread detail:
    
    -   Metadata: title, author, timestamp, score.
        
    -   Body: Markdown + KaTeX + code blocks (short snippets only).
        
    -   Replies: nested 1–2 levels deep, with smooth ≤200 ms enter animations.
        
    -   Actions: Upvote, Downvote, Reply, Report.
        

**Global Feed**

-   URL: `/discuss`
    
-   Tabs: `Trending`, `Latest`, `Help`, `Meta`.
    
-   Filters: tag (e.g. DP, Graphs), difficulty, category (`GENERAL`, `HELP`, `META`, `ANNOUNCEMENT`).
    
-   Each thread card:
    
    -   If per-problem: shows problem chip (`Two Sum · Easy`).
        
    -   If global: shows category chip (`General`, `Meta`).
        
-   Clicking:
    
    -   Per-problem thread → `/problems/[slug]/discuss/<id>`.
        
    -   Global thread → `/discuss/[threadId]`.
        

### 10.1.4 Posting, Replies, Voting, Reporting

-   Posting:
    
    -   Auth required.
        
    -   Minimal Markdown editor; live preview toggle.
        
    -   Local autosave for drafts (short-lived).
        
-   Replies:
    
    -   Inline under the thread.
        
    -   Depth capped to avoid unreadable nesting.
        
-   Voting:
    
    -   +1 / -1; optimistic UI update; tRPC resolves final state.
        
-   Reporting:
    
    -   Reasons: `SPAM`, `ABUSE`, `SPOILER_ABUSE`, `OFF_TOPIC`.
        
    -   Creates report entries for staff review.
        

### 10.1.5 Spoilers & Code

-   Users can mark posts as **“Contains spoiler”**.
    
-   Moderators can enforce spoiler tagging.
    
-   Spoiler posts:
    
    -   Collapsed by default with a “Reveal spoiler” overlay.
        
    -   Accessible via keyboard (focus + Enter).
        
-   Rules banner on per-problem discussions:
    
    > “Use hints and reasoning. Avoid full solution dumps. Mark spoilers appropriately.”
    

### 10.1.6 Moderation & Spam Control

**Roles**

-   `USER`: create/read threads & replies, vote, report.
    
-   `MODERATOR`: full discussion moderation.
    
-   `PROBLEM_CURATOR`/`ADMIN`: moderation + platform-level overrides.
    

**Actions (MODERATOR+)**

-   Hide/unhide post (soft delete; visible to author + staff).
    
-   Lock/unlock thread (stop new replies).
    
-   Shadow-ban user:
    
    -   User’s posts seem normal to them, but are hidden from others.
        
-   Resolve reports:
    
    -   Set status (`OPEN | VALID | INVALID`) with notes.
        

**Spam & abuse defenses**

-   Rate limits on threads/replies (per minute/hour/day).
    
-   Extra friction (captcha) after suspicious bursts.
    
-   Shadow-banned content excluded from feeds and trails.
    

### 10.1.7 tRPC Surface (Discussions)

**Queries**

-   `discussions.listByProblem({ problemId, sort, filters, cursor })`
    
-   `discussions.listGlobal({ scope, filters, cursor })`
    
-   `discussions.getThread({ threadId })`
    
-   `discussions.getReplies({ threadId, cursor })`
    

**Mutations**

-   `discussions.createThread({ problemId | null, title, content, tags, isSpoiler })`
    
-   `discussions.reply({ parentId, content, isSpoiler })`
    
-   `discussions.vote({ postId, direction })`
    
-   `discussions.report({ postId, reason })`
    

**Moderation**

-   `staff.discussions.hide({ postId })`
    
-   `staff.discussions.unhide({ postId })`
    
-   `staff.discussions.lockThread({ threadId })`
    
-   `staff.discussions.shadowBan({ userId })`
    
-   `staff.discussions.resolveReport({ reportId, status, note })`
    

----------

## 10.2 Editorials (Per-Problem Official Explanations)

### 10.2.1 Goals

-   Provide **authoritative explanations** for problems.
    
-   Explain **approach, reasoning, complexity, pitfalls**, not just code.
    
-   Avoid spoiling problems too early (release-controlled).
    

### 10.2.2 UX & Placement

-   Editorial tab on problem page:
    
    -   URL: `/problems/[slug]/editorial`
        
-   Sections:
    
    -   Problem restatement (optional).
        
    -   Approach overview.
        
    -   Step-by-step reasoning.
        
    -   Complexity analysis.
        
    -   Edge cases and pitfalls.
        
    -   Pseudocode / short code fragments (language-agnostic when possible).
        

### 10.2.3 Lifecycle

-   Editorials authored by `PROBLEM_CURATOR`/`ADMIN` in staff UI.
    
-   Stored as `EditorialVersion` and tied to `ProblemVersion`.
    
-   Only latest selected version exposed to users.
    

**Release controls**

-   `editorialReleaseAt` options:
    
    -   On problem publish.
        
    -   N days after publish (e.g., +7 days).
        
    -   After associated contest ends.
        
    -   Manual (explicit publish).
        

Before `editorialReleaseAt`, `editorials.getByProblem` returns null to normal users; staff can always access.

### 10.2.4 tRPC Surface (Editorials)

-   `editorials.getByProblem({ problemId })` → `Editorial | null` (respecting releaseAt).
    
-   `staff.editorials.create({ problemId, content, releaseAt })`
    
-   `staff.editorials.update({ editorialId, content, releaseAt })`
    
-   `staff.editorials.publishNow({ editorialId })`
    

RBAC:

-   Read: all users after release.
    
-   Write: `PROBLEM_CURATOR`/`ADMIN` only.
    

----------

## 10.3 Approach Trails (Unique Feature)

### 10.3.1 Goals

-   Capture and share **how people think**, not just what code they wrote.
    
-   Provide a spoiler-light hinting system.
    
-   Build a unique, structured **knowledge graph of problem-solving approaches**.
    

### 10.3.2 Concept

For each problem, there is an **Approach Trails** tab:

-   A **graph of micro-insights** (nodes) and **how they connect** (edges).
    
-   Nodes represent single _ideas_, not code:
    
    -   “Try sorting first”
        
    -   “Binary search on the answer”
        
    -   “Two pointers on a sorted array”
        
    -   “Use prefix sums to handle range queries”
        
-   Edges indicate commonly followed reasoning paths:
    
    -   “Realize array must be sorted” → “Try two pointers”
        
    -   “Check constraints” → “O(N²) too slow” → “Need O(N log N)”
        

This produces a **visual, collaborative map** of reasoning for the problem.

### 10.3.3 User Flow

-   After attempting or solving a problem, users see:
    
    > “What helped you move forward?”
    
-   They can:
    
    -   Select from common patterns (e.g., Sliding window, Binary search, DP on subsets).
        
    -   Add a short custom insight (1–2 sentences).
        
-   Contributions form or strengthen nodes and edges in the trail graph.
    

### 10.3.4 UI & UX

-   Tab: **“Approach Trails”** on problem page.
    
-   Views:
    
    -   **Graph view**:
        
        -   Nodes = insights.
            
        -   Edges = frequently followed “next steps”.
            
        -   Hover node: show hint text and usage count.
            
        -   Click node: highlight outgoing/incoming paths.
            
    -   **List view** (fallback/mobile):
        
        -   Sorted list of insights by popularity, with tags (Idea, Pattern, Data structure, Pitfall).
            
-   Visual design:
    
    -   Minimal, soft colors, no flashy animations.
        
    -   Smooth pan/zoom with inertial scrolling disabled for accessibility.
        
    -   Fade-in (≤ 200 ms) for nodes and edges on load.
        

### 10.3.5 Content Rules & Safety

-   No code.
    
-   No explicit final answers (“the array is [1,2,3]”).
    
-   Focus on patterns, algorithms, and key realizations.
    
-   Insight length limits (e.g., 200 chars).
    
-   Users and moderators can report misleading or spoiler-like insights.
    

### 10.3.6 Moderation & Merging

-   MODERATOR/PROBLEM_CURATOR/ADMIN can:
    
    -   Hide misleading or spammy insights.
        
    -   Merge duplicates into a single canonical insight.
        
    -   Mark insights as “outdated” if problem changes.
        
-   Shadow-banned users’ insights are hidden from others but still visible to themselves (consistent with discussions).
    

### 10.3.7 tRPC Surface (Trails)

**Queries**

-   `trails.getForProblem({ problemId })`  
    Returns:
    
    -   `insights[]` (id, content, category, score, isHidden)
        
    -   `edges[]` (fromInsightId, toInsightId, weight)
        

**Mutations**

-   `trails.addInsight({ problemId, content, category })`
    
-   `trails.voteInsight({ insightId, direction })`
    
-   `trails.reportInsight({ insightId, reason })`
    

**Staff**

-   `staff.trails.hideInsight({ insightId })`
    
-   `staff.trails.unhideInsight({ insightId })`
    
-   `staff.trails.mergeInsights({ sourceId, targetId })`
    
-   `staff.trails.resolveReport({ reportId, status, note })`
    

### 10.3.8 Data Model (Trails)

-   `TrailInsight`:
    
    -   id, problemId, authorId, content, category, score, isHidden, createdAt, updatedAt
        
-   `TrailEdge`:
    
    -   fromInsightId, toInsightId, weight
        
-   `TrailReport`:
    
    -   insightId, reporterId, reason, status, note, createdAt, resolvedBy?, resolvedAt?
        

Indexes:

-   `TrailInsight`: (`problemId`, `score DESC`, `createdAt DESC`)
    
-   `TrailEdge`: (`problemId`, `fromInsightId`, `weight DESC`)
    

----------

## 10.4 Performance & Caching

-   Discussions:
    
    -   `staleTime`: 5–15 s; infinite scroll for long lists.
        
    -   No SSR for user-specific content; fetch via CSR with tRPC.
        
-   Editorials:
    
    -   SSR/ISR possible after release; stable content.
        
-   Trails:
    
    -   Cached per problem for 60–300 s.
        
    -   Graph layout calculated client-side; server only returns normalized insight/edge data.
        

----------

## 10.5 Accessibility & UX Notes

-   All discussion actions keyboard-accessible.
    
-   Spoiler blocks accessible via keyboard and screen readers.
    
-   Trails list view available for users who dislike graphs or have motion constraints.
    
-   Reduced-motion preference disables animations and uses instant state changes.
    

----------

## 10.6 Telemetry & Anti-Abuse

Track:

-   # of threads/replies per problem & globally.
    
-   Report rates and moderation time-to-resolution.
    
-   Editorial read counts and bounce rates.
    
-   Trails:
    
    -   Most-used insights per problem.
        
    -   Time-to-AC after viewing trails (aggregate, anonymized).
        
    -   Misleading insight reports.
        

Use these metrics to refine rate limits, moderation policies, and UX.

----------

## 10.7 Definition of Done

-   Users can post, reply, vote, and report in **per-problem** and **global** discussions.
    
-   Moderators can hide, lock, shadow-ban, and resolve reports.
    
-   Editorials created, scheduled, and released correctly; math/code render properly.
    
-   Approach Trails tab works:
    
    -   Users can add and vote on insights.
        
    -   Graph/list view loads quickly and is understandable.
        
    -   No code/spoilers leak via insights.
        
-   tRPC routes enforce RBAC for `USER`, `MODERATOR`, `PROBLEM_CURATOR`, `ADMIN`.
    
-   Performance and caching settings keep interactions snappy.
    
-   Accessibility standards met (keyboard, contrast, reduced motion).
