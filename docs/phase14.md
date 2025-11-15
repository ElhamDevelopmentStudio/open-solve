
# 14) Telemetry & Analytics

## 14.0 Purpose

Provide a **privacy-respecting, loss-tolerant analytics layer** that:

-   Helps **ADMIN** understand user behavior, problem quality, contest dynamics, and editor performance.
    
-   Uses **fire-and-forget beacon requests** so it never slows down the user.
    
-   Stores **no code and no PII**, and is used primarily to show **percentages, ratios, funnels, and aggregates** like:
    
    -   “10% of users abandoned this problem after scrolling.”
        
    -   “27% opened hints; 8% opened editorial before solving.”
        
    -   “First-try AC rate is 32%.”
        

Analytics exists to **improve UX, calibrate difficulty, and detect pain points**, not to spy on individuals.

----------

## 14.1 Design Principles

1.  **Beacon-based, non-blocking**
    
    -   All analytics events use `navigator.sendBeacon` (preferred) or `fetch(..., { keepalive: true })`.
        
    -   No `await` or UI blocking; analytics must **never** slow page transitions or submits.
        
2.  **Event-level logging, aggregate-level usage**
    
    -   We store individual events as tiny JSON records.
        
    -   The **Admin panel** displays mostly **percentages, distributions, averages, funnels**, not raw event lists.
        
3.  **No PII, no code**
    
    -   Analytics payloads **never** include emails, IPs, raw source code, or full UAs.
        
    -   Only IDs (userId, problemId, contestId), language codes, device class, and timing numbers.
        
4.  **Admin is all-powerful**
    
    -   `ADMIN` can view aggregates and drill down if needed (god mode), but the design itself is **privacy-friendly by default**.
        
5.  **Loss-tolerant**
    
    -   If some events are lost, it’s fine; analytics is about trends, not transactional correctness.
        

----------

## 14.2 Event Envelope & Transport

All analytics events conform to a shared envelope:

`type  AnalyticsEvent = { eventName: string; // e.g., "problem.view_enter"  version: number; // schema version  timestamp: string; // ISO userId?: string; // internal user id (if logged in) sessionId?: string; // anonymous session key  context: {
    problemId?: string;
    contestId?: string;
    languageCode?: string;
    deviceType?: "desktop" | "tablet" | "mobile";
    viewport?: { width: number; height: number };
    route?: string;
  }; payload: Record<string, any>; // event-specific numeric/string fields };` 

### Transport

-   Primary: `navigator.sendBeacon("/analytics", blobOrJson)`
    
-   Fallback: `fetch("/analytics", { method: "POST", body, keepalive: true })`
    

Ingestion endpoint:

-   is **public** (no heavy auth handshake),
    
-   validates shape,
    
-   writes to **append-only analytics store** (Postgres JSONB / ClickHouse / similar),
    
-   responds quickly (no heavy aggregation in-request).
    

----------

## 14.3 Aggregation & Percentages

Raw events are aggregated offline/async into metrics like:

-   `abandonmentRate = abandonedUsers / totalViews`
    
-   `hintUsageRate = usersWhoOpenedHint / usersWhoViewedProblem`
    
-   `firstTryACRate = usersWhoFirstTryAC / usersWhoAttempted`
    
-   `medianTimeToAC`, `meanTimeToAC`, etc.
    

Admin dashboards show **numbers like**:

-   “18.2% bounce rate on Problem X.”
    
-   “27.5% of users opened constraints.”
    
-   “31.3% first-try AC.”
    
-   “11.8% got stuck.”
    

We **intentionally** talk in terms of:

-   **% of users**
    
-   **% of sessions**
    
-   **counts and distributions**
    

not per-user event streams in the UI.

----------

## 14.4 Event Categories

We group events into 8 major categories (A–H):

1.  User behavior (page-level)
    
2.  Editor behavior
    
3.  Button & feature interaction
    
4.  Outcomes (AC / abandon / error patterns)
    
5.  Problem-specific insights
    
6.  Session-level / navigation
    
7.  QoL / UI telemetry
    
8.  Error & crash reporting
    

Below is how each category maps to actual events.

----------

### A) User Behavior Analytics (Page-Level)

**Goal:** understand how users interact with problem pages.

#### A1. Time on Question

Events:

-   `problem.view_enter`
    
-   `problem.view_exit`
    
-   `problem.view_focus`
    
-   `problem.view_blur`
    
-   `problem.first_interaction` (first scroll/click/type)
    

Payload:

-   `problemId`
    
-   Computed metrics:
    
    -   `timeVisibleMs`
        
    -   `timeActiveMs` (typing/scrolling in viewport)
        
    -   `timeToFirstInteractionMs`
        

Admin sees (aggregated):

-   Avg time spent per problem.
    
-   Time to first interaction distributions.
    
-   % of users that are “skim & leave” vs “deep readers”.
    

----------

#### A2. Bounce / Abandonment

Event:

-   `problem.bounce_detected`
    

Definition (example):

-   User loaded problem page but **did not**:
    
    -   scroll past 25%, or
        
    -   click “Solve”, or
        
    -   open editor/hints/discuss/editorial, or
        
    -   type any code
        

Payload:

-   `problemId`
    
-   `timeVisibleMs`
    
-   `reason` (`noScroll`, `noSolve`, `noInteraction`)
    

Admin sees:

-   Bounce rate per problem (as %).
    
-   Breakdown by reason, difficulty, tags.
    

----------

#### A3. Page Engagement

Events:

-   `problem.scroll_depth`
    
-   `problem.section_toggled`
    

Payload:

-   `problemId`
    
-   `maxScrollPercent` (0–100)
    
-   `sectionName` (`constraints`, `examples`, `hints`, `trails`, `editorialPreview`)
    
-   `action` (`expand` | `collapse`)
    

Admin sees:

-   % users reaching 25/50/75% scroll.
    
-   % who open constraints, examples, hints.
    
-   Problems where constraints/examples are rarely viewed.
    

----------

### B) Editor Behavior Tracking

**Goal:** understand how users code.

#### B1. Editor Open / Focus

Events:

-   `editor.opened`
    
-   `editor.focus`
    
-   `editor.blur`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `timeToEditorFromEnterMs`
    

----------

#### B2. Active Coding Time

Event:

-   `editor.activity_heartbeat` (sampled)
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `activeMs` (keystrokes/mouse within the last window)
    
-   `idleMs`
    

Admin sees:

-   Median “coding time” before AC or abandon.
    
-   Problems with long coding time and low success (maybe too hard or unstructured).
    

----------

#### B3. Undo / Redo Usage

Events:

-   `editor.undo`
    
-   `editor.redo`
    

Payload:

-   `problemId`
    
-   `languageCode`
    

Periods with high undo/redo counts can signal tricky spots.

----------

#### B4. Copy-Paste Detection

Event:

-   `editor.paste`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `pastedLength` (character count only)
    

No clipboard content is logged.

Admin sees:

-   % of users who paste large blocks in a problem.
    
-   Combined with AC rate to spot suspicious patterns.
    

----------

#### B5. Language Switching

Event:

-   `editor.language_switch`
    

Payload:

-   `problemId`
    
-   `fromLanguageCode`
    
-   `toLanguageCode`
    

Admin sees:

-   Most common language switch pairs (e.g., JS → Python).
    
-   Problem-level stats: “33% of users switched language at least once”.
    

----------

#### B6. Editor Settings

Event:

-   `editor.settings_changed`
    

Payload:

-   Font size
    
-   Theme (dark/light/system)
    
-   Line numbers, minimap toggles
    

Used to tune defaults.

----------

### C) Button & Feature Interaction

**Goal:** track key interactions that indicate intent and effort.

#### C1. Solve Button

Event:

-   `problem.solve_clicked`
    

Payload:

-   `problemId`
    
-   `fromSection` (`description`, `discuss`, `editorial`, etc.)
    

----------

#### C2. Run Code

Event:

-   `editor.run_clicked`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `runIndex`
    
-   `timeSinceEditorOpenMs`
    

Admin sees:

-   Average runs before first submit.
    
-   Distribution of “spam run” patterns.
    

----------

#### C3. Submit

Event:

-   `editor.submit_clicked`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `attemptNumber` (per problem)
    
-   `timeSinceFirstViewMs`
    

Admin sees:

-   Attempts-to-AC distributions.
    
-   Time-to-first-submit.
    

----------

#### C4. Hints / Editorial / Discussion

Events:

-   `problem.hint_opened` (with `hintId` if applicable)
    
-   `problem.editorial_opened`
    
-   `problem.discuss_tab_opened`
    

Payload:

-   `problemId`
    
-   `timeSinceEnterMs`
    

Admin sees:

-   Hint usage % per problem.
    
-   Editorial-before-AC usage rate.
    
-   Discuss tab click percentage (often correlates with “confusing but interesting” problems).
    

----------

### D) Outcome Tracking

**Goal:** understand success, failure, and getting stuck.

#### D1. Time & Attempts to First AC

Event:

-   `problem.first_ac`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `timeFromFirstViewMs`
    
-   `attemptsCount`
    

Admin sees:

-   Median time to first AC per difficulty/tag.
    
-   First-try AC rate (%).
    
-   Problem-level curves: “this problem takes ~12 minutes median to solve.”
    

----------

#### D2. Abandonment / Getting Stuck

Event:

-   `problem.abandoned`
    

Heuristic:

-   User leaves problem without AC and:
    
    -   at least one run or submit, or
        
    -   some coding activity.
        

Additional event:

-   `problem.stuck`
    

Heuristic (example):

-   No code changes for X minutes + multiple failed attempts + no hints/editorial.
    

Payload:

-   `problemId`
    
-   `timeSpentMs`
    
-   `attemptsCount`
    
-   `hasHintOpened`
    
-   `hasEditorialOpened`
    

Admin sees:

-   % stuck users per problem.
    
-   Problems where hints/editorials aren’t helping enough (still high stuck rate).
    

----------

#### D3. Error Pattern Summary

Event:

-   `submission.error_summary` (aggregated per session/window)
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `errorType` (`CE`, `RE`, `TLE`, `WA`)
    
-   `count`
    

No code or inputs stored.

Admin sees:

-   Problems with lots of CE/RE (maybe unclear statement or tricky constraints).
    
-   Language-specific error patterns.
    

----------

### E) Problem-Specific Insights (Aggregates)

**Goal:** allow admin to evaluate each problem’s quality and difficulty.

Derived metrics per problem:

-   Open → attempt → AC funnel:
    
    -   View → Attempt → AC vs Abandon.
        
-   Bounce rate (%).
    
-   Abandon after scroll (%).
    
-   Median time to AC.
    
-   Attempts to AC.
    
-   Stuck rate (%).
    
-   Hint/editorial usage before AC.
    
-   Paste/large-paste usage %.
    
-   Language switching rate.
    
-   Engagement forecast: which problems are opened often but rarely attempted.
    

Admin sees problem dashboards like:

> **Problem X (Medium)**
> 
> -   18.2% bounce
>     
> -   10.4% abandon after scroll
>     
> -   29% first-try AC
>     
> -   median 2 attempts to AC
>     
> -   14.7% stuck
>     
> -   11% hint usage, 7% editorial before AC
>     
> -   33% language switching
>     
> -   4.5% large paste events
>     

----------

### F) Session-Level / Navigation Analytics

#### F1. Navigation Paths

Event:

-   `navigation.path`
    

Payload:

-   `fromType`, `fromId`
    
-   `toType`, `toId`
    
-   `timeOnFromMs`
    

Admin sees:

-   Common flows:
    
    -   Dashboard → Problem → Editorial → Another Problem.
        
    -   Problem → bounce → global search.
        

----------

#### F2. Tab Switching / Returning

Events:

-   `session.tab_blur`
    
-   `session.tab_focus`
    

Payload:

-   `timeAwayMs`
    
-   `problemId?`
    

Used to understand “I’ll come back later” patterns and how often users actually return.

----------

#### F3. Contest Engagement

Contest-specific events:

-   `contest.problem_viewed`
    
-   `contest.problem_switched`
    
-   `contest.submit_clicked`
    
-   `contest.time_on_problem`
    
-   `contest.first_ac_in_contest`
    

Payload always includes `contestId`.

Admin sees:

-   For each problem in a contest: time spent, attempts, and switch-away behavior.
    
-   Which problems caused chokepoints.
    

----------

### G) Quality-of-Life Telemetry

#### G1. Device Capability

Event:

-   `session.device_info`
    

Payload:

-   `deviceType` (`desktop`, `tablet`, `mobile`)
    
-   `osFamily` (coarse, e.g., `windows`, `mac`, `linux`, `android`, `ios`)
    
-   `browserFamily` (coarse)
    
-   `viewport` (width, height)
    

All coarse; no exact UA string stored in analytics.

----------

#### G2. UI/UX Controls

Events:

-   `editor.shortcut_used` (`run`, `submit`, `format`)
    
-   `layout.panel_resized`
    
-   `layout.console_toggled`
    
-   `layout.theme_toggled`
    

Payload:

-   `problemId?`
    
-   `shortcutName?`
    
-   `panel?`
    
-   `theme?`
    

Admin sees:

-   How many users use keyboard shortcuts.
    
-   Common UI adjustments (e.g., more users shrinking console, boosting font size).
    
-   Light/dark preference trends.
    

----------

### H) Error & Crash Reporting

#### H1. Client-Side Errors

Event:

-   `client.error`
    

Payload:

-   `route`
    
-   `component`
    
-   `errorMessage`
    
-   `stack?` (shortened, sanitized; no code contents)
    

----------

#### H2. Editor Crashes / Freezes

Event:

-   `editor.freeze_detected`
    

Payload:

-   `problemId`
    
-   `languageCode`
    
-   `timeSinceEditorOpenMs`
    
-   `approxLinesOfCode` (no content, just count)
    

----------

#### H3. Network Failures

Event:

-   `network.request_failed`
    

Payload:

-   `endpointName` (e.g., `trpc.submissions.create`)
    
-   `statusCode?`
    
-   `errorType` (`timeout`, `network`, `serverError`)
    

Admin sees:

-   Which routes are most error-prone.
    
-   Correlation between rollout/feature flags and error spikes.
    

----------

## 14.5 Storage & Processing

### Storage

-   Append-only `analytics_events` table or dedicated analytics store.
    
-   Columns: `id`, `timestamp`, `userId?`, `sessionId?`, `eventName`, `version`, `context`, `payload`.
    
-   Periodic aggregation jobs compute:
    
    -   Problem-level metrics
        
    -   Contest-level metrics
        
    -   System-level UX stats
        

### Retention

-   Raw events kept for N months (e.g., 6–12 months).
    
-   Aggregated metrics kept longer (years).
    
-   Events associated with `DELETED` users retain their `userId` reference only in hashed/anonymized form (no link back to PII).
    

----------

## 14.6 Admin Analytics Dashboards

In the Admin Panel, `ADMIN` gets:

1.  **Problem Analytics**
    
    -   Per-problem engagement + difficulty (percentages, medians, funnels).
        
2.  **Contest Analytics**
    
    -   Problem time usage, attempt stats, switching patterns.
        
3.  **Editor Analytics**
    
    -   Freeze incidents, shortcut usage, layout habits.
        
4.  **Navigation Analytics**
    
    -   Common paths, bounce sources, drop-off points.
        
5.  **UX/Device Analytics**
    
    -   Device mix, screen sizes, theme preferences.
        
6.  **Error Analytics**
    
    -   Client error heatmap, network failures, regression detection.
        

Because `ADMIN` is all-powerful:

-   They can view **aggregates by default**, and optionally inspect groups or users if needed to debug tricky issues.
    
-   But analytics events themselves are already designed to be **privacy-safe**.
    

----------

## 14.7 Privacy & Safety Constraints

Even with god-mode:

-   Analytics **never** contains:
    
    -   Raw source code
        
    -   Problem input/output content
        
    -   Emails or precise PII
        
    -   Exact IPs or full UA strings
        
-   Any de-anonymization for debugging happens via **other admin tools**, not analytics.
    

----------

## 14.8 Definition of Done (Telemetry & Analytics)

-   Beacon-based ingestion implemented (`sendBeacon` + `keepalive fetch` fallback).
    
-   Event envelope standardized and versioned.
    
-   All events validate against schemas.
    
-   No code / PII included in any analytics payload.
    
-   Aggregation jobs produce problem/contest/session metrics as percentages/ratios.
    
-   Admin dashboards show:
    
    -   Bounce, engagement, stuck, hints/editorial usage, attempts-to-AC, etc.
        
-   Analytics integrated with Quality & Security:
    
    -   Used for UX improvements, difficulty calibration, anti-abuse tuning.
        
-   Retention policy defined and implemented.
