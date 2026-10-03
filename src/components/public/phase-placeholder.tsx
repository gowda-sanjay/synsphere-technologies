import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export function PhasePlaceholder({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  return (
    <section className="phase-placeholder shell">
      <div className="phase-placeholder-mark"><LockKeyhole size={24} aria-hidden="true" /></div>
      <span className="eyebrow">COMING IN A LATER PHASE</span>
      <h1>{isLogin ? "Sign-in is not available yet." : "Account creation is not available yet."}</h1>
      <p>This public preview does not include authentication. You can continue exploring sample courses and roles without creating an account.</p>
      <div className="phase-placeholder-actions"><Link className="button button-green" href={isLogin ? "/jobs" : "/courses"}>{isLogin ? "Browse sample jobs" : "Explore courses"}</Link><Link className="back-link" href="/"><ArrowLeft size={15} aria-hidden="true" />Return home</Link></div>
    </section>
  );
}