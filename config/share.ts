export const sharedPageConfig = {
  badge: "Shared Snapshot",
  headline: {
    line1: "Read-Only",
    line2: "Submission",
  },
  description:
    "Immutable sandbox view of a submitted solution. Rendered exactly as the judge saw it—no edits, no replays, no surprises.",
  navTagline: "Shared snapshot",
  meta: [
    { label: "Visibility", value: "Read Only" },
    { label: "Integrity", value: "Signed + Audited" },
    { label: "Share Mode", value: "Public Link" },
    { label: "Judge", value: "OpenSolve MQ" },
  ],
  link: {
    label: "Link Payload",
    copy: "Share responsibly — links inherit your session limits.",
  },
  safety: [
    {
      title: "Zero-Write Guarantee",
      copy: "This view runs without mutation permissions. No code, verdict, or metadata can be altered from here.",
    },
    {
      title: "Traceable Access",
      copy: "Access events can be audited by platform admins. Use this link only with people you trust.",
    },
    {
      title: "Judge Parity",
      copy: "Outputs match the recorded run; re-execution is disabled to prevent divergence from historical results.",
    },
  ],
  viewer: {
    sectionLabel: "Submission Viewer",
    title: "Submission viewer",
  },
  ctas: {
    primary: { label: "Browse Problems", href: "/problems" },
    secondary: { label: "Return to Dashboard", href: "/dashboard" },
  },
  integrityLabel: "Integrity Notes",
};

export type SharedPageConfig = typeof sharedPageConfig;
