"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { submitApplication } from "@/app/actions/applications";

type Review = {
  existingApplicationId: string | null;
  fullName: string;
  email: string;
  mobile: string | null;
  resumePath: string | null;
  resumeFileName: string | null;
};

type SubmitResult = Awaited<ReturnType<typeof submitApplication>>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(value));
}

export function ApplyPanel({
  jobId,
  jobTitle,
  companyName,
  isAuthenticated,
  review,
  source,
  reviewError,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  isAuthenticated: boolean;
  review: Review | null;
  source: "supabase" | "demo";
  reviewError: string | null;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const canSubmit = Boolean(review?.fullName.trim() && review.email.trim() && review.resumePath && review.resumeFileName);
  const loginHref = `/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`;

  async function handleSubmit() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      setResult(await submitApplication(jobId));
    } catch {
      setResult({ kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.kind === "success") {
    return (
      <section className="rounded-2xl border border-[#cfe4d6] bg-[#f2f9f3] p-5" aria-live="polite">
        <p className="eyebrow">APPLICATION RECEIVED</p>
        <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">Application submitted successfully!</h2>
        <dl className="mt-4 space-y-2 text-sm text-[#425252]">
          <div><dt className="font-semibold">Job</dt><dd>{jobTitle}</dd></div>
          <div><dt className="font-semibold">Company</dt><dd>{companyName}</dd></div>
          <div><dt className="font-semibold">Application date</dt><dd>{formatDate(result.application.created_at)}</dd></div>
          <div><dt className="font-semibold">Status</dt><dd className="capitalize">{result.application.status.replaceAll("_", " ")}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="button button-dark" href="/applications">View My Applications</Link>
          <Link className="button button-outline" href={`/applications/${result.application.id}`}>Application details</Link>
          <Link className="button button-outline" href="/jobs">Back to jobs</Link>
        </div>
      </section>
    );
  }

  const duplicateId = result?.kind === "duplicate" ? result.applicationId : review?.existingApplicationId;
  if (duplicateId || result?.kind === "duplicate") {
    return (
      <section className="rounded-2xl border border-[#e5e9e2] bg-[#fbfcf8] p-5" aria-live="polite">
        <p className="eyebrow">APPLICATION STATUS</p>
        <h2 className="mt-2 text-xl font-semibold text-[#152b2b]">You have already applied for this job.</h2>
        {duplicateId ? <Link className="button button-dark mt-5" href={`/applications/${duplicateId}`}>View application <ArrowRight size={15} aria-hidden="true" /></Link> : <p className="mt-3 text-sm text-[#657474]">Your application is recorded. It may take a moment to become available here.</p>}
      </section>
    );
  }

  if (source === "demo") {
    return <p className="rounded-xl border border-[#e5e9e2] bg-white p-4 text-sm text-[#657474]">Applications are unavailable for sample listings.</p>;
  }

  if (!isAuthenticated) {
    return <Link className="button button-green w-full justify-center" href={loginHref}>Login to Apply <ArrowRight size={15} aria-hidden="true" /></Link>;
  }

  if (reviewError) {
    if (reviewError === "Complete your profile before applying.") {
      return <div className="rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-4"><p className="text-sm font-semibold text-[#9a3f2f]">Complete your profile before applying.</p><Link href="/profile" className="button button-outline mt-4">Complete profile</Link></div>;
    }
    return <div className="rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-4 text-sm text-[#9a3f2f]">{reviewError}</div>;
  }

  if (!review?.fullName.trim() || !review.email.trim()) {
    return (
      <div className="rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-4">
        <p className="text-sm font-semibold text-[#9a3f2f]">Complete your profile before applying.</p>
        <Link href="/profile" className="button button-outline mt-4">Complete profile</Link>
      </div>
    );
  }

  if (!review.resumePath || !review.resumeFileName) {
    return (
      <div className="rounded-xl border border-[#f0d8d0] bg-[#fff5f2] p-4">
        <p className="text-sm font-semibold text-[#9a3f2f]">Please upload your resume before applying.</p>
        <Link href="/profile" className="button button-outline mt-4">Upload Resume</Link>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="button button-green w-full justify-center" onClick={() => { setResult(null); setReviewOpen((open) => !open); }} aria-expanded={reviewOpen}>
        {reviewOpen ? "Close application review" : "Apply Now"}
      </button>
      {reviewOpen ? (
        <section className="mt-4 rounded-xl border border-[#dfe7dd] bg-white p-4" aria-label="Review your application">
          <p className="eyebrow">REVIEW APPLICATION</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="font-semibold text-[#152b2b]">Candidate</dt><dd className="mt-0.5 text-[#657474]">{review.fullName}</dd></div>
            <div><dt className="font-semibold text-[#152b2b]">Email</dt><dd className="mt-0.5 break-words text-[#657474]">{review.email}</dd></div>
            {review.mobile ? <div><dt className="font-semibold text-[#152b2b]">Mobile</dt><dd className="mt-0.5 text-[#657474]">{review.mobile}</dd></div> : null}
            <div><dt className="font-semibold text-[#152b2b]">Resume</dt><dd className="mt-0.5 break-words text-[#657474]">{review.resumeFileName}</dd></div>
            <div><dt className="font-semibold text-[#152b2b]">Job</dt><dd className="mt-0.5 text-[#657474]">{jobTitle}</dd></div>
            <div><dt className="font-semibold text-[#152b2b]">Company</dt><dd className="mt-0.5 text-[#657474]">{companyName}</dd></div>
          </dl>
          {result?.kind === "profile-incomplete" ? <p role="alert" className="mt-4 text-sm text-[#9a3f2f]">Complete your profile before applying.</p> : null}
          {result?.kind === "resume-missing" ? <p role="alert" className="mt-4 text-sm text-[#9a3f2f]">Please upload your resume before applying.</p> : null}
          {result?.kind === "job-unavailable" ? <p role="alert" className="mt-4 text-sm text-[#9a3f2f]">This job is no longer accepting applications.</p> : null}
          {result?.kind === "unauthenticated" ? <p role="alert" className="mt-4 text-sm text-[#9a3f2f]">Your session expired. Please sign in again.</p> : null}
          {result?.kind === "error" ? <p role="alert" className="mt-4 text-sm text-[#9a3f2f]">Unable to submit your application. Please try again.</p> : null}
          <button type="button" className="button button-dark mt-5 w-full justify-center" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />Submitting...</> : "Confirm and submit"}
          </button>
        </section>
      ) : null}
    </div>
  );
}