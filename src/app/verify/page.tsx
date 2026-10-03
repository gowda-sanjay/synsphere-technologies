import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailOtpVerification } from "@/components/auth/email-otp-verification";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { emailSchema } from "@/lib/validations/auth";

export const metadata: Metadata = {
  title: "Verify your email — SynSphere",
  description: "Verify your email address with a one-time SynSphere sign-in code.",
};

type VerifyPageProps = {
  searchParams: Promise<{ email?: string | string[]; flow?: string | string[]; next?: string | string[] }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const query = await searchParams;
  const emailParam = Array.isArray(query.email) ? query.email[0] : query.email;
  const flowParam = Array.isArray(query.flow) ? query.flow[0] : query.flow;
  const nextParam = Array.isArray(query.next) ? query.next[0] : query.next;
  const parsedEmail = emailSchema.safeParse(emailParam ?? "");
  const flow = flowParam === "signup" ? "signup" : "login";
  const next = getSafeReturnPath(nextParam);
  const entryPath = flow === "signup" ? `/signup?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`;

  if (!parsedEmail.success) {
    return (
      <AuthShell eyebrow="EMAIL VERIFICATION" title="Verification details missing." description="Start again with your email address so we can send a fresh verification code." footer={<Link href={entryPath}>Return to {flow === "signup" ? "sign up" : "sign in"}</Link>}>
        <Link className="button button-green auth-submit-link" href={entryPath}>Continue</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="EMAIL VERIFICATION" title="Verify your email." description="Enter the one-time code sent to your inbox to continue." footer={<span>Need a different address? <Link href={entryPath}>Change email</Link></span>}>
      <EmailOtpVerification email={parsedEmail.data} flow={flow} next={next} />
    </AuthShell>
  );
}