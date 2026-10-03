import type { Metadata } from "next";
import { AdminCompanyManager } from "@/components/admin/admin-company-manager";
import { ADMIN_COMPANY_PAGE_SIZE, getAdminCompanies } from "@/lib/services/admin-companies";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const metadata: Metadata = { title: "Company Management — SynSphere", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = (first(params.q) ?? "").slice(0, 100);
  const status = ["active", "inactive"].includes(first(params.status) ?? "") ? first(params.status) as string : "";
  const requestedPage = Number.parseInt(first(params.page) ?? "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const result = await getAdminCompanies({ search, status, page });

  return <AdminCompanyManager initialCompanies={result.companies} total={result.total} page={result.page} pageSize={ADMIN_COMPANY_PAGE_SIZE} search={search} status={status} loadError={result.error} />;
}