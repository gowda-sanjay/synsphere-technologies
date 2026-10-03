"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const client = createSupabaseBrowserClient();

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    let active = true;
    let authEventReceived = false;

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      setUser(error ? null : data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active || authEventReceived) return;
      setUser(null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  async function signOut() {
    if (!client) return false;
    try {
      const { error } = await client.auth.signOut();
      return !error;
    } catch {
      return false;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, configured: Boolean(client), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}