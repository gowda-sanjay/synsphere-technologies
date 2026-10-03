import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in — SynSphere", description: "Sign in securely to SynSphere using a one-time code sent to your email." };

type LoginPageProps = { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const nextParam = Array.isArray(query.next) ? query.next[0] : query.next;
  const reason = Array.isArray(query.reason) ? query.reason[0] : query.reason;
  const nextPath = getSafeReturnPath(nextParam);
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(nextPath);
  }

  return (
    <AuthShell eyebrow="WELCOME BACK" title="Sign in with email." description="We’ll send a one-time verification code to your inbox. No password required." footer={<span>New to SynSphere? <a href={`/signup?next=${encodeURIComponent(nextPath)}`}>Create an account</a></span>}>
      <LoginForm nextPath={nextPath} configurationUnavailable={!supabase || reason === "unavailable"} />
    </AuthShell>
  );
}