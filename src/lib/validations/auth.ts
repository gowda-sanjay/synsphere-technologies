import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(120, "Name must be 120 characters or fewer."),
  email: emailSchema,
  mobile: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/, "Enter a valid mobile number."),
  address: z.string().trim().min(5, "Enter your address.").max(300, "Address must be 300 characters or fewer."),
  skills: z.string().trim().max(500, "Keep skills under 500 characters.").optional().default(""),
  education: z.string().trim().max(1200, "Keep education details under 1,200 characters.").optional().default(""),
  experience: z.string().trim().max(1200, "Keep experience details under 1,200 characters.").optional().default(""),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(120, "Name must be 120 characters or fewer."),
  mobile: z.string().trim().max(30, "Use a shorter mobile number.").optional().default(""),
  address: z.string().trim().max(300, "Address must be 300 characters or fewer.").optional().default(""),
  skills: z.string().trim().max(500, "Keep skills under 500 characters.").optional().default(""),
  education: z.string().trim().max(1200, "Keep education details under 1,200 characters.").optional().default(""),
  experience: z.string().trim().max(1200, "Keep experience details under 1,200 characters.").optional().default(""),
}).superRefine((values, ctx) => {
  if (values.mobile && !/^\+?[\d\s()-]{8,20}$/.test(values.mobile.trim())) {
    ctx.addIssue({ code: "custom", path: ["mobile"], message: "Enter a valid mobile number." });
  }
  if (values.address && values.address.trim().length < 5) {
    ctx.addIssue({ code: "custom", path: ["address"], message: "Enter a valid address." });
  }
});

export type ProfileFormValues = z.input<typeof profileUpdateSchema>;

export const otpSchema = z.string().trim().regex(/^\d{6,10}$/, "Enter the verification code from your email.");

export const signupProfileMetadataSchema = z.object({
  full_name: signupSchema.shape.full_name,
  mobile: signupSchema.shape.mobile,
  address: signupSchema.shape.address,
  skills: z.array(z.string().trim().min(1).max(80)).max(30),
  education: z.array(z.string().trim().min(1).max(200)).max(20),
  experience: z.array(z.string().trim().min(1).max(200)).max(20),
  signup_request: z.literal(true),
});

export type SignupValues = z.infer<typeof signupSchema>;