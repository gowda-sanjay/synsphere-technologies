"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

export function DashboardLogout({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { signOut } = useAuth();

  async function handleSignOut() {
    const succeeded = await signOut();
    if (!succeeded) return;
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className={className} onClick={handleSignOut}>
      <LogOut size={15} aria-hidden="true" />
      Logout
    </button>
  );
}
