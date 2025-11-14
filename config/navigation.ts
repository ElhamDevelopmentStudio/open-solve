type NavItem = {
  title: string;
  href: string;
  icon?: string;
  soon?: boolean;
};

export const dashboardNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { title: "Problems", href: "/problems", icon: "list-checks" },
  { title: "Submissions", href: "/submissions", icon: "history" },
  { title: "Leaderboards", href: "/leaderboards", icon: "trophy" },
  { title: "Proposals", href: "/proposals", icon: "sparkles" },
  { title: "Contests", href: "/contests", icon: "trophy" },
  { title: "Teams", href: "/teams", icon: "users", soon: true },
];

export type { NavItem };
