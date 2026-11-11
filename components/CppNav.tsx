import Link from "next/link";

const pages = [
  { href: "/channel-partner-program", label: "Overview" },
  { href: "/channel-partner-program/program-details", label: "Program Details" },
  { href: "/channel-partner-program/get-started", label: "Get Started" },
  { href: "/login?next=/members", label: "Member Login" },
];

// Section tabs shared by the Channel Partner Program pages.
export function CppNav({ current }: { current: string }) {
  return (
    <nav className="wrap sub-nav" aria-label="Channel Partner Program">
      {pages.map((p) => (
        <Link key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined}>{p.label}</Link>
      ))}
    </nav>
  );
}
