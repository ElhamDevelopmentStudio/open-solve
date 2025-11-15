import {
  Alert01Icon,
  Award02Icon,
  ClipboardIcon,
  CodeSquareIcon,
  GridIcon,
  LegalHammerIcon,
  LockPasswordIcon,
  Megaphone01Icon,
  Message01Icon,
  Shield01Icon,
  SparklesIcon,
  Target01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  WorkHistoryIcon,
} from "hugeicons-react";
import type { ComponentType, SVGProps } from "react";

const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "layout-dashboard": GridIcon,
  dashboard: GridIcon,
  "list-checks": ClipboardIcon,
  problems: CodeSquareIcon,
  history: WorkHistoryIcon,
  submissions: LegalHammerIcon,
  trophy: Award02Icon,
  contests: Award02Icon,
  sparkles: SparklesIcon,
  users: UserGroupIcon,
  user: UserCheck01Icon,
  discussions: Message01Icon,
  system: Shield01Icon,
  audit: Alert01Icon,
  shield: Shield01Icon,
  lock: LockPasswordIcon,
  proposals: Megaphone01Icon,
  default: Target01Icon,
};

export function resolveNavIcon(icon?: string) {
  if (!icon) return iconMap.default;
  return iconMap[icon] ?? iconMap.default;
}
