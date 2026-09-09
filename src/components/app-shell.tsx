"use client";

import { Star as Heart, Map, Search, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const items = [
  { href: "/home", key: "journey", icon: Map },
  { href: "/search", key: "search", icon: Search },
  { href: "/favorites", key: "favorites", icon: Heart },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">{t("skip")}</a>
      <nav className="app-nav" aria-label="Primary">
        {items.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`) || (href === "/home" && pathname.startsWith("/chapter"));
          return <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" size={21} strokeWidth={1.8} /><span>{t(key)}</span></Link>;
        })}
      </nav>
      <main id="main-content" className="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
