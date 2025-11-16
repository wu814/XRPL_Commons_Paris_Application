"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "loading" | "authenticated" | "unauthenticated";
type UserProfile = { yona_id: string; username: string; account_type: string; kyc_status: string; created_at: string; member_id: string | null };

export function useSupabaseSession() {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      const authUser = data.session?.user ?? null;
      setSession(authUser);
      setStatus(authUser ? "authenticated" : "unauthenticated");
      
      // Fetch profile if authenticated
      if (authUser) {
        supabase
          .from("users")
          .select("yona_id, username, account_type, kyc_status, created_at, member_id")
          .eq("id", authUser.id)
          .single()
          .then(({ data }) => setUser(data ?? null));
      }
    });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_, authSession) => {
      const authUser = authSession?.user ?? null;
      setSession(authUser);
      setStatus(authUser ? "authenticated" : "unauthenticated");
      
      if (authUser) {
        supabase
          .from("users")
          .select("yona_id, username, account_type, kyc_status, created_at, member_id")
          .eq("id", authUser.id)
          .single()
          .then(({ data }) => setUser(data ?? null));
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { status, session, user };
}