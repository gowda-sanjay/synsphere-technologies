"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";
import { getSafeReturnPath } from "@/lib/auth/redirects";
import { makeSignupProfileDraft, PENDING_SIGNUP_KEY, requestEmailOtp } from "@/lib/auth/email-otp";

type SignupInput = z.input<typeof signupSchema>;

export function SignupForm({ nextPath }: { nextPath: string }) {
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput, unknown, SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", mobile: "", address: "", skills: "", education: "", experience: "" },
  });

  async function onSubmit(values: SignupValues) {
    setRequestError("");
    setRequesting(true);
    const profile = makeSignupProfileDraft(values);
    const email = values.email.trim().toLowerCase();

    try {
      window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(profile));
      const result = await requestEmailOtp(email, "signup");
      if (!result.ok) {
        setRequestError(result.message);
        setRequesting(false);
        return;
      }

      const next = getSafeReturnPath(nextPath);
      router.push(`/verify?flow=signup&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
    } catch {
      setRequestError("We couldn't send the verification code. Please try again.");
      setRequesting(false);
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="auth-fields-grid">
        <div className="form-field auth-field-wide"><label htmlFor="signup-name">Full name</label><input id="signup-name" autoComplete="name" {...register("full_name")} aria-invalid={Boolean(errors.full_name)} />{errors.full_name ? <span className="field-error">{errors.full_name.message}</span> : null}</div>
        <div className="form-field"><label htmlFor="signup-email">Email</label><input id="signup-email" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email ? <span className="field-error">{errors.email.message}</span> : null}</div>
        <div className="form-field"><label htmlFor="signup-mobile">Mobile number</label><input id="signup-mobile" type="tel" autoComplete="tel" {...register("mobile")} aria-invalid={Boolean(errors.mobile)} />{errors.mobile ? <span className="field-error">{errors.mobile.message}</span> : null}<span className="auth-field-hint">For your profile only. No SMS verification.</span></div>
        <div className="form-field auth-field-wide"><label htmlFor="signup-address">Address</label><input id="signup-address" autoComplete="street-address" {...register("address")} aria-invalid={Boolean(errors.address)} />{errors.address ? <span className="field-error">{errors.address.message}</span> : null}</div>
        <div className="form-field auth-field-wide"><label htmlFor="signup-skills">Skills <span>(optional, comma separated)</span></label><input id="signup-skills" {...register("skills")} aria-invalid={Boolean(errors.skills)} />{errors.skills ? <span className="field-error">{errors.skills.message}</span> : null}</div>
        <div className="form-field auth-field-wide"><label htmlFor="signup-education">Education <span>(optional)</span></label><textarea id="signup-education" rows={2} {...register("education")} aria-invalid={Boolean(errors.education)} />{errors.education ? <span className="field-error">{errors.education.message}</span> : null}</div>
        <div className="form-field auth-field-wide"><label htmlFor="signup-experience">Experience <span>(optional)</span></label><textarea id="signup-experience" rows={2} {...register("experience")} aria-invalid={Boolean(errors.experience)} />{errors.experience ? <span className="field-error">{errors.experience.message}</span> : null}</div>
      </div>
      {requestError ? <p className="auth-error" role="alert">{requestError}</p> : null}
      <button className="button button-green auth-submit" type="submit" disabled={requesting}>{requesting ? "Sending code…" : "Continue with email"}</button>
      <p className="auth-legal">By continuing, you agree to receive a one-time verification code by email.</p>
      <p className="auth-inline-link">Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link></p>
    </form>
  );
}