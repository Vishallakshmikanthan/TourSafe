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
    }),
    {
      name: "toursafe-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
