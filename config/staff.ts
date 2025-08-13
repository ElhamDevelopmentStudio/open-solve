export const staffConfig = {
  problems: {
    marker: "[09] STAFF OPS",
    badge: "CURATION",
    headline: {
      line1: "AUTHOR",
      line2: "STAFF",
      line3: "QUEUE",
    },
    description:
      "Draft, review, and publish problems with explicit confirmation gates for every state change.",
    list: {
      marker: "[01]",
      title: "Draft queue",
      empty: "No drafts yet.",
      columns: {
        title: "Title",
        state: "State",
        author: "Author",
        updated: "Updated",
      },
      metrics: [
        { key: "total", title: "All", description: "Tracked problems" },
        { key: "draft", title: "Drafts", description: "Awaiting review" },
        { key: "review", title: "Review", description: "In QA queue" },
        { key: "published", title: "Published", description: "Live to solvers" },
      ],
      actions: {
        open: "Open",
        newDraft: "New draft",
        creating: "Creating...",
      },
    },
    editor: {
      marker: "[02]",
      title: "Problem editor",
      description:
        "Edit content, metadata, tests, and languages. All state transitions require confirmation.",
      actions: {
        submit: "Submit for review",
        requestChanges: "Request changes",
        approve: "Approve",
        publish: "Publish",
        addCurator: "Add curator",
        removeCurator: "Remove curator",
      },
      confirm: {
        submit: "Send problem to review?",
        requestChanges: "Return to draft with requested changes?",
        approve: "Approve this version for publication?",
        publish: "Publish this problem to participants?",
        removeCurator: "Remove this curator from the problem?",
        deleteTestCase: "Delete this judge test case?",
      },
      confirmDetails: {
        submit: "Make sure content, metadata, and tests are saved before review.",
        requestChanges: "This will move the version back to draft and notify collaborators.",
        approve: "Locks this version for publication and signals downstream tools.",
        publish: "Publishes using the selected visibility settings.",
        deleteTestCase: "Removes this case from the judge matrix; this cannot be undone.",
      },
    },
  },
  proposals: {
    marker: "[10] COMMUNITY PIPELINE",
    badge: "PROPOSALS",
    headline: {
      line1: "TRIAGE",
      line2: "COACH",
      line3: "CONVERT",
    },
    description:
      "Review community submissions, keep authors unblocked, and graduate accepted ideas into drafts.",
    list: {
      marker: "[01]",
      title: "Submission queue",
      description: "Filter by workflow stage and jump straight into detailed review.",
      empty: "No proposals match this view.",
      searchPlaceholder: "Search titles or author handles…",
      metrics: [
        { key: "submitted", title: "Awaiting triage", meta: "Need prescreen" },
        { key: "inReview", title: "In review", meta: "Curator owned" },
        { key: "accepted", title: "Accepted", meta: "Ready to convert" },
      ],
      actions: {
        guidelines: "Review guidelines",
        createDraft: "Create draft",
      },
    },
    detail: {
      marker: "[02]",
      title: "Proposal detail",
      commentPlaceholder: "Leave feedback for the author...",
      commentsEmpty: "No feedback yet.",
      samplesTitle: "Samples",
      actions: {
        prescreen: "Mark prescreened",
        review: "Move to review",
        requestChanges: "Request changes",
        accept: "Accept",
        reject: "Reject",
        convert: "Convert to draft",
      },
      confirm: {
        prescreen: "Move this proposal into prescreen?",
        review: "Assign to you and enter review?",
        requestChanges: "Send back with changes requested?",
        accept: "Accept and credit the contributor?",
        reject: "Reject this proposal?",
        convert: "Create a draft problem from this proposal?",
      },
      confirmDetails: {
        prescreen: "You can still send it back if gaps remain.",
        review: "Sets you as reviewer and notifies the author.",
        requestChanges: "Adds a comment with context if provided.",
        accept: "Finalise as accepted before conversion.",
        reject: "Rejection posts the status immediately.",
        convert: "Creates an internal draft and marks this proposal accepted.",
      },
    },
  },
};

export type StaffConfig = typeof staffConfig;
