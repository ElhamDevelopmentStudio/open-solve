# 11) Contests (Full, Expanded, Admin-Only Creation)

## 🎯 11.0 Purpose

Provide a **highly flexible, fully configurable** contest system that supports everything from casual practice rounds to professional ICPC-style competitions, with absolute control granted **only to ADMIN**.  
Contest creators must be able to fine-tune **every detail**: timing, scoring, problem set behavior, visibility, anti-cheat, UI/UX rules, standings rules, and post-contest actions.

---

# 🔐 11.1 Roles & Permissions (Strict)

Role

Permissions

**ADMIN**

Full contest creation, editing, management, deletion, force-start, force-end, rejudge controls, participant banning, private invites, everything.

**PROBLEM_CURATOR**

Can supply problems, but **cannot create contests**.

**MODERATOR**

Anti-cheat actions only (during/after contest), **cannot** modify contest settings.

**USER**

Register, participate, upsolve after contest; no creation or management.

> **Contest creation is EXCLUSIVELY ADMIN.**  
> No exceptions, no delegation, no shared control.

---

# ⚙️ 11.2 Contest Types (Admin Chooses)

### **1. Competitive (Rated)**

- Rating changes (Elo/CF-style).
- Strict anti-cheat & hidden feedback.

### **2. Educational (Unrated)**

- Feedback allowed.
- Editorial may be visible during the round (admin toggles).

### **3. Private / Invite-Only**

- Access tokens or member-list-based entry.
- Perfect for universities, training groups, or interview batches.

### **4. Virtual Participation**

- Users can **replay** past contests in real-time simulation.
- Admin toggles if virtual is enabled.

### **5. Custom Mode (Admin-defined)**

Admin can override:

- scoring formula
- visibility
- freeze/unfreeze behavior
- tie-breakers
- point decay rules

---

# 📅 11.3 Time & Window Controls (Admin Mastery)

Admin can configure:

### Contest Window

- Start time
- End time
- Duration override (fixed or individual timers)
- Grace periods (5–30 min late join)
- Dynamic extension in case of system issues (manual or auto)

### Freeze Window

- Freeze at N minutes before end
- Freeze types:
  - ICPC freeze (hide scoreboard updates)
  - Hide attempts but show ACs
  - Freeze only top N ranking users
  - Full lock (no updates until unfreeze)

### Individual Timers (optional)

Each participant gets their own timer:

- Entry-based timer
- Late join allowed? (Admin toggles)

---

# 🧩 11.4 Problem Set Controls

ADMIN can choose:

### Problem selection

- Add from published pool
- Add from internal/unlisted problems (contest-only)
- Add brand-new problems marked _contest-only_

### Per-problem settings

- Points (fixed or dynamic)
- Difficulty tags
- Partial scoring:
  - Weighted tests
  - Subtasks/subscores
  - Checker-based scoring

- Attempts limit per problem
- Penalty settings per problem
- Language restrictions (problem A only allows Python+C++ etc.)
- Output-only problems supported
- Interactive problems supported (custom runner)

### Problem shuffling

- Same order for all users
- OR random order for each user (anti-cheat)

### Visibility

- Show/hide tags
- Show/hide difficulty
- Show/hide acceptance rate

---

# 🧪 11.5 Scoring & Rules (Admin-Level Control)

Admin chooses scoring model:

### **ICPC Mode**

- AC = +1
- Wrong attempts = penalty (configurable: 10/20 mins, or custom)
- Total time = sum of times to first AC + penalties

### **Codeforces Style**

- Dynamic point decay
- Wrong attempts penalty
- Tie-breaking by last solve time

### **AtCoder Style**

- No penalty
- Points only for AC
- Tiebreak based on last AC timestamp

### **Custom Formula Mode**

Admin provides:

- Expression: `points = base - attempts * penalty - time * decay`
- Optional per-problem overrides
- Optional per-language weighting

### **Tie-breakers**

Admin chooses priority order:

- Number of solved problems
- Total points
- Penalty time
- First AC timestamp
- Fastest AC time
- Fewest attempts
- Randomized tie-break (optional)

---

# 🔭 11.6 Anti-Cheat & Integrity Controls

Admin can toggle:

### Feedback Rules

- Show only “Submitted”
- Show WA/TLE/MLE (partial feedback)
- Show full results (educational)
- Show only after contest

### Attempt Visibility

- Hide user’s submissions from others during contest
- Hide all code globally
- Hide all verdicts except AC
- Disable hints/discussions automatically

### Anti-Cheat Systems

- IP/device fingerprinting
- Duplicate account detection
- Code similarity detection
- Suspicious AC rate detection
- Submission throttle (per minute)
- Plagiarism flags pushed to moderators

### Lockdown Mode

- Disable:
  - Global discussions
  - Per-problem discussions
  - Trails tab
  - Profile views
  - Leaderboards updates (until unfreeze)

### Moderator Tools

- View flags
- Remove from contest
- Inspect code
- Manual rejudge
- Add notes

---

# 👥 11.7 Registration & User Flow

Admin controls:

### Registration

- Open registration
- Invite-only
- Password-protected contest
- Email/username whitelisting
- Country or org restrictions
- Capacity limits

### Participation Options

- Virtual participation allowed?
- Re-run allowed?
- Contest merging (e.g., 3 rounds = 1 series)?

### Disqualification

- Auto DQ on:
  - plagiarism detection
  - too many ACs too quickly
  - too many failed submissions
  - switching accounts mid-contest

---

# 📊 11.8 Standings & Scoreboard

Admin-configurable:

### Standings styles

- Table, card grid, ranking strip

### What participants see

- Full scoreboard
- Partial scoreboard
- Self-only scoreboard
- Team scoreboard (future)

### Freeze rules

- Full freeze
- Freeze only top X
- Freeze all except first AC
- Freeze only penalties

### Post-contest

- Auto-unfreeze
- Manual unfreeze
- “Editorial + UpSolve Mode” release
- Publish official solutions

### Enhanced Stats

- Per-problem stats chart
- Attempt heatmap
- First AC timeline
- Per-language submission statistics
- Difficulty graph

---

# 🛠️ 11.9 Admin Dashboard (Power Suite)

**Contest Creator Console**

Admin can manage:

- Contest metadata
- Time controls
- Problem selection
- Scoring rules
- Freeze controls
- Anti-cheat modules
- Approvals & rejudges
- Participant bans/unbans
- Clarification system

### Rejudge system

- Rejudge 1 submission
- Rejudge all submissions on problem X
- Rejudge language Y
- Rejudge entire contest
- Undo rejudge (optional if storing snapshots)

### Clarifications panel

Like ICPC:  
Participants can send clarifications → Admin replies → Public/Private answer.

---

# 🧑‍🎓 11.10 Upsolving & Post-Contest Mode

After contest ends:

Admin chooses:

- Release editorial?
- Release hidden test cases (optional)
- Unlock discussions
- Add “UpSolve” mode (submissions not counted toward score)
- Restore full verdict visibility
- Publish results to global leaderboards

---

# 🔍 11.11 tRPC Surface (Conceptual)

### Contest (Admin)

- `admin.contest.create`
- `admin.contest.updateSettings`
- `admin.contest.updateProblems`
- `admin.contest.updateScoring`
- `admin.contest.updateVisibility`
- `admin.contest.startNow`
- `admin.contest.endNow`
- `admin.contest.freezeNow`
- `admin.contest.unfreezeNow`
- `admin.contest.rejudgeSingle`
- `admin.contest.rejudgeProblem`
- `admin.contest.rejudgeAll`
- `admin.contest.dqUser`
- `admin.contest.inviteUser`
- `admin.contest.approveUserRequests`
- `admin.contest.delete`

### Contest (User)

- `contest.register`
- `contest.unregister`
- `contest.getInfo`
- `contest.getProblems`
- `contest.getMyStatus`
- `contest.getStandings`
- `contest.getFreezeStatus`
- `contest.sendClarification`
- `contest.getClarifications`
- `contest.upsolveSubmission`

---

# 📦 11.12 Data Model (High-Level)

### Contest

- id, slug, name, description, type
- startAt, endAt, duration, grace, freezeAt
- visibility, registrationRules, scoringRules, problemOrder
- antiCheatSettings, feedbackSettings
- createdBy (ADMIN)

### ContestProblem

- contestId, problemId, points, penalties, order, visibility, overrides

### ContestRegistration

- contestId, userId, status
- isVirtual, isDisqualified
- deviceFingerprint, ipHash

### ContestSubmission

- submissionId, contestId, problemId, userId
- verdict, points, penalties, isFrozen, timestamp

### Clarification

- userId, contestId, problemId?, question, answer, isPublic

### ContestSnapshot (for freeze)

- frozenScoreboard JSON

---

# 🎯 11.13 Definition of Done

- Admin can create and configure a contest with **dozens of options**.
- Contest flow: registration → start → live standings → freeze → finish → unfreeze → upsolving.
- All contest logic correctly restricted to **ADMIN** only.
- Anti-cheat works (flags, DQ, throttles).
- Scoring is deterministic and aligns with chosen rules.
- Standings remain stable under freeze conditions.
- Rejudge tools work reliably and are audit-logged.
- Contest runs scale to hundreds or thousands of users.
- UI is clean, professional, competitive programming-grade.
