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
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={site.clientLogin} rel="nofollow">Client login</a>
          <Link href="/library" prefetch={false}>Partner library</Link>
        </div>
      </div>
      <div className="wrap header-row">
        <Link href="/" className="logo" aria-label="Labb home">
          <Image src="/brand/labb-logo.png" alt="Labb" width={600} height={245} priority style={{ width: "auto" }} />
          <Image src="/brand/labbhr-logo.png" alt="LabbHR" width={247} height={300} className="sub" style={{ width: "auto" }} />
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
          <Link href="/get-a-quote" className="btn btn-primary nav-cta">Get a Quote</Link>
        </nav>
      </div>
    </header>
  );
}
