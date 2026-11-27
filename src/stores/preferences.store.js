import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
export const PROFILES = {
  gestor: { label: "Gestor", hint: "Acesso completo à oficina" },
  atendente: { label: "Atendente", hint: "Clientes, veículos, entradas e orçamentos" },
  mecanico: { label: "Mecânico", hint: "Todas as OS, execução, peças e evidências" },
  financeiro: { label: "Financeiro", hint: "Contas e consulta de OS e clientes" },
};
export const usePrefs = create()(
  persist(
    (set) => ({
      theme: "dark",
      motion: "full",
      profile: "gestor",
      sidebarCollapsed: false,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setProfile: (profile) => set({ profile }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: "torque-prefs",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
