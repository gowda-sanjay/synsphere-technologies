import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getMyApplication } from "@/lib/services/applications";

type ApplicationDetailPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Application Details — SynSphere", robots: { index: false, follow: false } };

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  await requireCurrentUser(`/applications/${id}`);
  const result = await getMyApplication(id);
  if (!result.data && !result.error) notFound();

  return (
    <section className="shell py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <Link className="back-link" href="/applications"><ArrowLeft size={15} aria-hidden="true" />My applications</Link>
        {result.error || !result.data ? (
          <div className="mt-6 rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-5 text-sm text-[#9a3f2f]" role="status">{result.error ?? "This application is unavailable."}</div>
        ) : (
          <article className="mt-6 rounded-2xl border border-[#e5e9e2] bg-white p-5 shadow-sm sm:p-8">
            <p className="eyebrow">APPLICATION DETAILS</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#152b2b]">{result.data.jobTitle}</h1>
            <p className="mt-2 text-lg text-[#425252]">{result.data.companyName}</p>
            {result.data.location ? <p className="mt-2 flex items-center gap-2 text-sm text-[#657474]"><MapPin size={15} aria-hidden="true" />{result.data.location}</p> : null}
            <dl className="mt-8 grid gap-5 border-t border-[#e5e9e2] pt-6 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-[#657474]">Applied</dt><dd className="mt-1 text-sm text-[#152b2b]">{new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(result.data.created_at))}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-[#657474]">Status</dt><dd className="mt-1"><span className="inline-flex rounded-full bg-[#edf3ec] px-3 py-1.5 text-xs font-semibold capitalize text-[#176b55]">{result.data.status.replaceAll("_", " ")}</span></dd></div>
            </dl>
          </article>
        )}
      </div>
    </section>
  );
}