import type { Metadata } from "next";
import { BriefcaseBusiness, Compass, GraduationCap } from "lucide-react";
import { CompanyCard } from "@/components/public/company-card";
import { CTASection, PageHero, SectionHeading } from "@/components/public/public-components";
import { PlacementCard } from "@/components/public/placement-card";
import { DataSourceNotice } from "@/components/public/data-source-notice";
import { getPublicCompanies } from "@/lib/services/companies";
import { getPublicPlacements } from "@/lib/services/placements";

export const metadata: Metadata = {
  title: "Placements — SynSphere & SynKode",
  description: "Explore placement stories published by SynSphere and learn about the placement support available through SynSphere and SynKode.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

const journey = [
  { icon: GraduationCap, number: "01", title: "Build your skills", text: "Develop a focused foundation through guided learning and practical projects." },
  { icon: Compass, number: "02", title: "Get ready to show your work", text: "Refine your portfolio, CV, and interview approach with thoughtful feedback." },
  { icon: BriefcaseBusiness, number: "03", title: "Explore opportunities", text: "Discover roles that align with your skills and career direction." },
];

export default async function PlacementsPage() {
  const [placementResult, companyResult] = await Promise.all([getPublicPlacements(), getPublicCompanies()]);

  return (
    <>
      <PageHero
        eyebrow="CAREER DEVELOPMENT"
        title={<>Your skills can take<br /><span>you somewhere new.</span></>}
        description="SynSphere and SynKode support learners as they build skills, prepare to talk about their work, and explore career opportunities."
        primaryHref="/synkode"
        primaryLabel="Explore learning paths"
        secondaryHref="/jobs"
        secondaryLabel="Browse roles"
        imageUrl="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85"
        imageAlt="Professionals sharing ideas in a team discussion"
        note="Career and placement support is guidance, not a guarantee of employment."
      />

      <DataSourceNotice source={placementResult.source} error={placementResult.error} />

      <section className="content-section shell">
        <div className="featured-heading"><SectionHeading eyebrow="PLACEMENT STORIES" title={<>Every next step has<br /><span>its own story.</span></>} description="Explore placement stories approved for public display by SynSphere." /></div>
        {placementResult.error ? <div className="empty-state"><p>Placement stories aren’t available right now. Please try again later.</p></div> : placementResult.data.length ? <div className="placement-grid">{placementResult.data.map((story) => <PlacementCard key={story.id} story={story} />)}</div> : <div className="empty-state"><p>No placements to display yet.</p><p>Placement success stories will appear here once they are published.</p></div>}
      </section>

      {companyResult.source === "supabase" ? <section className="company-band"><div className="shell"><div className="featured-heading"><SectionHeading eyebrow="COMPANIES" title={<>Teams and work<br /><span>settings to explore.</span></>} description="Explore organizations with current public company information." /></div>{companyResult.error ? <div className="empty-state"><p>Company information isn’t available right now. Please try again later.</p></div> : companyResult.data.length ? <div className="company-grid">{companyResult.data.slice(0, 4).map((company) => <CompanyCard company={company} key={company.id} />)}</div> : <div className="empty-state"><p>No companies are published yet.</p></div>}</div></section> : null}

      <section className="content-section shell placement-journey-section">
        <SectionHeading eyebrow="A PRACTICAL CAREER JOURNEY" title={<>Progress, with support<br /><span>at every stage.</span></>} description="Career preparation works best as a series of focused steps, shaped around your goals." />
        <div className="journey-grid">{journey.map(({ icon: Icon, number, title, text }) => <article className="journey-card" key={number}><span className="journey-number">{number}</span><span className="journey-icon"><Icon size={19} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        <p className="placement-caveat">Outcomes depend on individual experience, effort, and market conditions. SynSphere and SynKode do not guarantee a role or salary.</p>
      </section>

      <CTASection eyebrow="TAKE A NEXT STEP" title="Ready to explore your options?" description="Start with a learning path, look through sample roles, or talk with the team about your goals." href="/contact" label="Talk to SynSphere" />
    </>
  );
}