"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { emailSchema } from "@/lib/validations/auth";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { requestEmailOtp } from "@/lib/auth/email-otp";

export function LoginForm({ nextPath, configurationUnavailable }: { nextPath: string; configurationUnavailable: boolean }) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const next = getSafeReturnPath(nextPath);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setRequestError("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(z.treeifyError(parsed.error).errors[0] ?? "Enter a valid email address.");
      return;
    }

    setRequesting(true);
    try {
      const normalizedEmail = parsed.data.toLowerCase();
      const result = await requestEmailOtp(normalizedEmail, "login");
      if (!result.ok) {
        setRequestError(result.message);
        setRequesting(false);
        return;
      }
      router.push(`/verify?flow=login&email=${encodeURIComponent(normalizedEmail)}&next=${encodeURIComponent(next)}`);
    } catch {
      setRequestError("We couldn't send the verification code. Please try again.");
      setRequesting(false);
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {configurationUnavailable ? <p className="auth-error" role="alert">Email authentication is not configured correctly. Please contact the administrator.</p> : null}
      <div className="form-field"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(emailError)} placeholder="you@example.com" /></div>
      {emailError ? <p className="field-error" role="alert">{emailError}</p> : null}
      {requestError ? <p className="auth-error" role="alert">{requestError}</p> : null}
      <button className="button button-green auth-submit" type="submit" disabled={requesting}>{requesting ? "Sending code…" : "Continue with email"}</button>
      <p className="auth-legal">We’ll email you a one-time code. No password required.</p>
      <p className="auth-inline-link">New to SynSphere? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
    </form>
  );
}