export const problemsConfig = {
  library: {
    badge: "LIBRARY",
    headline: "Problem Library",
    description: "Browse algorithmic challenges with tags, difficulty filters, and fast search.",
    search: {
      placeholder: "Search problems…",
      resetFilters: "Reset Filters",
    },
    sort: {
      relevance: "Relevance",
      newest: "Newest",
      difficulty: "Difficulty ↑",
      difficulty_desc: "Difficulty ↓",
    },
    filters: {
      difficulty: "Difficulty",
      status: "Status",
      tags: "Tags",
      editorial: "Has Editorial",
    },
    states: {
      loading: "Loading problems…",
      empty: {
        title: "No problems found",
        description: "Try adjusting your filters or search query.",
        clearFilters: "Clear Filters",
      },
      error: {
        title: "Failed to load problems",
        description: "Please refresh and try again.",
        retry: "Retry",
      },
    },
    stats: {
      problems: "problems",
      showing: "Showing",
      of: "of",
    },
  },
  detail: {
    badge: "PROBLEM",
    breadcrumb: {
      home: "Problems",
    },
    sections: {
      statement: "Statement",
      constraints: "Constraints",
      examples: "Examples",
      notes: "Notes",
      samples: "Samples",
    },
    actions: {
      copy: "Copy URL",
      copied: "Copied",
      bookmark: "Bookmark",
      unbookmark: "Remove bookmark",
      report: "Report",
      editorial: "Editorial",
      discuss: "Discuss",
      trails: "Trails",
      submissions: "My Submissions",
    },
    workspace: {
      title: "Ready to solve",
      actions: {
        statement: "Statement",
        preferences: "Preferences",
        reset: "Reset",
        copy: "Copy",
        save: "Save",
        run: "Run Samples",
        submit: "Submit",
      },
      console: {
        title: "Console",
        empty: "Console output will appear here.",
      },
      tabs: {
        run: "Run output",
        judge: "Judge",
        description: "Description",
        editorial: "Editorial",
        submissions: "Submissions",
        drafts: "My Code",
      },
      states: {
        saving: "Saving…",
        saved: "Saved",
        offline:
          "Offline mode — drafts stay local and sample runs fall back to the local simulator.",
        presence:
          "Another tab is editing this problem. To avoid overwriting drafts, close other sessions.",
        manualOnly:
          "This problem is reviewed manually. Expect longer turnaround while a curator scores your submission.",
        manualHybrid:
          "Hybrid judging enabled — the auto judge runs first, followed by a manual reviewer.",
        antiCheat: {
          title: "Anti-cheat guard active",
          reminder: "Tab switches, large pastes, and multi-device logins trigger reviews.",
        },
        disqualified:
          "You have been disqualified from this contest. Submissions are blocked for this window.",
        customInput: "Custom Input",
        customInputPlaceholder: "stdin sent to the runner",
        noSubmissions: "No submissions yet.",
        noDrafts: "No cloud drafts yet.",
        editorialLocked: "Editorial locked",
        editorialLockedDescription: "View the full write-up once it is released.",
        restore: "Restore",
        viewHistory: "View history",
      },
      result: {
        empty: "Run samples or submit to see verdicts.",
        manualPending:
          "Manual review pending — we'll update this panel once a reviewer posts a verdict.",
        variants: {
          samples: "Samples",
          judge: "Judge",
        },
        metrics: {
          passed: "Passed",
          failed: "Failed",
          runtime: "Runtime",
        },
        test: "Test",
        input: "In:",
        output: "Out:",
        stderr: "stderr:",
        noDetails: "No per-test details yet.",
      },
      preferences: {
        title: "Preferences",
        editorTheme: "Editor theme",
        fontSize: "Font size",
        wrapLines: "Wrap lines",
        showMinimap: "Show minimap",
        themes: {
          system: "system",
          light: "light",
          dark: "dark",
        },
      },
    },
  },
  discuss: {
    badge: "DISCUSSIONS",
    headline: "Problem Discussions",
    description: "Discuss hints, tricky cases, and approaches with the community.",
    composer: {
      badge: "START A THREAD",
      headline: "New Discussion",
      placeholder: "Thread title",
      contentPlaceholder: "Share your question or hint",
      submitButton: "Start discussion",
      spoilerLabel: "Mark as spoiler",
    },
    tabs: {
      threads: "Threads",
      top: "Top",
      recent: "Recent",
      unanswered: "Unanswered",
    },
    states: {
      loading: "Loading discussions…",
      empty: {
        title: "No discussions yet",
        description: "Start the conversation above",
      },
      loadMore: "Load more",
      loadingMore: "Loading…",
      selectThread: "Select a thread",
      pickThread: "Pick a thread to read the discussion.",
    },
    sidebar: {
      problem: "Problem",
      tags: "Tags",
      editorial: "View editorial",
      rules: {
        title: "House rules",
        items: [
          "Share hints, not full solutions.",
          "Mark spoilers and be respectful.",
          "Report abuse so moderators can step in.",
        ],
      },
    },
    thread: {
      badge: "DISCUSSION",
      backLink: "Back to discussions",
      replies: "Replies",
      replyCount: "replies",
    },
  },
  editorial: {
    badge: "EDITORIAL",
    headline: "Editorial",
    description: "Official solution and walkthrough for this problem.",
    actions: {
      backToProblem: "Back to problem",
      viewDiscussions: "View discussions",
    },
    states: {
      released: "Released",
      locked: "Locked",
      scheduledPrefix: "Scheduled to unlock",
      lockedTitle: "Editorial locked",
      lockedDescription: "This write-up unlocks",
      lockedFallback: "Editors will publish this walkthrough soon.",
    },
    hints: {
      title: "Hints refresher",
    },
  },
  trails: {
    badge: "TRAILS",
    headline: "Approach trails",
    description:
      "Map the insights solvers used to unlock this problem and contribute your own breadcrumb.",
    actions: {
      backToProblem: "Back to problem",
      viewDiscussions: "View discussions",
    },
  },
  tagLibrary: {
    badge: "TAG",
    headlinePrefix: "Problems tagged",
    description: "Browse public problems filtered by this tag.",
  },
};

export type ProblemsConfig = typeof problemsConfig;
