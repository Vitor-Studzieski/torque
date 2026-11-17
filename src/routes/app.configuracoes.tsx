import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Torque" },
      { name: "description", content: "Dados da oficina, tema e animações." },
      { property: "og:title", content: "Configurações — Torque" },
      { property: "og:description", content: "Dados da oficina, tema e animações." },
    ],
  }),
  component: SettingsPage,
});
