"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, Send } from "lucide-react";
import { contactSchema, type ContactValues } from "@/lib/validation/contact";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactValues) {
    setStatus("idle");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="contact-form-wrap">
      <div className="contact-form-heading"><span className="eyebrow">SEND A MESSAGE</span><h2>Let&apos;s start a conversation.</h2><p>Tell us what you&apos;re looking for and we&apos;ll help point you in the right direction.</p></div>
      {status === "success" ? <div className="form-success" role="status"><span><Check size={17} aria-hidden="true" /></span><div><strong>Message sent successfully.</strong><p>Thank you for contacting SynSphere Technologies. Our team will get back to you soon.</p></div></div> : null}
      {status === "error" ? <div className="form-error" role="alert">Unable to send your message right now. Please try again or contact us directly at <a href="mailto:info@synsphere.in">info@synsphere.in</a>.</div> : null}
      <form className="contact-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="form-field"><label htmlFor="contact-name">Name</label><input id="contact-name" autoComplete="name" maxLength={100} {...register("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} placeholder="Your full name" />{errors.name ? <span className="field-error" id="contact-name-error">{errors.name.message}</span> : null}</div>
        <div className="form-field"><label htmlFor="contact-email">Email</label><input id="contact-email" type="email" autoComplete="email" maxLength={254} {...register("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} placeholder="you@example.com" />{errors.email ? <span className="field-error" id="contact-email-error">{errors.email.message}</span> : null}</div>
        <div className="form-field"><label htmlFor="contact-mobile">Mobile</label><input id="contact-mobile" type="tel" autoComplete="tel" maxLength={20} {...register("mobile")} aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? "contact-mobile-error" : undefined} placeholder="+91 98765 43210" />{errors.mobile ? <span className="field-error" id="contact-mobile-error">{errors.mobile.message}</span> : null}</div>
        <div className="form-field"><label htmlFor="contact-subject">Subject</label><input id="contact-subject" maxLength={150} {...register("subject")} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "contact-subject-error" : undefined} placeholder="How can we help?" />{errors.subject ? <span className="field-error" id="contact-subject-error">{errors.subject.message}</span> : null}</div>
        <div className="form-field form-field-wide"><label htmlFor="contact-message">Message</label><textarea id="contact-message" rows={5} maxLength={1200} {...register("message")} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} placeholder="Share a little about what brings you here..." />{errors.message ? <span className="field-error" id="contact-message-error">{errors.message.message}</span> : null}</div>
        <div className="form-submit-row"><p>Your message is sent directly to our information team.</p><button className="button button-green" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send message"} <Send size={15} aria-hidden="true" /></button></div>
      </form>
    </div>
  );
}