import {
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  CalendarCheck,
  Code,
  Cpu,
  Gamepad2,
  Globe,
  ListChecks,
  PenTool,
  PlugZap,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'
import React from 'react'

import type { SiteIconName } from '@/fields/iconSelect'

const ICONS: Record<SiteIconName, LucideIcon> = {
  workflow: Workflow,
  'list-checks': ListChecks,
  'plug-zap': PlugZap,
  search: Search,
  'pen-tool': PenTool,
  'shield-check': ShieldCheck,
  rocket: Rocket,
  code: Code,
  smartphone: Smartphone,
  cpu: Cpu,
  boxes: Boxes,
  globe: Globe,
  sparkles: Sparkles,
  users: Users,
  briefcase: Briefcase,
  'book-open': BookOpen,
  wallet: Wallet,
  'calendar-check': CalendarCheck,
  'gamepad-2': Gamepad2,
  'bar-chart-3': BarChart3,
}

/** Renders a CMS-selected icon; unknown values fall back to `sparkles` instead of crashing. */
export const SiteIcon: React.FC<{ name?: string | null } & LucideProps> = ({ name, ...props }) => {
  const Icon = (name && ICONS[name as SiteIconName]) || Sparkles
  return <Icon aria-hidden="true" {...props} />
}
