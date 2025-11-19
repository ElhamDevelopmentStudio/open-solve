# 5) Problem Authoring, Review & Proposals

## 🎯 5.0 Purpose

Provide an elegant, secure, role-aware environment where **curators** design and publish problems, **moderators** help maintain quality, and **users** optionally contribute new ideas.
Everything runs through **tRPC + React Query**, with precise role enforcement and a calm, professional UI.

---

## 🧱 5.1 Architecture Overview

- **tRPC routers**
  - `staff.problems.*`, `staff.tests.*`, `staff.reviews.*`, `staff.publish.*` → authoring & review (curator/admin).
  - `staff.proposals.*` → moderation & conversion.
  - `proposals.*` → user-facing submission & tracking.

- **React Query** manages optimistic updates, caching, and invalidation.
- **Auth middleware:**
  - `authRequired()` for all.
  - `roleRequired()` checks every procedure.
  - Ownership guards on proposals & drafts.

---

## 🧍‍♀️ 5.2 Roles & Permissions

```
enum UserRole {
  USER
  PROBLEM_CURATOR
  MODERATOR
  ADMIN
}
```

| Capability                           | USER | MODERATOR | PROBLEM_CURATOR | ADMIN |
| ------------------------------------ | ---- | --------- | --------------- | ----- |
| Solve / Discuss / Report             | ✅   | ✅        | ✅              | ✅    |
| Submit proposal                      | ✅   | ✅        | ✅              | ✅    |
| Prescreen / comment on proposals     | ❌   | ✅        | ✅              | ✅    |
| Accept proposal / convert to draft   | ❌   | ❌        | ✅              | ✅    |
| Create / edit drafts                 | ❌   | ❌        | ✅              | ✅    |
| Manage tests, constraints, editorial | ❌   | ❌        | ✅              | ✅    |
| Send to review / approve / publish   | ❌   | ❌        | ✅\*            | ✅    |
| Archive / unpublish                  | ❌   | ❌        | ✅              | ✅    |
| Moderate discussions                 | ❌   | ✅        | ✅              | ✅    |
| Manage roles / irreversible ops      | ❌   | ❌        | ❌              | ✅    |

\* **Publish rule:** a curator **cannot self-approve** their own problem; approval must come from another curator or an admin.

---

## 🧭 5.3 Problem Lifecycle

```
draft → review → published → archived
```

- Publishing creates a new immutable **ProblemVersion**.
- Drafts autosave; reviews require structural validation.
- Archive hides from the Library but preserves submissions & history.

---

## 🪶 5.4 Authoring Interface (UI & UX)

### Layout

- **Header bar:** Title (editable) | State badge | Autosave timestamp | Actions (Preview / Save / Review / Publish).
- **Left rail:** Tabs → Content / Metadata / Constraints / Tests / Editorial / History.
- **Center:** Markdown + KaTeX editor with live preview.
- **Right rail:** Real-time lint panel.

### Aesthetic

- Neutral palette, 12 px radii, soft elevation (0–4).
- Motion ≤ 200 ms, ease-out; subtle pulses for autosave.
- Keyboard-first; reduced-motion respected.

---

## 🧩 5.5 Content Authoring

- Markdown + KaTeX; code fences with language labels.
- Live lint: structure, balanced `$`, untagged code, weak phrases, spoiler hints.
- Autosave every 5 s idle; draft-restore banner if unsaved copy found.
- Conflict banner if multiple editors open same draft.

---

## 🗂️ 5.6 Metadata & Classification

- **Difficulty:** Easy / Medium / Hard.
- **Tags:** searchable multi-select; only curators/admin create new.
- **Companies:** optional hidden tags.
- **Visibility:** public / unlisted / internal.
- **Slug:** auto from title, editable pre-publish; changes post-publish create redirects.
- Validation: title 8–80 chars, ≥ 1 tag, statement ≥ 200 chars.

---

## 🧮 5.7 Constraints & Validators

- Structured form for n-ranges, value bounds, graph properties.
- Optional checker script for custom validation.
- “Validate” runs dry-check across all tests.
- Inline feedback icons + 200 ms fade summary toast.

---

## 🧪 5.8 Test Case Manager

Two lists: **Samples (public)** and **Hidden (private)** .
Each shows ordinal, size, and limits.

- **Bulk upload:** CSV or JSON; import summary (added / skipped / errors).
- **Drag reorder:** smooth 150 ms height transition.
- **Pin sample:** ensures correct display order.
- **Integrity:** checksum per I/O pair; export archive (staff-only).

---

## ⚙️ 5.9 Local Sample Runner

- Runs staff-provided snippet on sample inputs only.
- Displays per-sample verdict table (Expected vs Actual).
- Soft-coral highlights for mismatches.
- CPU-/time-limited sandbox; no network.
- Reminder: “Checks visible examples only.”

---

## 📘 5.10 Editorial

- Rich markdown area for solution, complexity, alternatives.
- **Release timing:** on publish / +7 days / manual.
- Structural lint: Approach / Complexity / Notes.
- Warning if editorial leaks solution code.

---

## 🔁 5.11 Review Workflow

- **Send to Review:** assign reviewers; right-panel thread.
- Reviewer actions: comment inline → Approve / Request changes.
- Publish gate: ≥ 1 approval + no blocking validations.
- Audit log: who reviewed, timestamp, version hash.
- Notifications via Resend.

---

## 🕓 5.12 Versioning & History

- **Create Version:** freeze draft → ProblemVersion N.
- Version list shows author, diff size, hash.
- Diff viewer (side-by-side) with highlighted changes.
- **Rollback:** spawn new draft from any snapshot.

---

## 🔒 5.13 Permissions Summary

- Draft/edit/tests/editorial: `PROBLEM_CURATOR | ADMIN`
- Review/publish: approved by other curator or admin.
- Archive/unpublish: `ADMIN`
- Moderation: `MODERATOR | PROBLEM_CURATOR | ADMIN`
- Delete tests/editorial: curator+, audited.

---

## 🌱 5.14 Community Proposals (LeetCode-style)

### USER Flow

1. **Submit proposal** → title, intended difficulty, statement (markdown + math), ≥ 1 sample I/O, originality checkbox.
2. Status: `submitted → prescreen → in_review → accepted | changes requested | rejected`.
3. Private review thread with staff.
4. Accepted → curator **converts to draft** and finishes hidden tests/editorial.
5. Contributor credited on publish (“Contributed by @handle”).

### MODERATOR Flow

- Prescreen duplicates/spam.
- Provide feedback; cannot accept/publish.
- Escalate promising ones to curators.

### CURATOR Flow

- Review quality, accept, convert to draft, finalize and publish.
- Enforce rubric: clarity, constraints, examples, originality.

### ADMIN Flow

- Oversight, role changes, rate-limit policy, final arbitration.

**Quotas**

- USER \= 3 active proposals, 5 edits/day.
- MODERATOR \= unlimited prescreens.
- Curators/Admin \= unlimited.

**Privacy**

- Proposals private until published; audited actions only.

---

## 🚦 5.15 Performance & Reliability

- Debounced autosave (≤ 5 s).
- Uploads resumable + progress.
- Conflict banner on parallel edits.
- React Query staleTime: 0–10 s for drafts, 60–300 s for reference data.
- Optimistic draft mutations; safe rollback.

---

## ♿ 5.16 Accessibility & Polish

- Full keyboard control; toolbar shortcuts.
- High-contrast mode validated.
- Reduced-motion respected.
- Toaster feedback ≤ 200 ms fade.
- Drag reorder accessible via keys.

---

## 📊 5.17 Telemetry & Audit

- Metrics: time-to-author, review loops, publish latency, import errors, sample runner fails.
- Audit events: draft created / reviewed / approved / published / archived / proposal accepted / tests uploaded / editorial released.
- Dashboard widgets: active drafts, proposal backlog, avg review time.

---

## ✅ 5.18 Definition of Done

- [ ] Curator can create draft → review → publish fully via tRPC.
- [ ] Versioning and rollback work; audits recorded.
- [ ] Hidden tests secured; editorial release timed.
- [ ] Editor fast, accessible, ≤ 200 ms transitions.
- [ ] Role middleware enforces matrix exactly.
- [ ] Moderators cannot publish; curators cannot self-approve.
- [ ] Proposal system (optional) live; attribution shown.
- [ ] UI and UX match Reader’s style for consistency.

---

## ✨ 5.19 Optional Delight Features

- Guided problem templates (“Graph Shortest Path”, “DP on Grid”).
- Constraint advisor suggesting ranges for target complexity.
- Tiny checkmark shimmer on successful publish.
- Contributor showcase modal for accepted community problems.
