import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPlacementDetailView } from "@/components/admin/admin-placement-detail-view";
import { getAdminPlacement, getAdminPlacementOptions } from "@/lib/services/admin-placements";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Placement Details — SynSphere",
  robots: { index: false, follow: false },
};

export default async function AdminPlacementDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const edit = (Array.isArray(query.edit) ? query.edit[0] : query.edit) === "1";
  const [result, optionsResult] = await Promise.all([
    getAdminPlacement(id),
    getAdminPlacementOptions(),
  ]);
  if (!result.placement && !result.error) notFound();

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/admin/placements" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#176b55] hover:underline"><ArrowLeft size={14} aria-hidden="true" />All placements</Link>
      {result.error || !result.placement ? (
        <div role="alert" className="border border-[#efc9bd] bg-[#fff5f2] p-5 text-sm text-[#913c30]">{result.error ?? "Unable to load placement."}</div>
      ) : (
        <AdminPlacementDetailView
          placement={result.placement}
          options={optionsResult.options}
          optionsError={optionsResult.error}
          initialEdit={edit}
        />
      )}
    </div>
  );
}
