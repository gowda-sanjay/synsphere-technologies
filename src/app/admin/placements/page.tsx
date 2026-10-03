import type { Metadata } from "next";
import { AdminPlacementManager } from "@/components/admin/admin-placement-manager";
import {
  ADMIN_PLACEMENT_PAGE_SIZE,
  getAdminPlacement,
  getAdminPlacements,
} from "@/lib/services/admin-placements";

export const metadata: Metadata = {
  title: "Placement Management — SynSphere",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminPlacementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    search: first(params.q).slice(0, 100),
    company: first(params.company),
    course: first(params.course),
    status: first(params.status),
    yearFrom: first(params.yearFrom),
    yearTo: first(params.yearTo),
  };
  const requestedPage = Number.parseInt(first(params.page) || "0", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const editId = first(params.edit);

  const [data, editResult] = await Promise.all([
    getAdminPlacements({ ...filters, page }),
    editId ? getAdminPlacement(editId) : Promise.resolve(null),
  ]);

  return (
    <AdminPlacementManager
      data={data}
      filters={filters}
      pageSize={ADMIN_PLACEMENT_PAGE_SIZE}
      editPlacement={editResult?.placement ?? null}
      editError={editId ? editResult?.error ?? (editResult?.placement ? null : "The requested placement could not be found.") : null}
    />
  );
}
