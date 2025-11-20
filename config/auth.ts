export const authConfig = {
  signIn: {
    badge: "ACCESS CONTROL",
    headline: {
      line1: "RE-ENTER",
      line2: "THE GRID",
    },
    description:
      "Resume where you left off: compiler sessions, submissions, and contest snapshots stay intact. Authentication here is strict, auditable, and ready for high-stakes competition.",
    meta: [
      { label: "Uptime", value: "99.9% auth edge" },
      { label: "2FA", value: "TOTP + recovery" },
      { label: "Sessions", value: "Scoped to device" },
      { label: "Alerts", value: "Unusual login ping" },
    ],
    checkpoints: [
      {
        title: "Secure handoff",
        copy: "Invalidate previous risky sessions automatically once you pass 2FA.",
      },
      {
        title: "Contest safe",
        copy: "Auth locks are tuned to avoid mid-contest sign-outs while still enforcing device checks.",
      },
      {
        title: "Minimal friction",
        copy: "Password + optional TOTP only—no surprise captchas to interrupt your flow.",
      },
    ],
    links: {
      forgot: { label: "Recover access", href: "/auth/forgot-password" },
      signup: { label: "Create an account", href: "/sign-up" },
      terms: { label: "Terms", href: "/terms" },
      privacy: { label: "Privacy", href: "/privacy" },
    },
  },
  signUp: {
    badge: "ONBOARDING",
    headline: {
      line1: "JOIN THE",
      line2: "JUDGE LOOP",
    },
    description:
      "Create your OpenSolve identity, sync devices, and earn your first streak. Every profile gets versioned, auditable progress from day zero.",
    meta: [
      { label: "Profiles", value: "Multi-device ready" },
      { label: "Handles", value: "Unique, verifiable" },
      { label: "Welcome", value: "Starter trail unlocked" },
      { label: "Privacy", value: "Minimal telemetry" },
    ],
    checkpoints: [
      {
        title: "Instant sandbox",
        copy: "We provision isolated containers as soon as you finish step 2—no waiting for approval.",
      },
      {
        title: "Handle assurance",
        copy: "Reserved handles stay locked during sign-up; finish within 15 minutes to keep it.",
      },
      {
        title: "Contest ready",
        copy: "Profiles are contest-compatible immediately; just verify email to claim prizes.",
      },
    ],
    steps: [
      { label: "Credentials", helper: "Email + strong password" },
      { label: "Profile", helper: "Display name & handle (optional)" },
    ],
    links: {
      signin: { label: "Sign in", href: "/sign-in" },
      terms: { label: "Terms", href: "/terms" },
      privacy: { label: "Privacy", href: "/privacy" },
    },
  },
  layout: {
    badge: "AUTH WALL",
    headline: "Secure entry point for OpenSolve competitors",
    tagline: "No rounded corners. No fluff. Just access control purpose built for coding battles.",
    stats: [
      { label: "Active developers", value: "12,000+" },
      { label: "Curated problems", value: "500+" },
      { label: "Contest cadence", value: "Weekly" },
    ],
  },
};

export type AuthConfig = typeof authConfig;
