import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, CircleDashed, FileText, GraduationCap, BellRing, LayoutGrid, UserRound, Sparkles, BookOpen } from "lucide-react";
import { SynSphereLogo } from "@/components/brand/synsphere-logo";
import { DashboardLogout } from "@/components/dashboard/dashboard-logout";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getDashboardPageData, getProfileCompletionPercentage } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard — SynSphere", robots: { index: false, follow: false } };

function getInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "SS";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "S");
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.round(diffMs / 86400000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function DashboardPage() {
  const user = await requireCurrentUser("/dashboard");
  const data = await getDashboardPageData(user.id);
  const profileName = data.profile?.full_name?.trim() || user.email || "there";
  const firstName = profileName.split(/\s+/).filter(Boolean)[0] || "there";
  const completion = getProfileCompletionPercentage(data.profile);
  const displayName = data.profile?.full_name?.trim() || user.email || "SynSphere user";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", active: true, icon: LayoutGrid },
    { href: "/profile", label: "My Profile", active: false, icon: UserRound },
    { href: "/jobs", label: "Jobs", active: false, icon: BriefcaseBusiness },
    { href: "/applications", label: "Applications", active: false, icon: FileText },
    { href: "/my-courses", label: "My Courses", active: false, icon: BookOpen },
    { href: "/placements", label: "Placements", active: false, icon: Building2 },
    { href: "/notifications", label: "Notifications", active: false, icon: BellRing },
    { href: "/profile", label: "Resume", active: false, icon: FileText },
  ];

  const summaryCards = [
    { label: "Applications", value: data.summary.applications, accent: "bg-[#edf3ec] text-[#176b55]", icon: FileText },
    { label: "Shortlisted", value: data.summary.shortlisted, accent: "bg-[#eff4e3] text-[#3b5a2b]", icon: CheckCircle2 },
    { label: "Courses", value: data.summary.courses, accent: "bg-[#eef2ff] text-[#2c3d8f]", icon: GraduationCap },
    { label: "Notifications", value: data.summary.notifications, accent: "bg-[#fff3e8] text-[#aa5a2c]", icon: BellRing },
  ];

  if (data.error) {
    return (
      <section className="shell py-10 md:py-12">
        <div className="rounded-[28px] border border-[#e5e9e2] bg-white p-8 shadow-[0_20px_60px_rgba(17,31,31,0.08)]">
          <div className="mx-auto max-w-xl rounded-2xl border border-[#f0d8d0] bg-[#fff5f2] p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f7d7c7] text-[#a0422d]">
              <CircleDashed size={24} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold text-[#152b2b]">Unable to load your dashboard right now.</h1>
            <p className="mt-3 text-sm text-[#657474]">We couldn’t load the latest account information. Please try again in a moment.</p>
            <Link href="/dashboard" className="button button-dark mt-6">Retry</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell py-6 md:py-8">
      <div className="overflow-hidden rounded-[28px] border border-[#e5e9e2] bg-white shadow-[0_20px_60px_rgba(17,31,31,0.08)]">
        <div className="flex min-h-[calc(100vh-112px)] flex-col md:flex-row">
          <aside className="w-full border-b border-[#e5e9e2] bg-[#f7f8f3] p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
            <div className="mb-8 flex items-center gap-3">
              <SynSphereLogo className="h-[58px] w-auto max-w-full object-contain" />
            </div>
            <nav className="flex flex-wrap gap-2 md:flex-col" aria-label="Dashboard navigation">
              {navItems.map(({ href, label, active, icon: Icon }) => (
                <Link
                  key={href + label}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[#152b2b] text-white" : "text-[#425252] hover:bg-white hover:text-[#176b55]"}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </Link>
              ))}
              <div className="pt-2 md:pt-4">
                <DashboardLogout className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-3 py-2.5 text-sm font-medium text-[#152b2b] transition hover:border-[#176b55] hover:text-[#176b55]" />
              </div>
            </nav>
          </aside>

          <main className="flex-1 bg-white">
            <header className="border-b border-[#e5e9e2] bg-[#fbfcf8] px-4 py-5 md:px-6 lg:px-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="eyebrow">DASHBOARD</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#152b2b] md:text-4xl">Welcome back, {firstName} 👋</h1>
                  <p className="mt-2 text-sm text-[#657474]">Here&apos;s what&apos;s happening with your SynSphere account.</p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5e9e2] bg-white px-3 py-2 shadow-sm xl:min-w-[260px]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeee7] text-sm font-bold text-[#176b55]">{getInitials(displayName)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#152b2b]">{displayName}</p>
                      <p className="truncate text-[11px] text-[#657474]">{user.email ?? "Verified user"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#657474]">
                    <Sparkles size={16} aria-hidden="true" />
                  </div>
                </div>
              </div>
            </header>

            <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map(({ label, value, accent, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-4">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-xl p-2 ${accent}`}>
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#657474]">Live</span>
                    </div>
                    <div className="mt-5">
                      <p className="text-3xl font-semibold tracking-[-0.05em] text-[#152b2b]">{value}</p>
                      <p className="mt-1 text-sm text-[#657474]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.8fr)]">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">PROFILE COMPLETION</p>
                        <h2 className="mt-2 text-2xl font-semibold text-[#152b2b]">{completion}% complete</h2>
                      </div>
                      <Link href="/profile" className="button button-outline">Complete Profile</Link>
                    </div>
                    <div className="mt-5 overflow-hidden rounded-full bg-[#e7ece5]">
                      <div className="h-2.5 rounded-full bg-[#176b55]" style={{ width: `${completion}%` }} aria-label={`Profile completion: ${completion}%`} />
                    </div>
                    <p className="mt-4 text-sm text-[#657474]">Complete your profile to improve your job application readiness.</p>
                  </section>

                  <section className="rounded-2xl border border-[#e5e9e2] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">RECENT APPLICATIONS</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#152b2b]">Your recent activity</h2>
                      </div>
                      <Link href="/applications" className="text-action">View All Applications <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>

                    {data.recentApplications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9e1d5] bg-[#fafcf8] p-6 text-center">
                        <p className="text-base font-medium text-[#152b2b]">No applications yet.</p>
                        <Link href="/jobs" className="button button-dark mt-4">Browse Jobs</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.recentApplications.map((application) => (
                          <Link href={`/applications/${application.id}`} key={application.id} className="flex flex-col gap-3 rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-4 transition hover:border-[#b8d3c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b55] md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[#152b2b]">{application.jobTitle}</p>
                              <p className="mt-1 text-sm text-[#657474]">{application.companyName}</p>
                              <p className="mt-1 text-xs text-[#657474]">Applied: {formatDate(application.appliedAt)}</p>
                            </div>
                            <div className="md:text-right">
                              <span className="inline-flex rounded-full bg-[#edf3ec] px-2.5 py-1 text-xs font-semibold text-[#176b55]">{application.status}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#e5e9e2] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">LATEST JOBS</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#152b2b]">Recommended opportunities</h2>
                      </div>
                      <Link href="/jobs" className="text-action">View All Jobs <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>

                    {data.recommendedJobs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9e1d5] bg-[#fafcf8] p-6 text-center">
                        <p className="text-base font-medium text-[#152b2b]">No active jobs available right now.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.recommendedJobs.map((job) => (
                          <div key={job.id} className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold text-[#152b2b]">{job.title}</p>
                                <p className="mt-1 text-sm text-[#657474]">{job.companyName}</p>
                              </div>
                              <Link href={`/jobs/${job.id}`} className="button button-outline px-3 py-2 text-xs">View details</Link>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#657474]">
                              <span className="rounded-full bg-[#edf3ec] px-2 py-1">{job.location}</span>
                              <span className="rounded-full bg-[#eef2ff] px-2 py-1">{job.jobType}</span>
                              <span className="rounded-full bg-[#fff3e8] px-2 py-1">{job.experience}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-[#e5e9e2] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">NOTIFICATIONS</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#152b2b]">Latest updates</h2>
                      </div>
                      <Link href="/notifications" className="text-action">View All <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>

                    {data.notifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9e1d5] bg-[#fafcf8] p-6 text-center">
                        <p className="text-base font-medium text-[#152b2b]">You&apos;re all caught up.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.notifications.map((notification) => (
                          <div key={notification.id} className={`rounded-2xl border p-3 ${notification.isRead ? "border-[#e5e9e2] bg-[#fbfcf8]" : "border-[#dfead9] bg-[#f2f9f3]"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#152b2b]">{notification.title}</p>
                                <p className="mt-1 text-xs text-[#657474]">{notification.message}</p>
                              </div>
                              {!notification.isRead ? <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#176b55]" aria-label="Unread notification" /> : null}
                            </div>
                            <p className="mt-2 text-[11px] text-[#657474]">{formatRelativeDate(notification.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#e5e9e2] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow">MY COURSES</p>
                        <h2 className="mt-1 text-xl font-semibold text-[#152b2b]">Your learning</h2>
                      </div>
                      <Link href="/my-courses" className="text-action">View My Courses <ArrowRight size={14} aria-hidden="true" /></Link>
                    </div>

                    {data.courses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#d9e1d5] bg-[#fafcf8] p-6 text-center">
                        <p className="text-base font-medium text-[#152b2b]">You aren&apos;t enrolled in any courses yet.</p>
                        <Link href="/courses" className="button button-dark mt-4">Explore Courses</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.courses.map((course) => (
                          <div key={course.id} className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#152b2b]">{course.title}</p>
                                <p className="mt-1 text-[11px] text-[#657474]">{course.duration ? `${course.duration}` : "Course"}</p>
                              </div>
                              <span className="inline-flex rounded-full bg-[#eaf3ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2c3d8f]">{course.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5">
                    <p className="eyebrow">QUICK ACTIONS</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Link href="/jobs" className="flex items-center justify-between rounded-xl border border-[#e5e9e2] bg-white px-3 py-3 text-sm font-medium text-[#152b2b] hover:border-[#176b55] hover:text-[#176b55]">
                        Browse Jobs <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <Link href="/profile" className="flex items-center justify-between rounded-xl border border-[#e5e9e2] bg-white px-3 py-3 text-sm font-medium text-[#152b2b] hover:border-[#176b55] hover:text-[#176b55]">
                        Update Profile <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <Link href="/profile" className="flex items-center justify-between rounded-xl border border-[#e5e9e2] bg-white px-3 py-3 text-sm font-medium text-[#152b2b] hover:border-[#176b55] hover:text-[#176b55]">
                        Upload Resume <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                      <Link href="/applications" className="flex items-center justify-between rounded-xl border border-[#e5e9e2] bg-white px-3 py-3 text-sm font-medium text-[#152b2b] hover:border-[#176b55] hover:text-[#176b55]">
                        My Applications <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}