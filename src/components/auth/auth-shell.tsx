import Link from "next/link";
import type { ReactNode } from "react";
import { SynSphereLogo } from "@/components/brand/synsphere-logo";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="auth-page shell">
      <div className="auth-card">
        <Link className="auth-brand" href="/" aria-label="SynSphere home">
          <SynSphereLogo className="h-20 w-auto max-w-full object-contain" />
          <span className="auth-brand-divider" />
          <span className="auth-synkode">SynKode</span>
        </Link>
        <span className="eyebrow auth-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
      <p className="auth-trust-note">Your account is protected by SynSphere and Supabase.</p>
    </section>
  );
}