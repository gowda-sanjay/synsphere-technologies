import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Compass, HeartHandshake, Lightbulb, ShieldCheck, Sparkles, Target, UsersRound } from "lucide-react";
import { CTASection, PageHero, SectionHeading } from "@/components/public/public-components";

export const metadata: Metadata = {
  title: "About SynSphere Technologies",
  description: "Meet SynSphere Technologies and learn how SynKode connects technology learning with career development.",
};

const services = [
  { icon: Compass, title: "Career pathways", text: "Explore roles and next steps with practical guidance for a changing technology landscape." },
  { icon: Lightbulb, title: "Technology solutions", text: "Bring thoughtful engineering and digital problem-solving to real business needs." },
  { icon: UsersRound, title: "Talent connections", text: "Help learners and employers find clearer, more useful ways to meet." },
];

const values = [
  { icon: ShieldCheck, title: "Trust", text: "We communicate clearly, protect people’s information, and do what we say." },
  { icon: Sparkles, title: "Curiosity", text: "We keep learning and make room for better ideas and new perspectives." },
  { icon: HeartHandshake, title: "People first", text: "We build around the needs, time, and ambitions of real people." },
  { icon: Target, title: "Purposeful progress", text: "We value steady, measurable progress over shortcuts and empty promises." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT SYNSPHERE"
        title={<>Technology with<br /><span>people in mind.</span></>}
        description="SynSphere Technologies brings technology, talent, and practical learning together to help people and organizations move forward."
        primaryHref="/contact"
        primaryLabel="Talk to our team"
        secondaryHref="/synkode"
        secondaryLabel="Discover SynKode"
        imageUrl="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85"
        imageAlt="A team working together around a table"
      />

      <section className="content-section shell about-intro">
        <div className="about-intro-label"><span className="eyebrow">WHO WE ARE</span><span className="about-index">01 — 04</span></div>
        <div className="about-intro-copy"><h2>SynSphere Technologies Pvt. Ltd.</h2><p>We are a technology and career-development company focused on making the path from learning to meaningful work easier to navigate. We connect people with useful skills, thoughtful technology, and opportunities to grow.</p><p><strong>SynKode is our training and education division.</strong> It offers structured, project-led learning designed to build confidence and job-ready skills. SynSphere is the company; SynKode is the learning experience within it.</p></div>
      </section>

      <section className="about-purpose-band">
        <div className="shell purpose-grid">
          <article className="purpose-card"><span className="purpose-icon"><Target size={19} aria-hidden="true" /></span><span className="eyebrow">OUR MISSION</span><h2>Make meaningful progress easier to reach.</h2><p>Connect practical technology learning, career support, and opportunity in ways that help people take confident next steps.</p></article>
          <article className="purpose-card purpose-card-light"><span className="purpose-icon"><Compass size={19} aria-hidden="true" /></span><span className="eyebrow">OUR VISION</span><h2>A more human route into technology.</h2><p>Build a future where access to learning and work is clearer, more inclusive, and grounded in skills people can use.</p></article>
        </div>
      </section>

      <section className="content-section shell">
        <SectionHeading eyebrow="WHAT WE DO" title={<>Build skills. Create solutions.<br /><span>Open possibilities.</span></>} description="Our work brings together the practical pieces of technology and career growth." />
        <div className="service-grid">{services.map(({ icon: Icon, title, text }, index) => <article className="service-card" key={title}><span className="service-index">0{index + 1}</span><span className="service-icon"><Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="about-tech-band">
        <div className="shell about-tech-grid">
          <div className="about-tech-visual" role="img" aria-label="Abstract network of connected technology points"><span className="tech-orbit tech-orbit-one" /><span className="tech-orbit tech-orbit-two" /><span className="tech-core">S</span><i /><i /><i /><i /></div>
          <div className="about-tech-copy"><span className="eyebrow">TECHNOLOGY & INNOVATION</span><h2>Useful technology starts with useful questions.</h2><p>We approach technology as a way to solve real problems, not a goal in itself. Our teams value clear thinking, accessible experiences, and thoughtful use of emerging tools.</p><ul><li>Human-centered digital experiences</li><li>Responsible, practical use of AI</li><li>Reliable software and data foundations</li></ul></div>
        </div>
      </section>

      <section className="content-section shell about-divisions">
        <SectionHeading eyebrow="ONE COMPANY, DISTINCT ROLES" title={<>SynSphere connects the work.<br /><span>SynKode builds the skills.</span></>} description="Together, we support a more connected career journey without losing sight of what each team does best." />
        <div className="division-grid">
          <article className="division-card division-corporate"><span className="division-overline">THE COMPANY</span><h3>SynSphere Technologies</h3><p>Technology, talent connections, and career development focused on creating better ways forward.</p><Link href="/jobs">Explore opportunities <ArrowUpRight size={15} aria-hidden="true" /></Link></article>
          <article className="division-card division-learning"><span className="division-overline">THE TRAINING DIVISION</span><h3>SynKode</h3><p>Structured technology education, practical projects, career guidance, and learning support.</p><Link href="/synkode">Explore SynKode <ArrowUpRight size={15} aria-hidden="true" /></Link></article>
        </div>
      </section>

      <section className="content-section shell values-section">
        <SectionHeading eyebrow="HOW WE WORK" title={<>Principles that keep us<br /><span>moving well.</span></>} />
        <div className="values-grid">{values.map(({ icon: Icon, title, text }) => <article className="value-item" key={title}><span className="value-icon"><Icon size={18} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <CTASection title="Let’s make your next step clearer." description="Whether you’re exploring a career or looking for a technology partner, we’d be glad to hear from you." href="/contact" label="Get in touch" />
    </>
  );
}