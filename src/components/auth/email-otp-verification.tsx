"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Mail, RefreshCw } from "lucide-react";
import { completeEmailOtpProfile } from "@/app/actions/auth";
import { getAuthErrorMessage } from "@/lib/auth/error-message";
import { clearPendingSignup, readPendingSignup, requestEmailOtp } from "@/lib/auth/email-otp";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { otpSchema } from "@/lib/validations/auth";

const RESEND_WAIT_SECONDS = 60;

export function EmailOtpVerification({ email, flow, next }: { email: string; flow: "login" | "signup"; next: string }) {
  const [token, setToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_WAIT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("error");
  const router = useRouter();
  const safeNext = getSafeReturnPath(next);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active && data.user?.email?.toLowerCase() === email.toLowerCase()) setVerified(true);
    });
    return () => { active = false; };
  }, [email]);

  async function finishProfile() {
    const profileDraft = flow === "signup" ? readPendingSignup() : undefined;
    try {
      const result = await completeEmailOtpProfile(profileDraft ?? undefined);
      if (!result.ok) {
        setMessage(result.error ?? "Your email is verified, but profile setup could not be completed.");
        setMessageKind("error");
        setBusy(false);
        return;
      }

      if (flow === "signup") clearPendingSignup();
      setMessage("Email verified. Your account is ready.");
      setMessageKind("success");
      router.replace(safeNext);
      router.refresh();
    } catch {
      setMessage("Your email is verified, but we couldn't finish setting up your profile. Please retry.");
      setMessageKind("error");
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    if (verified) {
      await finishProfile();
      return;
    }

    const parsed = otpSchema.safeParse(token);
    if (!parsed.success) {
      setMessage("Enter the verification code from your email.");
      setMessageKind("error");
      setBusy(false);
      return;
    }

    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage("Email authentication is not configured correctly. Please contact the administrator.");
      setMessageKind("error");
      setBusy(false);
      return;
    }

    let data: Awaited<ReturnType<typeof client.auth.verifyOtp>>["data"];
    let error: Awaited<ReturnType<typeof client.auth.verifyOtp>>["error"];
    try {
      const result = await client.auth.verifyOtp({ email, token: parsed.data, type: "email" });
      data = result.data;
      error = result.error;
    } catch {
      setMessage("We couldn't verify that code right now. Please try again.");
      setMessageKind("error");
      setBusy(false);
      return;
    }
    if (error || !data.user) {
      setMessage(error ? getAuthErrorMessage(error) : "We couldn't verify that code. Please check it and try again.");
      setMessageKind("error");
      setBusy(false);
      return;
    }

    setVerified(true);
    setMessage("Email verified. Finishing account setup…");
    setMessageKind("success");
    await finishProfile();
  }

  async function resend() {
    if (secondsLeft > 0 || busy) return;
    setBusy(true);
    setMessage("");
    const result = await requestEmailOtp(email, flow);
    if (!result.ok) {
      setMessage(result.message);
      setMessageKind("error");
      setBusy(false);
      return;
    }
    setSecondsLeft(RESEND_WAIT_SECONDS);
    setToken("");
    setVerified(false);
    setMessage("A new code has been sent.");
    setMessageKind("success");
    setBusy(false);
  }

  const changeHref = `${flow === "signup" ? "/signup" : "/login"}?next=${encodeURIComponent(safeNext)}`;

  return (
    <div className="auth-form">
      <div className="verify-email-address"><span><Mail size={17} aria-hidden="true" /></span><div><small>CODE SENT TO</small><strong>{email}</strong></div></div>
      <form noValidate onSubmit={verify}>
        <div className="form-field"><label htmlFor="email-otp">Email verification code</label><input id="email-otp" className="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 10))} onPaste={(event) => { event.preventDefault(); setToken(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 10)); }} aria-describedby="otp-help" placeholder="Enter your code" disabled={busy || verified} /></div>
        <p id="otp-help" className="auth-field-hint">Enter the code from your email. Code length follows your Supabase Auth configuration.</p>
        {message ? <p className={messageKind === "error" ? "auth-error" : "auth-success"} role={messageKind === "error" ? "alert" : "status"}>{message}</p> : null}
        <button className="button button-green auth-submit" type="submit" disabled={busy}>{busy ? "Verifying…" : verified ? "Continue to your account" : flow === "signup" ? "Verify email" : "Verify & sign in"}<Check size={16} aria-hidden="true" /></button>
      </form>
      <div className="otp-actions">{!verified ? <button className="otp-resend" type="button" onClick={resend} disabled={secondsLeft > 0 || busy}><RefreshCw size={14} aria-hidden="true" />{secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}</button> : <span className="otp-verified-note">Code verified</span>}<Link className="auth-change-email" href={changeHref}><ArrowLeft size={14} aria-hidden="true" />Change email</Link></div>
    </div>
  );
}