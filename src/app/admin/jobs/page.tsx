import type { Metadata } from "next";
import { AdminJobManager } from "@/components/admin/admin-job-manager";
import { getAdminJobsData } from "@/lib/services/admin-jobs";

export const metadata: Metadata = { title: "Job Management — SynSphere", robots: { index: false, follow: false } };

export default async function AdminJobsPage() {
  const data = await getAdminJobsData();
  return <AdminJobManager initialJobs={data.jobs} companies={data.companies} total={data.total} loadError={data.error} />;
}