import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

const strengths = [
  {
    number: "01",
    title: "A clearer path to work",
    description: "Find opportunities that fit your skills, goals, and the direction you want your career to take.",
  },
  {
    number: "02",
    title: "Skills that move with you",
    description: "Build practical, in-demand technology skills with guided learning through SynKode.",
  },
  {
    number: "03",
    title: "Progress, with people",
    description: "Stay connected to a team that supports your next step, from first lesson to first offer.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid shell">
          <div className="hero-copy">
            <span className="eyebrow"><i className="eyebrow-dot" /> CAREERS, CONNECTED</span>
            <h1>Build Your Career.<br />Discover <span>Opportunities.</span><br />Get Placed.</h1>
            <p className="hero-lede">
              SynSphere and SynKode bring career opportunities and practical tech learning together, so your next move feels within reach.
            </p>
            <div className="hero-actions">
              <Link className="button button-green" href="/jobs">Find a job <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link className="button button-outline" href="/synkode">Explore SynKode <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars" aria-hidden="true"><span /><span /><span /><span /></div>
              <div className="proof-copy"><strong>Made for your next chapter</strong><br />Learning, opportunity, and support in one place</div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image" role="img" aria-label="Professionals collaborating around a table">
              <div className="image-caption"><span>Learn. Build. Belong.</span><strong>Your next chapter starts here.</strong></div>
            </div>
            <div className="floating-note">
              <span className="note-icon"><Sparkles size={16} aria-hidden="true" /></span>
              <span><strong>Skills meet opportunity</strong><small>A more connected career journey</small></span>
            </div>
            <span className="hero-index">01 / 04 &nbsp; THE JOURNEY</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Platform focus areas">
        <div className="trust-inner shell">
          <span className="trust-label">ONE PLATFORM.<br />MORE WAYS FORWARD.</span>
          <div className="trust-names"><span>Technology</span><span>Talent</span><span>Training</span><span>Opportunity</span></div>
        </div>
      </section>

      <section className="intro-section shell">
        <div className="intro-heading">
          <div><span className="eyebrow">THE SYNPSHERE DIFFERENCE</span><h2>Good careers don&apos;t happen <span>by accident.</span></h2></div>
          <p>Whether you&apos;re starting out or ready for a change, we connect the learning, people, and opportunities that help you move with purpose.</p>
        </div>
        <div className="feature-grid">
          {strengths.map((strength) => (
            <article className="feature-item" key={strength.number}>
              <span className="feature-number">{strength.number}</span>
              <h3>{strength.title}</h3>
              <p>{strength.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bottom-cta shell">
        <div><span className="eyebrow">YOUR NEXT STEP STARTS HERE</span><h2>Bring your ambition.<br />We&apos;ll help with the rest.</h2></div>
        <Link className="button" href="/signup">Create your account <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </section>
    </>
  );
}