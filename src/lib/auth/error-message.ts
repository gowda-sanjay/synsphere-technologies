type AuthErrorLike = { code?: string; message?: string; status?: number };

export function getAuthErrorMessage(error: AuthErrorLike | undefined, action: "send" | "verify" | "profile" = "verify"): string {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  const combined = `${code} ${message}`;

  if (/rate|too many|429/.test(combined) || error?.status === 429) {
    return "Too many attempts. Please wait before trying again.";
  }
  if (/expired|otp_expired/.test(combined)) {
    return "Your verification code has expired. Please request a new code.";
  }
  if (/invalid.*(otp|token)|otp.*invalid|token.*invalid|bad_code/.test(combined)) {
    return "That verification code is incorrect. Please try again.";
  }
  if (/signup_disabled|email_provider_disabled|provider_disabled|not configured/.test(combined)) {
    return "Email authentication is not configured correctly. Please contact the administrator.";
  }
  if (action === "send") {
    return "We couldn't send the verification code. Please check your email address and try again.";
  }
  if (action === "profile") {
    return "Your email is verified, but we couldn't finish setting up your profile. Please retry.";
  }
  return "We couldn't verify that code. Please check it and try again.";
}