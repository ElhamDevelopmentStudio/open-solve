type NavItem = {
  title: string;
  href: string;
  icon?: string;
  soon?: boolean;
};

export const dashboardNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
  { title: "Problems", href: "/workspace/problems", icon: "problems" },
  { title: "Submissions", href: "/submissions", icon: "history" },
  { title: "Leaderboards", href: "/workspace/leaderboards", icon: "trophy" },
  { title: "Discussions", href: "/workspace/discuss", icon: "discussions" },
  { title: "Trails", href: "/workspace/trails", icon: "trails" },
  { title: "Editorials", href: "/workspace/editorials", icon: "editorial" },
  { title: "Proposals", href: "/proposals", icon: "sparkles" },
  { title: "Contests", href: "/contests", icon: "trophy" },
  { title: "Teams", href: "/teams", icon: "users", soon: true },
];

export type { NavItem };
