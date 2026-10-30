/**
 * useUserRole — Lightweight Supabase role hook.
 *
 * Returns the authenticated user's role from the `profiles` table.
 * Role values stored in DB:  "reviewer" | "doctor"  → treated as doctor
 *                            "patient"              → treated as patient
 *                            null / undefined       → unauthenticated
 *
 * This is the SINGLE source of truth for role decisions across the app.
 */
import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "./supabase";

export type UserRole = "doctor" | "patient" | "loading" | "unauthenticated";

export interface UserRoleState {
  role: UserRole;
  userId: string | null;
  displayName: string | null;
}

function rawRoleToAppRole(rawRole: string | null | undefined): "doctor" | "patient" {
  if (rawRole === "reviewer" || rawRole === "doctor") return "doctor";
  return "patient";
}

export function useUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    role: "loading",
    userId: null,
    displayName: null,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState({ role: "unauthenticated", userId: null, displayName: null });
      return;
    }

    let cancelled = false;

    const loadRole = async (userId: string, userEmail?: string) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;

        const appRole = rawRoleToAppRole(profile?.role);
        const displayName =
          profile?.display_name || userEmail?.split("@")[0] || "User";

        setState({ role: appRole, userId, displayName });
      } catch {
        if (!cancelled) {
          setState({ role: "patient", userId, displayName: null });
        }
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        setState({ role: "unauthenticated", userId: null, displayName: null });
        return;
      }
      loadRole(session.user.id, session.user.email);
    });

    // React to future auth state changes (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setState({ role: "unauthenticated", userId: null, displayName: null });
        return;
      }
      setState((prev) => ({ ...prev, role: "loading" }));
      loadRole(session.user.id, session.user.email);
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return state;
}

