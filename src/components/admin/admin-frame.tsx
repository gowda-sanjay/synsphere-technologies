"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SynSphereLogo } from "@/components/brand/synsphere-logo";
import {
  Activity, Bell, BookOpen, BriefcaseBusiness, Building2, FileText, GraduationCap,
  LayoutDashboard, Menu, PieChart, Settings, Users, X,
} from "lucide-react";
import { DashboardLogout } from "@/components/dashboard/dashboard-logout";

const adminNavigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/enrollments", label: "Enrollments", icon: GraduationCap },
  { href: "/admin/placements", label: "Placements", icon: Building2 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: PieChart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AD";
}

export function AdminFrame({
  children,
  adminName,
  adminEmail,
  avatarUrl,
}: {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function renderNavigation(mobile = false) {
    return adminNavigation.map(({ href, label, icon: Icon }) => {
      const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
      return (
        <Link
          key={href}
          href={href}
          onClick={() => { if (mobile) setMenuOpen(false); }}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-10 items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ef815f] ${active ? "bg-[#e7f1eb] text-[#145b48]" : "text-[#d1ddd5] hover:bg-white/10 hover:text-white"}`}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      );
    });
  }

  const sidebar = (mobile = false) => (
    <div className="flex h-full flex-col bg-[#152b2b] text-white">
      <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-5">
        <SynSphereLogo className="h-12 w-auto max-w-[76px] object-contain" />
        <p className="min-w-0 text-[9px] font-bold tracking-[0.16em] text-[#aebcb4]">ADMIN CONSOLE</p>
        {mobile ? <button className="ml-auto grid h-9 w-9 place-items-center rounded text-white hover:bg-white/10" type="button" onClick={() => setMenuOpen(false)} aria-label="Close admin navigation"><X size={18} /></button> : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        <p className="px-3 pb-2 text-[9px] font-bold tracking-[0.16em] text-[#91a39a]">WORKSPACE</p>
        {renderNavigation(mobile)}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 px-2 py-2">
          <Activity size={14} className="text-[#d5f079]" aria-hidden="true" />
          <span className="text-xs text-[#c0ccc5]">Admin access verified</span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="mx-auto min-h-[calc(100vh-150px)] w-full max-w-[1600px] px-3 py-4 sm:px-5 lg:px-6">
      <div className="grid min-h-[calc(100vh-182px)] overflow-hidden border border-[#dce4dd] bg-white shadow-[0_14px_45px_rgba(21,43,43,0.08)] md:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="hidden md:block">{sidebar()}</aside>
        <div className="flex min-w-0 flex-col">
          <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-[#e5e9e2] bg-white px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded border border-[#dce4dd] text-[#152b2b] md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open admin navigation" aria-expanded={menuOpen}>
                <Menu size={18} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.15em] text-[#176b55]">ADMINISTRATION</p>
                <p className="truncate text-sm font-semibold text-[#152b2b]">{pathname === "/admin" ? "Dashboard" : adminNavigation.find((item) => item.href === pathname)?.label ?? "Admin workspace"}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-48 truncate text-xs font-semibold text-[#152b2b]">{adminName}</p>
                <p className="max-w-48 truncate text-[10px] text-[#657474]">{adminEmail}</p>
              </div>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={`${adminName} avatar`} width={36} height={36} unoptimized className="h-9 w-9 rounded-full border border-[#dce4dd] object-cover" />
              ) : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f1eb] text-xs font-bold text-[#145b48]" aria-label={`${adminName} avatar`}>{initials(adminName)}</span>}
              <DashboardLogout className="flex min-h-9 items-center gap-1.5 rounded border border-[#dce4dd] px-2.5 text-xs font-semibold text-[#425252] hover:border-[#176b55] hover:text-[#145b48] sm:px-3" />
            </div>
          </header>
          <div className="min-w-0 flex-1 bg-[#f7f8f3] p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button className="absolute inset-0 cursor-default bg-[#0c1918]/55" onClick={() => setMenuOpen(false)} aria-label="Close admin navigation overlay" />
          <aside className="absolute inset-y-0 left-0 w-[min(300px,86vw)] shadow-2xl" aria-label="Admin navigation drawer">{sidebar(true)}</aside>
        </div>
      ) : null}
    </section>
  );
}