import type { Metadata } from "next";
import { Globe2, Instagram, Mail, Phone } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";
import { PageHero, SectionHeading } from "@/components/public/public-components";

export const metadata: Metadata = {
  title: "Contact SynSphere Technologies",
  description: "Get in touch with SynSphere Technologies about careers, training, or technology partnerships.",
};

const faqs = [
  { question: "What is SynKode?", answer: "SynKode is the training and education division of SynSphere Technologies, focused on practical technology learning and career development." },
  { question: "Can I ask about a course before joining?", answer: "Yes. Use the contact form to share the course or learning area you are considering. Course details shown on this preview are illustrative." },
  { question: "Does SynSphere guarantee a job after training?", answer: "No. SynKode can provide career preparation and placement support, but employment outcomes depend on many factors and are not guaranteed." },
  { question: "Is this form connected to an inbox?", answer: "Yes. Messages are sent to the SynSphere information team. We do not store contact messages on this website." },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="CONTACT SYNSPHERE"
        title={<>Good things start<br /><span>with a conversation.</span></>}
        description="Ask us about technology, learning with SynKode, or finding your next career opportunity. We’ll help you find the right place to start."
        primaryHref="#contact-form"
        primaryLabel="Send a message"
        note="Your message will be sent to the SynSphere information team."
      />

      <section className="shell contact-layout" id="contact-form">
        <ContactForm />
        <aside className="contact-aside">
          <div className="contact-aside-heading"><span className="eyebrow">CONTACT DETAILS</span><h2>Connect with our team.</h2><p>Reach SynSphere Technologies Pvt Ltd through the official channels below.</p></div>
          <div className="contact-detail"><span><Phone size={17} aria-hidden="true" /></span><div><small>PHONE</small><a href="tel:+917996113095">7996113095</a></div></div>
          <div className="contact-detail"><span><Mail size={17} aria-hidden="true" /></span><div><small>EMAIL</small><a href="mailto:synsphere326@gmail.com">synsphere326@gmail.com</a></div></div>
          <div className="contact-detail"><span><Mail size={17} aria-hidden="true" /></span><div><small>INFORMATION</small><a href="mailto:info@synsphere.in">info@synsphere.in</a></div></div>
          <div className="contact-detail"><span><Globe2 size={17} aria-hidden="true" /></span><div><small>WEBSITE</small><a href="https://synsphere.in" target="_blank" rel="noopener noreferrer">synsphere.in</a></div></div>
          <div className="contact-detail"><span><Instagram size={17} aria-hidden="true" /></span><div><small>INSTAGRAM</small><a href="https://www.instagram.com/synsphere_technologies/" target="_blank" rel="noopener noreferrer">@synsphere_technologies</a></div></div>
        </aside>
      </section>

      <section className="faq-band"><div className="shell faq-layout"><SectionHeading eyebrow="A FEW QUICK ANSWERS" title={<>Before you<br /><span>get in touch.</span></>} description="A little context for some common questions." /><div className="faq-list">{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></div></section>
    </>
  );
}