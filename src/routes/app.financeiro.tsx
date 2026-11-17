import { createFileRoute } from "@tanstack/react-router";
import { FinancePage } from "@/features/finance/pages/FinancePage";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Torque" },
      { name: "description", content: "Caixa, contas a receber e a pagar." },
      { property: "og:title", content: "Financeiro — Torque" },
      { property: "og:description", content: "Caixa, contas a receber e a pagar." },
    ],
  }),
  component: FinancePage,
});
