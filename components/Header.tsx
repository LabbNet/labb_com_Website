"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav as navItems, site } from "@/lib/site";

type NavChild = { href?: string; label?: string; heading?: string };
type NavItem = { label: string; href?: string; base?: readonly string[]; children?: readonly NavChild[] };
const nav = navItems as readonly NavItem[];

export function Header() {
  const [open, setOpen] = useState(false); // mobile menu
  const [menu, setMenu] = useState<string | null>(null); // which dropdown is open (only one at a time)
  const pathname = usePathname();
  // Links with a #section are never marked current; the section's main page is.
  const isCurrent = (href?: string) => !!href && !href.includes("#") && pathname === href.split("?")[0];
  const inSection = (item: NavItem) =>
    (item.children || []).some((c) => isCurrent(c.href)) || (item.base || []).some((b) => pathname === b || pathname.startsWith(b + "/"));

  // Close everything on navigation.
  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  // Close the open dropdown on a click anywhere outside it, or on Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = (e.target as HTMLElement).closest?.(".dd");
      if (!el || el.getAttribute("data-menu") !== menu) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <header className="site-header">
      <div className="utility">
        <div className="wrap">
          <span className="utility-msg">
            Questions? Call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a>
          </span>
          <span className="utility-links">
            <Link href="/members" prefetch={false}>CPP member login</Link>
            <a href={site.clientLogin} rel="nofollow">Client login</a>
          </span>
        </div>
      </div>
      <div className="wrap header-row">
        <Link href="/" className="logo" aria-label="Labb home">
          <Image src="/brand/labb-logo-white.png" alt="Labb" width={600} height={225} priority style={{ width: "auto" }} />
        </Link>
        <button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
        <nav id="main-nav" className={`main-nav${open ? " open" : ""}`} aria-label="Main">
          <ul>
            {nav.map((item) =>
              item.children ? (
                <li key={item.label} className={`dd${menu === item.label ? " open" : ""}`} data-menu={item.label}>
                  <button
                    type="button"
                    className={inSection(item) ? "current" : undefined}
                    aria-expanded={menu === item.label}
                    aria-controls={`menu-${item.label.replace(/\s+/g, "-").toLowerCase()}`}
                    onClick={() => setMenu(menu === item.label ? null : item.label)}
                  >
                    {item.label}
                  </button>
                  <ul id={`menu-${item.label.replace(/\s+/g, "-").toLowerCase()}`} hidden={menu !== item.label}>
                    {item.children.map((c) =>
                      c.heading ? (
                        <li key={c.heading} className="dd-head" aria-hidden="true">{c.heading}</li>
                      ) : (
                        <li key={c.href}>
                          <Link href={c.href!} aria-current={isCurrent(c.href) ? "page" : undefined} onClick={() => setMenu(null)}>{c.label}</Link>
                        </li>
                      ),
                    )}
                  </ul>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href!} aria-current={isCurrent(item.href!) ? "page" : undefined}>{item.label}</Link>
                </li>
              ),
            )}
          </ul>
          <Link href="/get-a-quote" className="btn btn-primary btn-lg nav-cta">Get a Quote</Link>
        </nav>
      </div>
    </header>
  );
}
