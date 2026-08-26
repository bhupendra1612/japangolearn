import { createElement } from "react";
import {
  BookMarked,
  GraduationCap,
  LayoutDashboard,
  Mail,
  Newspaper,
  PenLine,
  SpellCheck,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminSectionKey } from "@/lib/admin-sections";

/**
 * One icon per admin section. Kept out of `admin-sections.ts` so that module
 * stays plain data with no React dependency.
 */
const SECTION_ICONS: Record<AdminSectionKey, LucideIcon> = {
  users: Users,
  vocabulary: BookMarked,
  kana: Type,
  kanji: PenLine,
  grammar: SpellCheck,
  blog: Newspaper,
  contacts: Mail,
};

export const OverviewIcon = LayoutDashboard;
export const TeachersIcon = GraduationCap;

export function getSectionIcon(key: AdminSectionKey): LucideIcon {
  return SECTION_ICONS[key];
}

export function SectionIcon({
  sectionKey,
  size = 18,
}: {
  sectionKey: AdminSectionKey;
  size?: number;
}) {
  /* createElement rather than binding the looked-up icon to a capitalised local
     and rendering <Icon />: the latter reads as declaring a new component on
     every render, which is what react-hooks/static-components forbids. */
  return createElement(SECTION_ICONS[sectionKey], { size, "aria-hidden": true });
}
