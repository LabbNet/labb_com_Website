"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReadsNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="admin-subnav" aria-label="Reads">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={(l.href === "/reads" ? path === "/reads" : path.startsWith(l.href)) ? "page" : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
