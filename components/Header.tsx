"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    document.querySelectorAll<HTMLDetailsElement>(".main-nav details[open]").forEach((d) => (d.open = false));
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="utility">
        <div className="wrap">
          <span className="utility-msg">
            Questions? Call <a href={site.phoneHref}>{site.phone}</a> or email <a href={`mailto:${site.email}`}>{site.email}</a>
          </span>
          <span className="utility-links">
            <Link href="/library" prefetch={false}>Partner library</Link>
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
              "children" in item ? (
                <li key={item.label}>
                  <details>
                    <summary>{item.label}</summary>
                    <ul>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} aria-current={pathname === c.href ? "page" : undefined}>{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>{item.label}</Link>
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
