
## Fully expanded version (Educational Contest Anti-Cheat Mode)

### 1. Scope & Activation

**Name:** Educational Contest Anti-Cheat Mode  
**Scope:** Only applies if:

-   `Contest.type = EDUCATIONAL`
    
-   AND `Contest.settings.antiCheat.enabled = true`
    

This mode:

-   **Does not** apply to normal practice or rated contests (unless admin explicitly chooses to).
    
-   Adds extra **telemetry, constraints, and review tools** on top of your existing contest system.
    
-   Is fully configurable by **ADMIN only**.
    

----------

### 2. What we collect when a student attempts a problem

When a participant **opens a problem in an educational contest** (especially once they **open the editor or press “Solve”**), the system records an **attempt context snapshot**:

**Environment metadata** (no PII):

-   `userId` (internal)
    
-   `contestId`
    
-   `problemId`
    
-   `deviceType` (`desktop`, `tablet`, `mobile`)
    
-   `osFamily` (`windows`, `mac`, `linux`, `android`, `ios` – coarse)
    
-   `browserFamily` (`chrome`, `firefox`, `safari`, `edge`, `other`)
    
-   `viewport` (width, height)
    
-   `connectionType?` (if available: `wifi`, `cell`, etc.)
    

**Network / session metadata (safe form):**

-   `ipHash` (hashed IP, not raw)
    
-   `sessionId`
    
-   `geoRegion?` (coarse, country or region if you want)
    

**Contest context:**

-   Start time of question (first open)
    
-   Whether they are already registered as active on another device for this contest
    

This snapshot is attached to:

-   All submissions in that contest
    
-   All anti-cheat event summaries (tab switching, copy-paste, etc.)
    

----------

### 3. Tab-change & focus tracking (core ask)

For **educational contests with anti-cheat** enabled, we specifically track **focus behavior per problem/session**:

**Events (beaconed):**

-   `contest.problem_focus` (tab gains focus)
    
-   `contest.problem_blur` (tab loses focus)
    
-   `contest.problem_tab_switch` (blur with clear tab/page change)
    
-   `contest.problem_window_hidden` (page visibility API says hidden)
    

**We derive per-user/per-problem metrics:**

-   `tabSwitchCount`
    
-   `totalOutOfFocusMs`
    
-   `maxConsecutiveOutOfFocusMs`
    
-   Time of first tab switch (how early they alt-tabbed away)
    

**Policies (admin-configurable):**

-   **Soft warning threshold**:
    
    -   e.g. 3 tab switches → in-UI warning:  
        “This contest is monitored. Repeated tab changes may be flagged.”
        
-   **Flag threshold**:
    
    -   e.g. 5–7 tab switches, or > X seconds out of focus total within a problem.
        
-   **Auto DQ (optional)**:
    
    -   If tab switches exceed Y during a single problem or entire contest, flag for disqualification and optionally auto-DQ.
        

**Displayed to Admin:**

-   For each participant:
    
    -   “Tab changes: 0 / 3 / 7 / 14…”
        
    -   “Total time out of focus: 5m 23s”
        
    -   “Focus timeline per problem.”
        

This does **not** guarantee they aren’t looking at another device, but it makes “alt-tabbing to Google” very obvious.

----------

### 4. Multi-session & multi-device control

**Goal:** make it hard to compete from multiple devices + share an account.

**Features:**

-   **Single active session per contest**:
    
    -   When a user joins an educational contest, they get **one active device**.
        
    -   Logging in from a second device:
        
        -   Option A: logs out the first session (strict).
            
        -   Option B: allowed but flagged and visible in admin panel.
            
-   **Concurrent session flags**:
    
    -   If `same userId + same contestId` is active from multiple `ipHash` or `deviceType` at once → flag as suspicious.
        
-   **Per-contest “device lock”**:
    
    -   Optionally store first session’s device fingerprint and:
        
        -   Block other devices outright during contest, or
            
        -   Require manual admin approval.
            

**Admin sees:**

-   “Participants with multiple devices”
    
-   “Participants with multiple IP regions during contest”
    

This is **not** unbreakable, but dramatically reduces “I'll just log my friend in on another laptop”.

----------

### 5. Copy-Paste & code similarity protections

#### 5.1 In-browser copy-paste detection

From your earlier analytics, we already track:

-   `editor.paste` events
    
-   `pastedLength`
    

In **educational anti-cheat mode**, we upgrade this to:

-   Hard thresholds:
    
    -   If `pastedLength > LARGE_PASTE_THRESHOLD` (e.g. > 100 chars), we:
        
        -   Show a warning (“Large pasted code is monitored”).
            
        -   Increment a per-problem `largePasteCount`.
            
-   Aggregate per contest:
    
    -   Number of large pastes per contestant/problem.
        

**Admin sees:**

-   “Problems with high large-paste rates.”
    
-   “Participants with high large-paste counts.”
    

Still no clipboard content is logged.

----------

#### 5.2 Server-side similarity analysis (cheating detection core)

This operates on **submissions**, which already contain code. It’s **not** analytics; it’s core anti-cheat.

Features:

-   Across all contest submissions:
    
    -   Use string/token-based similarity detection (winnowing, shingles, AST similarity).
        
    -   Highlight clusters of almost-identical solutions:
        
        -   Same user across multiple accounts
            
        -   Different users in same contest
            
-   Consider:
    
    -   Structural similarity (AST)
        
    -   Identifier renaming detection
        
    -   Trivial whitespace changes ignored
        

Admin sees:

-   “Similarity cluster: 8 participants with 90–99% similarity on Problem C.”
    
-   Ability to:
    
    -   Inspect codes side by side.
        
    -   Mark cluster as suspicious (open anti-cheat case).
        
    -   Apply DQ or penalty if confirmed.
        

----------

### 6. Timing & behavior-based heuristics

**Signals:**

-   Ultra-fast AC on a hard problem (e.g. solved in 20 seconds, first try).
    
-   Many ACs in short time with diverse problems.
    
-   Frequent switching between problems with no attempts.
    
-   Attempt timeline:
    
    -   If a user is idle for a long time, then suddenly pastes large code + immediate AC → suspicious profile.
        

**Events used:**

-   `problem.first_ac`
    
-   `editor.paste`
    
-   `contest.problem_switch`
    
-   `editor.run_clicked` / `editor.submit_clicked`
    
-   Tab/focus events
    

Admin sees:

-   “Suspicious pattern flags” on contest participants:
    
    -   Rapid ACs
        
    -   Heavy pasting
        
    -   Many tab switches
        
    -   Strange per-problem time distribution
        

----------

### 7. UI constraints (soft lock, not DRM)

For educational contests, admin can turn on **Exam Mode UI**, which:

-   Disables typical cheating conveniences:
    
    -   Optional: disable text selection in statement.
        
    -   Optional: disable right-click (context menu).
        
    -   Optional: show a full-screen prompt asking user to stay focused on the page.
        
-   Shows a visible indicator:
    
    -   “Anti-Cheat Mode is active. Tab changes, large pastes, and multiple devices are monitored.”
        

These are **soft** measures (can be bypassed by tech-savvy students), but they:

-   Set expectations clearly.
    
-   Combine with **server-side heuristics** and **similarity analysis** to catch most attempts.
    

----------

### 8. Contest-level control & thresholds

In the **Contest Admin UI**, for educational contests:

Admin can configure:

-   **Tab change thresholds:**
    
    -   softWarning: N
        
    -   flag: N2
        
    -   autoDQ: N3 (optional)
        
-   **Out-of-focus thresholds:**
    
    -   Soft warning after X seconds total
        
    -   Flag after Y seconds
        
-   **Large paste thresholds:**
    
    -   Size threshold (chars)
        
    -   Allowed count per problem / per contest
        
-   **Multi-session rules:**
    
    -   Single device only (yes/no)
        
    -   Multi-device allowed but flagged (yes/no)
        
-   **Heuristics toggle:**
    
    -   Enable timing heuristics
        
    -   Enable similarity scanner
        
    -   Enable “suspicious cluster” detection
        

All of these apply **only** to contests that are:

-   Educational
    
-   With Anti-Cheat Mode enabled
    

----------

### 9. Anti-Cheat Dashboard for Admin

Admin gets a dedicated **Anti-Cheat** tab per educational contest:

For each participant:

-   Tab changes: total + per problem
    
-   Out-of-focus time
    
-   Large paste count
    
-   Device/IP changes
    
-   Similarity cluster membership
    
-   Suspicious timing flags
    

Admin can:

-   Drill down into:
    
    -   Submission list + code (normal submission view)
        
    -   Timing timeline
        
    -   Tab change timeline
        
-   Set:
    
    -   Status: `Clean`, `Under Review`, `Suspicious`, `DQ’d`
        
-   Apply:
    
    -   Penalty points
        
    -   DQ from contest
        
    -   Ban/shadow-ban from platform (if severe)
        

----------

### 10. Privacy & Transparency

Even in **Anti-Cheat Mode**:

-   We **never**:
    
    -   Read other browser tabs
        
    -   Capture screen content
        
    -   Log microphone/camera automatically
        
    -   Install rootkits/keyloggers or anything crazy
        

We **only**:

-   Track **our page’s own focus/blur/tab visibility**.
    
-   Track usage **within our editor** (paste, language change, etc.).
    
-   Use **submissions** which we already own to do similarity detection.
    

Contest rules page clearly states:

-   What is tracked:
    
    -   Tab changes
        
    -   Multi-device logins
        
    -   Copy/paste behavior (just size)
        
    -   Timing & similarity patterns
        
-   What can happen:
    
    -   Warnings
        
    -   Flagging
        
    -   Disqualification
