import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Torque" },
      { name: "description", content: "Indicadores e veículos na oficina agora." },
      { property: "og:title", content: "Visão geral — Torque" },
      { property: "og:description", content: "Indicadores e veículos na oficina agora." },
    ],
  }),
  component: DashboardPage,
});
