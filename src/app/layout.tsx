import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "SynSphere x SynKode | Build your next chapter",
    template: "%s | SynSphere",
  },
  description:
    "Find meaningful work, build in-demand skills, and move forward with SynSphere Technologies and SynKode.",
  openGraph: {
    title: "SynSphere x SynKode | Build your next chapter",
    description:
      "Career opportunities and practical technology learning, connected in one place.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}