export const proposalsConfig = {
  listing: {
    hero: {
      marker: "[01] PROBLEM PIPELINE",
      badge: "OPEN CALL",
      headline: {
        line1: "AUTHOR",
        line2: "THE NEXT",
        line3: "CHALLENGE",
      },
      description:
        "Track every submission you push into the OpenSolve queue. Status labels mirror our internal review stages and update automatically.",
      primaryCta: { label: "Submit proposal", href: "/proposals/new" },
      secondaryCta: { label: "Read guidelines", href: "/docs/problem-playbook" },
    },
    empty: {
      title: "No proposals yet",
      description: "Ship your first problem idea and follow it through prescreen to launch.",
      actionLabel: "Start drafting",
    },
    table: {
      marker: "[02]",
      title: "My submissions",
      description:
        "Each row is a versioned proposal. Hover for quick actions, click through to edit.",
      headers: {
        title: "Title",
        difficulty: "Intended difficulty",
        status: "Status",
        updated: "Last update",
      },
    },
    statusMap: {
      SUBMITTED: "Submitted",
      PRESCREEN: "Prescreen",
      IN_REVIEW: "In review",
      CHANGES_REQUESTED: "Changes requested",
      ACCEPTED: "Accepted",
      REJECTED: "Rejected",
    },
  },
  form: {
    hero: {
      marker: "[01] SUBMIT PROPOSAL",
      title: "Problem brief",
      description:
        "Share a fully fleshed-out prompt. We need reproducible samples, original statements, and a clear difficulty rating.",
    },
    sections: {
      metadata: {
        marker: "[02]",
        title: "Metadata",
        description: "Title + intended difficulty help reviewers route your prompt.",
      },
      statement: {
        marker: "[03]",
        title: "Statement",
        description: "Markdown supported. Include constraints, input/output format, and notes.",
      },
      samples: {
        marker: "[04]",
        title: "Samples",
        description: "Minimum of one sample pair. Add more for edge cases.",
        addLabel: "Add sample",
      },
      confirmation: {
        marker: "[05]",
        title: "Final check",
        description: "Confirm originality before submitting.",
        checkboxLabel: "I confirm this idea is original and unlicensed elsewhere.",
      },
    },
    submitLabel: "Submit proposal",
    pendingLabel: "Submitting...",
    requirements: {
      titleMin: 8,
      statementMin: 200,
    },
    helper: {
      length: "Statement must be at least 200 characters.",
      samples: "Provide input and output for each sample.",
    },
  },
};

export type ProposalsConfig = typeof proposalsConfig;
