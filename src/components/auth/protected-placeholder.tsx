import Link from "next/link";
import { ArrowRight, CircleCheck, UserRound } from "lucide-react";

export function ProtectedPlaceholder({
  title,
  description,
  email,
}: {
  title: string;
  description: string;
  email: string;
}) {
  return (
    <section className="protected-page shell">
      <div className="protected-card">
        <span className="protected-icon"><CircleCheck size={21} aria-hidden="true" /></span>
        <span className="eyebrow">AUTHENTICATED AREA</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="protected-user"><UserRound size={17} aria-hidden="true" /><span>Signed in as <strong>{email}</strong></span></div>
        <Link className="button button-outline" href="/dashboard">Back to dashboard <ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}