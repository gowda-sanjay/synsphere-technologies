"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { SynSphereLogo } from "@/components/brand/synsphere-logo";

const links = [
  { href: "/about", label: "About" },
  { href: "/synkode", label: "SynKode" },
  { href: "/courses", label: "Courses" },
  { href: "/jobs", label: "Find a job" },
  { href: "/placements", label: "Placements" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    setLogoutError(false);
    const succeeded = await signOut();
    if (!succeeded) {
      setLogoutError(true);
      return;
    }
    setMenuOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="header-inner shell">
        <Link className="brand" href="/" aria-label="SynSphere home" onClick={() => setMenuOpen(false)}>
          <SynSphereLogo className="h-[58px] w-auto max-w-full object-contain" priority />
        </Link>

        <nav className={`primary-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {links.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {!loading && user ? <Link className="mobile-sign-in" href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link> : null}
          {!loading && !user ? <Link className="mobile-sign-in" href="/login" onClick={() => setMenuOpen(false)}>Sign in</Link> : null}
          {!loading && user ? <button className="mobile-sign-out" type="button" onClick={handleSignOut}>Sign out <LogOut size={15} aria-hidden="true" /></button> : null}
        </nav>

        <div className="header-actions">
          {!loading && user ? <Link className="sign-in-link" href="/dashboard">Dashboard</Link> : null}
          {!loading && user ? <button className="button button-dark header-cta" type="button" onClick={handleSignOut}>Sign out <LogOut size={15} aria-hidden="true" /></button> : null}
          {!loading && !user ? <Link className="sign-in-link" href="/login">Sign in</Link> : null}
          {!loading && !user ? <Link className="button button-dark header-cta" href="/signup">Get started <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" /></Link> : null}
        </div>

        {logoutError ? <span className="logout-error" role="status">Could not sign out. Please try again.</span> : null}

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}