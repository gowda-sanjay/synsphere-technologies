import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Award, BookOpenCheck, BriefcaseBusiness, Code2, Database, Goal, Network, Shield, Sparkles } from "lucide-react";
import { CTASection, PageHero, SectionHeading } from "@/components/public/public-components";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { getPublishedCourses } from "@/lib/services/courses";

export const metadata: Metadata = {
  title: "SynKode — Technology Training & Career Development",
  description: "Explore practical technology training, project-led learning, and career development with SynKode.",
};

const categoryDetails = [
  { name: "Data Analytics", icon: Database, text: "Find the story in data with spreadsheets, SQL, and dashboards." },
  { name: "Data Science", icon: Goal, text: "Explore data, build models, and explain what they can tell us." },
  { name: "AI & Machine Learning", icon: Sparkles, text: "Understand modern AI and create useful, responsible applications." },
  { name: "Full Stack Development", icon: Code2, text: "Build complete digital products across the browser and server." },
  { name: "Programming", icon: BookOpenCheck, text: "Strengthen your problem-solving foundations through code." },
  { name: "Web Development", icon: Network, text: "Create responsive, accessible experiences for the web." },
  { name: "Cloud Computing", icon: BriefcaseBusiness, text: "Learn the systems that help digital products run reliably." },
  { name: "Cybersecurity", icon: Shield, text: "Build security awareness and practical defensive skills." },
];

const processSteps = [
  { number: "01", title: "Learn the foundations", text: "Build concepts step by step with a clear structure and mentor guidance." },
  { number: "02", title: "Practice with purpose", text: "Use exercises and labs to turn new ideas into repeatable skills." },
  { number: "03", title: "Make real projects", text: "Create portfolio-ready work and learn to explain the decisions behind it." },
  { number: "04", title: "Prepare for what’s next", text: "Get career guidance, interview practice, and placement support as you explore roles." },
];

export default async function SynKodePage() {
  const courseResult = await getPublishedCourses();

  return (
    <>
      <PageHero
        eyebrow="SYNKODE · LEARN WITH PURPOSE"
        title={<>Learn. Build.<br /><span>Get Job-Ready.</span></>}
        description="SynKode is the technology training and education division of SynSphere Technologies. Learn practical skills, build a body of work, and get support as you plan your next career step."
        primaryHref="/courses"
        primaryLabel="Explore courses"
        secondaryHref="/signup"
        secondaryLabel="Join SynKode"
        imageUrl="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85"
        imageAlt="Learners collaborating on a project"
        note="Learning and placement support are guidance, not a guarantee of employment."
      />

      <section className="content-section shell">
        <SectionHeading eyebrow="LEARNING PATHWAYS" title={<>Choose a direction.<br /><span>Keep building.</span></>} description="Explore learning areas shaped around practical technology skills and current ways of working." />
        <div className="category-grid">{categoryDetails.map(({ name, icon: Icon, text }, index) => <Link className="category-card" href="/courses" key={name}><span className="category-top"><span className="category-icon"><Icon size={19} aria-hidden="true" /></span><span className="category-number">0{index + 1}</span></span><h3>{name}</h3><p>{text}</p><span className="category-link">Explore courses <ArrowUpRight size={14} aria-hidden="true" /></span></Link>)}</div>
        <p className="catalog-footnote">Sample pathways shown. Course availability, curriculum, and fees are subject to confirmation.</p>
      </section>

      <section className="learning-process-band">
        <div className="shell">
          <SectionHeading eyebrow="HOW LEARNING WORKS" title={<>From first concept to<br /><span>confident next step.</span></>} description="Learning is designed to be active, supported, and connected to the work you want to do." />
          <div className="process-grid">{processSteps.map((step) => <article className="process-step" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
        </div>
      </section>

      <section className="content-section shell synkode-support">
        <div className="support-visual" role="img" aria-label="A learner working on a laptop"><span>LEARNING, MADE PRACTICAL</span></div>
        <div className="support-copy"><span className="eyebrow">MORE THAN A COURSE</span><h2>Build a portfolio. Build confidence.</h2><p>SynKode learning combines guided lessons with practical projects and room to ask questions. Career support can include portfolio feedback, interview preparation, and help exploring relevant opportunities.</p><div className="support-list"><span><BookOpenCheck size={17} aria-hidden="true" />Project-led learning</span><span><BriefcaseBusiness size={17} aria-hidden="true" />Career and placement support</span><span><Award size={17} aria-hidden="true" />Course completion recognition</span></div><p className="catalog-footnote">Certificates and placement support do not represent a guarantee of employment or a specific outcome.</p></div>
      </section>

      <DataSourceNotice source={courseResult.source} error={courseResult.error} />
      <section className="content-section shell synkode-featured">
        <div className="featured-heading"><SectionHeading eyebrow="A PLACE TO START" title={<>Explore a learning path<br /><span>that fits your goals.</span></>} description={courseResult.source === "demo" ? "Browse the sample course catalogue and compare focus areas, levels, and durations." : "Compare published course topics, levels, and durations."} /><Link className="text-action" href="/courses">See all courses <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        {courseResult.error ? <div className="empty-state"><p>Courses aren’t available right now. Please try again later.</p></div> : courseResult.data.length ? <div className="featured-course-list">{courseResult.data.slice(0, 3).map((course) => <Link className="featured-course-row" href={`/courses/${course.id}`} key={course.id}><span className="featured-course-category">{course.category}</span><strong>{course.title}</strong><span>{course.duration}</span><ArrowUpRight size={16} aria-hidden="true" /></Link>)}</div> : <div className="empty-state"><p>No courses are published yet. Please check back soon.</p></div>}
      </section>

      <CTASection eyebrow="YOUR NEXT CHAPTER" title="Start with the skills you want to use." description="Explore a pathway, ask a question, and find out whether SynKode learning is the right fit." href="/courses" label="Explore courses" />
    </>
  );
}