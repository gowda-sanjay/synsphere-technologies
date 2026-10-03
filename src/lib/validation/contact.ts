import { z } from "zod";

const indianMobile = z.string().trim()
  .transform((mobile) => mobile.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(?:(?:\+91|91|0)?[6-9]\d{9})$/, "Enter a valid Indian mobile number."))
  .transform((mobile) => {
    const localNumber = mobile.startsWith("+91")
      ? mobile.slice(3)
      : mobile.length === 12 && mobile.startsWith("91")
        ? mobile.slice(2)
        : mobile.length === 11 && mobile.startsWith("0")
          ? mobile.slice(1)
          : mobile;
    return `+91${localNumber}`;
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100, "Keep your name under 100 characters."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Enter a valid email address."),
  mobile: indianMobile,
  subject: z.string().trim().min(3, "Add a short subject.").max(150, "Keep your subject under 150 characters.")
    .transform((subject) => subject.replace(/[\r\n]+/g, " ")),
  message: z.string().trim().min(20, "Please share at least 20 characters.")
    .max(1200, "Keep your message under 1,200 characters."),
});

export type ContactValues = z.infer<typeof contactSchema>;
