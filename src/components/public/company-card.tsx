import type { Company } from "@/lib/types/public";

export function CompanyCard({ company }: { company: Company }) {
  return (
    <article className="company-card">
      <span className="company-mark" style={{ backgroundColor: company.accent }} aria-hidden="true">{company.initials}</span>
      <div><h3>{company.name}</h3><span>{company.industry}</span></div>
      <p>{company.description}</p>
    </article>
  );
}