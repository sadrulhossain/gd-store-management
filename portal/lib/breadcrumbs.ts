import type { MenuNode } from "@/lib/api/types";

export interface Crumb {
  label: string;
  /** Absent for the current page and for non-navigable group labels. */
  href?: string;
}

function headline(segment: string): string {
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function segmentLabel(segment: string): string {
  if (/^\d+$/.test(segment)) return "Details";
  return headline(segment);
}

function findByPath(
  nodes: MenuNode[],
  path: string,
  parent: MenuNode | null = null,
): { node: MenuNode; parent: MenuNode | null } | null {
  for (const node of nodes) {
    if (node.path === path) return { node, parent };
    const found = findByPath(node.children, path, node);
    if (found) return found;
  }

  return null;
}

/** Breadcrumbs for a portal path: menu titles for the section, readable labels for the rest. */
export function buildBreadcrumbs(pathname: string, menu: MenuNode[]): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];
  const section = findByPath(menu, `/${segments[0]}`);

  if (section?.parent) crumbs.push({ label: section.parent.title });
  crumbs.push({ label: section?.node.title ?? headline(segments[0]), href: `/${segments[0]}` });

  let href = `/${segments[0]}`;
  for (const segment of segments.slice(1)) {
    href += `/${segment}`;
    crumbs.push({ label: segmentLabel(segment), href });
  }

  // The current page is not a link.
  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };

  return crumbs;
}
