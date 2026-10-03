import { notFound } from "next/navigation";

const adminSections: Record<string, string> = {
  users: "Users",
  companies: "Companies",
  jobs: "Jobs",
  applications: "Applications",
  courses: "Courses",
  enrollments: "Enrollments",
  placements: "Placements",
  notifications: "Notifications",
  documents: "Documents",
  reports: "Reports",
  settings: "Settings",
};

export default async function AdminComingSoonPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = adminSections[section];
  if (!title) notFound();

  return (
    <section className="mx-auto max-w-3xl border border-[#e1e7e1] bg-white p-5 sm:p-8">
      <p className="text-[10px] font-bold tracking-[0.15em] text-[#176b55]">ADMIN WORKSPACE</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-[#152b2b]">{title}</h1>
      <p className="mt-3 text-sm text-[#657474]">Coming in the next admin phase.</p>
    </section>
  );
}