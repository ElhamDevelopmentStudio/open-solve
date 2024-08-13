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
  forgotPassword: {
    badge: "PASSWORD RECOVERY",
    headline: "Reset access credentials",
    description:
      "Enter your email and we'll send a time-limited reset link. This process is logged and you'll receive a notification once the reset is complete.",
    security: [
      "Link expires in 60 minutes",
      "One-time use only",
      "IP address logged for audit",
      "Active sessions preserved",
    ],
  },
  resetPassword: {
    badge: "NEW CREDENTIALS",
    headline: "Set your new password",
    description:
      "Choose a strong password. All active sessions except the current one will be invalidated after reset.",
    requirements: [
      "Minimum 8 characters",
      "At least one uppercase letter",
      "At least one lowercase letter",
      "At least one number",
    ],
    invalid: {
      headline: "Invalid or expired link",
      description:
        "This password reset link is no longer valid. It may have expired or already been used.",
    },
  },
  verifyEmail: {
    badge: "EMAIL VERIFICATION",
    loading: {
      headline: "Verifying your email",
      description: "Processing verification token...",
    },
    success: {
      headline: "Email verified",
      description: "Your email has been successfully verified. You now have full platform access.",
      features: [
        "Contest registration enabled",
        "Prize claims activated",
        "Full API access granted",
        "Discussion posting unlocked",
      ],
    },
    error: {
      headline: "Verification failed",
      description:
        "This verification link is invalid or has expired. Request a new verification email from your account settings.",
    },
  },
  magicLink: {
    badge: "PASSWORDLESS AUTH",
    loading: {
      headline: "Authenticating",
      description: "Validating your magic link token...",
    },
    success: {
      headline: "Authentication successful",
      description: "You're being redirected to your dashboard.",
    },
    error: {
      headline: "Authentication failed",
      description:
        "This magic link is invalid or has expired. Magic links are single-use and expire after 15 minutes.",
    },
  },
};

export type AuthConfig = typeof authConfig;
