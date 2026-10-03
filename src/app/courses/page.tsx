import type { Metadata } from "next";
import { CourseExplorer } from "@/components/public/course-explorer";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { PageHero } from "@/components/public/public-components";
import { getPublishedCourses } from "@/lib/services/courses";

export const metadata: Metadata = {
  title: "Technology Courses — SynKode",
  description: "Browse technology learning pathways in analytics, software development, AI, cloud, and cybersecurity.",
};

export default async function CoursesPage() {
  const result = await getPublishedCourses();
  const categories = ["All categories", ...new Set(result.data.map((course) => course.category))];

  return (
    <>
      <PageHero
        eyebrow="SYNKODE COURSE CATALOGUE"
        title={<>Skills for the work<br /><span>you want to do.</span></>}
        description="Explore practical learning pathways across technology. Compare topics, levels, and durations to find a place to begin."
        primaryHref="/synkode"
        primaryLabel="How SynKode works"
        note={result.source === "demo" ? "Sample course information and fees for preview only." : undefined}
      />
      <DataSourceNotice source={result.source} error={result.error} />
      <CourseExplorer courses={result.data} categories={categories} source={result.source} error={result.error} />
      {result.source === "demo" ? <div className="catalog-bottom-note shell">Course content and pricing are illustrative examples and must be confirmed before enrollment.</div> : null}
    </>
  );
}