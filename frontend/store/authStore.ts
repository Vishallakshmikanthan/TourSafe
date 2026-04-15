import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";
import { createClient } from "@/lib/supabase";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  isAuthority: () => boolean;
  isTourist: () => boolean;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      signOut: async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ user: null });
      },
      isAuthority: () => {
        const role = get().user?.role;
        return role === "authority" || role === "admin" || role === "responder";
      },
      isTourist: () => get().user?.role === "tourist",
      /** Sync store with the current Supabase session. Call this once on
       *  layout mount so the in-memory user always reflects the real session. */
      initializeAuth: async () => {
        const supabase = createClient();
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const role =
              (user.app_metadata?.role as AuthUser["role"] | undefined) ??
              (user.user_metadata?.role as AuthUser["role"] | undefined) ??
              "tourist";
            set({
              user: {
                id: user.id,
                email: user.email ?? "",
                role,
                full_name:
                  (user.user_metadata?.full_name as string | undefined) ?? "",
              },
            });
          } else {
            set({ user: null });
          }
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "toursafe-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
