import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/features/reports/pages/ReportsPage";
export const Route = createFileRoute("/app/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Torque" },
      { name: "description", content: "Faturamento, serviços e produtividade." },
      { property: "og:title", content: "Relatórios — Torque" },
      { property: "og:description", content: "Faturamento, serviços e produtividade." },
    ],
  }),
  component: ReportsPage,
});
