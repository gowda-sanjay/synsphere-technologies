import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Clock3 } from "lucide-react";
import { CTASection, PageHero } from "@/components/public/public-components";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { courses } from "@/lib/mock/courses";
import { getPublicCourse } from "@/lib/services/courses";

type CourseDetailPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: course } = await getPublicCourse(id);
  return course ? { title: `${course.title} — SynKode`, description: course.description } : { title: "Course not found — SynKode" };
}

export function generateStaticParams() {
  return courses.filter((course) => course.status === "published").map((course) => ({ id: course.id }));
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const result = await getPublicCourse(id);
  if (result.error) {
    return <><PageHero eyebrow="SYNKODE COURSES" title={<>Course details<br /><span>are unavailable.</span></>} description="We couldn’t load this course right now. Please try again later." primaryHref="/courses" primaryLabel="Back to courses" /><DataSourceNotice source={result.source} error={result.error} /></>;
  }
  const course = result.data;
  if (!course) notFound();

  return (
    <>
      <section className="detail-hero">
        <div className="shell detail-hero-grid">
          <div className="detail-hero-copy"><Link className="back-link" href="/courses"><ArrowLeft size={15} aria-hidden="true" />All courses</Link><span className="eyebrow">SYNKODE · {course.category.toUpperCase()}</span><h1>{course.title}</h1><p>{course.description}</p><div className="detail-meta"><span><Clock3 size={15} aria-hidden="true" />{course.duration}</span><span>{course.level}</span><span>{course.skills.length} focus skills</span></div><Link className="button button-green" href="/contact?subject=course">Ask about this course <ArrowUpRight size={15} aria-hidden="true" /></Link><span className="detail-demo-note">{result.source === "demo" ? "Sample course · " : "Indicative fee "}₹{course.price.toLocaleString("en-IN")}</span></div>
          <div className="detail-hero-image" role="img" aria-label={`${course.category} learning`} style={{ backgroundImage: course.imageUrl ? `linear-gradient(180deg, rgba(21, 43, 43, .02), rgba(21, 43, 43, .42)), url("${course.imageUrl}")` : "linear-gradient(135deg, #dcebdc, #e4e8f4)" }} />
        </div>
      </section>
      <section className="shell detail-content-grid">
        <div><span className="eyebrow">WHAT YOU’LL EXPLORE</span><h2>A practical path from concepts to projects.</h2><p className="detail-body-copy">{result.source === "demo" ? "This sample pathway combines core concepts, guided practice, and a project you can use to demonstrate your learning." : "Explore the curriculum topics and requirements for this published course."}</p><div className="curriculum-list">{course.curriculum.map((item, index) => <article className="curriculum-row" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><Check size={16} aria-hidden="true" /></article>)}</div></div>
        <aside className="course-detail-aside"><span className="eyebrow">COURSE SNAPSHOT</span><h3>{course.title}</h3><dl><div><dt>Duration</dt><dd>{course.duration}</dd></div><div><dt>Level</dt><dd>{course.level}</dd></div><div><dt>Category</dt><dd>{course.category}</dd></div></dl><div className="detail-skill-list">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><h4>Helpful before you begin</h4><ul>{course.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul><Link className="button button-green" href="/contact?subject=course">Ask about this course <ArrowUpRight size={15} aria-hidden="true" /></Link><p className="catalog-footnote">This is a preview. No enrollment or payment is processed.</p></aside>
      </section>
      <CTASection title="Have a question about this pathway?" description="Talk with SynKode about course scope, timing, and whether it matches your goals." href="/contact?subject=course" label="Contact SynKode" />
    </>
  );
}