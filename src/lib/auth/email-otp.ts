import { signupProfileMetadataSchema, type SignupValues } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth/error-message";

export const PENDING_SIGNUP_KEY = "synsphere.pending-signup-profile";

export type SignupProfileDraft = {
  full_name: string;
  mobile: string;
  address: string;
  skills: string[];
  education: string[];
  experience: string[];
  signup_request: true;
};

function splitList(value: string, separator: RegExp): string[] {
  return value.split(separator).map((item) => item.trim()).filter(Boolean);
}

export function makeSignupProfileDraft(values: SignupValues): SignupProfileDraft {
  return {
    full_name: values.full_name,
    mobile: values.mobile,
    address: values.address,
    skills: splitList(values.skills, /[,\n]/).slice(0, 30),
    education: splitList(values.education, /\n/).slice(0, 20),
    experience: splitList(values.experience, /\n/).slice(0, 20),
    signup_request: true,
  };
}

export function readPendingSignup(): SignupProfileDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = signupProfileMetadataSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPendingSignup() {
  try {
    window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export async function requestEmailOtp(email: string, flow: "login" | "signup") {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { ok: false as const, message: "Email authentication is not configured correctly. Please contact the administrator." };

  const pendingSignup = flow === "signup" ? readPendingSignup() : null;
  if (flow === "signup" && !pendingSignup) {
    return { ok: false as const, message: "Your signup details are no longer available. Please submit the signup form again." };
  }

  try {
    const otpOptions = flow === "signup"
      ? {
          shouldCreateUser: true,
          data: { full_name: pendingSignup?.full_name ?? "" },
        }
      : { shouldCreateUser: false };

    // Supabase email OTP and magic links share the same request API.
    // The email template decides the actual output: a magic link is sent when
    // the configured template includes {{ .ConfirmationURL }}; numeric OTP is sent
    // only when the Email OTP template includes {{ .Token }} instead.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: otpOptions,
    });

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth] signInWithOtp failed", {
          code: error.code,
          message: error.message,
          status: error.status,
          flow,
          email: email.toLowerCase(),
        });
      }
      return { ok: false as const, message: getAuthErrorMessage(error, "send") };
    }

    return { ok: true as const };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth] signInWithOtp exception", {
        flow,
        email: email.toLowerCase(),
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split("\n")[0] ?? null,
        } : error,
      });
    }
    return { ok: false as const, message: "We couldn't send the verification code. Please try again." };
  }
}