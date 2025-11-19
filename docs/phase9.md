# 9) Leaderboards & Profiles

## 🎯 Goals

Create **healthy, fair competition** and a sense of progress without turning things into a dark pattern.  
Profiles should feel like a **personal dashboard**, and leaderboards should feel **motivating**, not overwhelming.

---

## 9.1 Profiles — Overview

**URL:** `/u/[handle]`

### What a profile shows

**Public section**

- Handle, avatar, display name (optional), country (if set).
- Short bio (if set).
- **Key stats**:
  - Total solved
  - Solved per difficulty (Easy / Medium / Hard)
  - Attempted vs solved breakdown
  - Best streak (days with at least one AC)
  - First AC time (relative and absolute)
  - Favorite language (by AC count)

- **Badges**:
  - Seed ones: `First AC`, `10 Solves`, `50 Solves`, `Streak 7`, `Contest Participant`, etc.

- **Problem stats**:
  - Small chart: solved by difficulty
  - Optional chart: solved by topic/tag (top N tags)

**Private section (only owner + staff)**

- More detailed history:
  - Streak calendar (heatmap)
  - Time-of-day histogram (when they usually solve)
  - “Recently solved” list with timestamps

- Privacy toggles:
  - Show/hide **AC code** publicly
  - Allow/disallow being shown on public leaderboards (if you want opt-out)
  - Show/hide country/social links

**Staff-only**

- Flags/notes (anti-cheat)
- Recent anomaly events
- Manual review history

---

## 9.2 Profile UI & UX

- **Layout**
  - Top: Avatar + handle + role badge (if MODERATOR / PROBLEM_CURATOR / ADMIN).
  - Left column: stats & charts.
  - Right column: recent activity, badges, social links.

- **Visuals**
  - Keep it consistent with the rest of the app: calm colors, subtle animations, 12px radius, 8pt spacing.
  - Charts minimal (bar/pie or donut-style) with 2–3 soft accent colors.

- **Charts (examples)**
  - **Solved by difficulty** → small 3-bar chart (Easy/Med/Hard).
  - **Tags** → tag cloud or top 5 tags listed with counts.
  - **Streak** → tiny calendar heatmap (GitHub-style, but lighter).

**Streak rules**

- Streak = consecutive days with ≥1 AC.
- Display current streak + longest streak.

---

## 9.3 Global Leaderboards

**URLs**

- `/leaderboards` → overview
- `/leaderboards/global` → all-time
- `/leaderboards/weekly` → last 7 days
- `/leaderboards/monthly` → current/last month
- `/leaderboards/tag/[slug]` → per-topic boards
- `/leaderboards/difficulty/[Easy|Medium|Hard]`

### Types of leaderboards

- **Time-based**
  - Weekly
  - Monthly
  - All-time

- **Scoped**
  - Global (all tags/difficulties)
  - By difficulty (Easy/Med/Hard)
  - By tag (DP, Graphs, etc.)
  - Contest-specific (integration with contests section)

### Columns per leaderboard row

- Rank
- Handle + avatar
- Country flag (if set and not hidden)
- Score / points
  - For practice boards: could be weighted by difficulty (e.g., Easy=1, Med=2, Hard=3).

- Key stats:
  - Problems solved in that window
  - AC rate or attempts per AC (optional)
  - For contest boards: rating/score/time penalty

**Row interactions**

- Hover: small elevation + highlight.
- Click: go to `/u/[handle]` profile.

---

## 9.4 Scoring Model (simple v1)

**Practice leaderboards:**

- Each AC on a problem in the window contributes:
  - **Easy:** 1 point
  - **Medium:** 2 points
  - **Hard:** 3 points

- Only **first AC** within the window counts (repeated ACs ignored).
- Score per window = sum of points.

**Per-tag boards:**

- Same scoring but filtered by problems tagged with that tag.

**All-time:**

- Same rules, no time cutoff.

You can refine later (e.g., down-weight old problems, penalize many failed attempts) but don’t over-complicate v1.

---

## 9.5 Anti-Cheat (Minimal but Real)

**Signals to log**

- Very high AC rate (e.g., > X ACs/hour).
- Suspicious pattern: many ACs with almost no WA/TLE in between.
- Multiple accounts from same IP/device solving identical sets.
- Code similarity (future, not v1): extremely similar submissions across users.

**What happens**

- When triggers fire, mark user with an **“anomaly flag”** and push an entry to a **Review queue**:
  - `antiCheatFlags` table: userId, type, reason, triggeredAt, status (open/closed), reviewerId.

- MODERATOR/ADMIN view:
  - “Suspicious users” dashboard with filters.
  - Each flag entry links to relevant submissions and profile.

**Policy**

- v1: just **flag + manual review**. No automatic bans.
- Actions: warning, temporary leaderboard exclusion, or full suspension (admin only).

---

## 9.6 Privacy & Controls

**Defaults**

- Profile visible to others (handle, stats), code hidden.
- User can:
  - Hide from global leaderboards (optional product decision).
  - Show/hide country.
  - Show/hide links (GitHub, LinkedIn, etc.).
  - Opt in to “Show my AC code publicly” (probably off by default).

**Public code**

- If user opts in, only **AC submissions** code may be visible.
- Never reveal code for submissions marked in anti-cheat investigations unless cleared.

**Shareable profile**

- Simple “Share profile” button → uses canonical `/u/[handle]`.
- No separate publicId needed; profile already public.

---

## 9.7 tRPC Surface (conceptual)

**Profiles**

- `profile.getByHandle({ handle })`
- `profile.getStats({ userId/handle })`
- `profile.getBadges({ userId })`
- `profile.updateSettings({ privacy, social, preferences })` (owner only)

**Leaderboards**

- `leaderboard.global({ window: 'weekly' | 'monthly' | 'all_time', cursor, limit })`
- `leaderboard.byTag({ tagSlug, window, cursor, limit })`
- `leaderboard.byDifficulty({ difficulty, window, cursor, limit })`
- `leaderboard.contest({ contestId, cursor, limit })` (tie-in with contests)

**Anti-cheat (staff)**

- `staff.antiCheat.listFlags({ filters, cursor })`
- `staff.antiCheat.getFlag({ id })`
- `staff.antiCheat.setStatus({ id, status, note })`

**RBAC**

- Everyone: read public profiles + leaderboards.
- Owner: update own profile & privacy settings.
- MODERATOR/ADMIN: see flags, notes, and internal metadata.

---

## 9.8 Data & Snapshot Strategy

**Real-time vs snapshots**

- Real-time queries for personal stats (`profile.getStats` → aggregated from submissions).
- **Snapshots** for heavy leaderboards:
  - Precompute `LeaderboardSnapshot` rows per window (weekly/monthly/all_time).
  - `LeaderboardEntry` per user in a snapshot: userId, rank, score, solved count, window, difficulty/tag info.

- Refresh cadence:
  - Weekly/monthly: rebuild once when window closes + periodic rolling update if needed.
  - All-time: recompute less frequently, or incrementally based on new submissions.

**Why snapshots**

- Keep leaderboard pages fast and cheap.
- Avoid heavy aggregation on every request.
- Make rank stable within a snapshot.

---

## 9.9 React Query & Performance

- Profiles:
  - `staleTime`: 60–300 s (public data doesn’t change every second).

- Leaderboards:
  - Use snapshots → can safely cache 60–300 s.
  - Infinite scroll for large boards with cursor pagination.

- Prefetch:
  - Hover over user in leaderboard → prefetch `profile.getByHandle`.

- No server render for private data; but public leaderboards & public profile parts can be SSR/ISR.

---

## 9.10 UI & UX Polishing

- **Profile**
  - Load skeletons for avatar + stats, charts animate in softly (≤ 200 ms).
  - Don’t overload with numbers; highlight 3–4 key stats and hide the rest behind “More stats”.

- **Leaderboards**
  - Sticky headers (Rank / User / Score / Solved).
  - Small country flag and role badge (if applicable).
  - Hover tooltips: show a few quick stats (“Solved: 120 | AC Rate: 78%”).

- **Mobile**
  - Leaderboard rows collapse: line 1 = Rank + User; line 2 = Score + brief stats.
  - Profile stats become vertically stacked cards.

---

## 9.11 Telemetry & Quality

- Track:
  - Leaderboard page views and scroll depth.
  - Conversion from visiting leaderboard → attempting a problem.
  - Profile views (aggregate); don’t log per-viewer pair.
  - Opt-in rates for public AC code / leaderboard visibility.

- Anti-cheat metrics:
  - Number of flags opened/closed per week.
  - False positive/false negative feedback (via admin tags).

---

## 9.12 Definition of Done

- Public profile page shows **core stats**, solved distribution, and badges without lag.
- User can update **privacy settings** and social links; changes take effect immediately.
- Global, tag, and difficulty-based leaderboards load quickly (snapshot-based, paginated).
- Leaderboard entries link to profiles; profile stats line up with leaderboard scores.
- Minimal anti-cheat system in place:
  - anomaly detection signals
  - flags recorded
  - review UI for MODERATOR/ADMIN.

- tRPC routers enforce role-based access (no staff-only fields leaking to users).
- UI fits the overall design language: balanced, modern, subtle animations, not flashy.
