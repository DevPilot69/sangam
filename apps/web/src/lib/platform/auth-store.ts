import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: "platform_admin";
};

interface PlatformAuthState {
  user: PlatformUser | null;
  token: string | null;
  setUser: (user: PlatformUser | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: "vetan-platform-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
);
