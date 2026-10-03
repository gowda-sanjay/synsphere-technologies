import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create an account — SynSphere", description: "Create your SynSphere account and verify your email with a one-time code." };

type SignupPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const query = await searchParams;
  const nextParam = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = getSafeReturnPath(nextParam);
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(nextPath);
  }

  return (
    <AuthShell eyebrow="YOUR NEXT CHAPTER" title="Create your account." description="Share a few details to get started. We’ll verify your email; your mobile number is profile information only." footer={<span>Already have an account? <a href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</a></span>}>
      <SignupForm nextPath={nextPath} />
    </AuthShell>
  );
}