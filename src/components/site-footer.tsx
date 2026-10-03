import Link from "next/link";
import { ArrowUpRight, Globe2, Instagram, Mail, Phone } from "lucide-react";
import { SynSphereLogo } from "@/components/brand/synsphere-logo";

const footerLinks = [
  { href: "/about", label: "About SynSphere" },
  { href: "/synkode", label: "SynKode training" },
  { href: "/jobs", label: "Explore jobs" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main">
          <div className="footer-brand-block">
            <Link className="brand brand-footer" href="/">
              <SynSphereLogo className="h-20 w-auto max-w-full object-contain" />
            </Link>
            <p>Practical learning. Meaningful work.<br />A clearer way forward.</p>
          </div>
          <div className="footer-link-block">
            <span className="eyebrow">EXPLORE</span>
            <nav aria-label="Footer navigation">
              {footerLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
            </nav>
          </div>
          <div className="footer-note">
            <span className="eyebrow">THE NEXT STEP</span>
            <p>Ready to make your next move?</p>
            <Link href="/signup">Create your account <ArrowUpRight size={15} aria-hidden="true" /></Link>
            <address className="footer-contact">
              <a href="tel:+917996113095"><Phone size={13} aria-hidden="true" />7996113095</a>
              <a href="mailto:synsphere326@gmail.com"><Mail size={13} aria-hidden="true" />synsphere326@gmail.com</a>
              <a href="mailto:info@synsphere.in"><Mail size={13} aria-hidden="true" />info@synsphere.in</a>
              <a href="https://synsphere.in" target="_blank" rel="noopener noreferrer"><Globe2 size={13} aria-hidden="true" />synsphere.in</a>
              <a href="https://www.instagram.com/synsphere_technologies/" target="_blank" rel="noopener noreferrer"><Instagram size={13} aria-hidden="true" />@synsphere_technologies</a>
            </address>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SynSphere Technologies Pvt. Ltd.</span>
          <span className="footer-synkode"><i /> Training, by SynKode</span>
        </div>
      </div>
    </footer>
  );
}