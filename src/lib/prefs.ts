import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light";
export type MotionLevel = "full" | "reduced" | "off";
export type Profile = "gestor" | "atendente" | "mecanico" | "financeiro";

export const PROFILES: Record<Profile, { label: string; hint: string }> = {
  gestor: { label: "Gestor", hint: "Visão completa da oficina" },
  atendente: { label: "Atendente", hint: "Clientes, entradas e orçamentos" },
  mecanico: { label: "Mecânico", hint: "Tarefas, peças e evidências" },
  financeiro: { label: "Financeiro", hint: "Caixa, contas e cobranças" },
};

interface PrefsState {
  theme: Theme;
  motion: MotionLevel;
  profile: Profile;
  sidebarCollapsed: boolean;
  setTheme: (t: Theme) => void;
  setMotion: (m: MotionLevel) => void;
  setProfile: (p: Profile) => void;
  toggleSidebar: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "dark",
      motion: "full",
      profile: "gestor",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setProfile: (profile) => set({ profile }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "torque-prefs", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
