import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  note?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  imageUrl,
  imageAlt,
  note,
}: PageHeroProps) {
  return (
    <section className={`public-hero${imageUrl ? " has-image" : ""}`}>
      <div className="shell public-hero-grid">
        <div className="public-hero-copy">
          <span className="eyebrow"><i className="eyebrow-dot" />{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {(primaryHref && primaryLabel) || (secondaryHref && secondaryLabel) ? (
            <div className="public-hero-actions">
              {primaryHref && primaryLabel ? (
                <Link className="button button-green" href={primaryHref}>{primaryLabel}<ArrowRight size={16} aria-hidden="true" /></Link>
              ) : null}
              {secondaryHref && secondaryLabel ? (
                <Link className="button button-outline" href={secondaryHref}>{secondaryLabel}<ArrowUpRight size={15} aria-hidden="true" /></Link>
              ) : null}
            </div>
          ) : null}
          {note ? <span className="public-hero-note">{note}</span> : null}
        </div>
        {imageUrl ? (
          <div className="public-hero-art" role="img" aria-label={imageAlt ?? ""} style={{ backgroundImage: `linear-gradient(180deg, rgba(18, 43, 38, .02) 30%, rgba(18, 43, 38, .6) 100%), url("${imageUrl}")` }}>
            <span className="public-hero-art-label">{imageAlt}</span>
          </div>
        ) : (
          <div className="public-hero-mark" aria-hidden="true"><span>SS</span><i /><i /><i /></div>
        )}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function CTASection({
  eyebrow = "YOUR NEXT STEP",
  title,
  description,
  href,
  label,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <section className="shell public-cta">
      <div className="public-cta-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Link className="button" href={href}>{label}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </section>
  );
}