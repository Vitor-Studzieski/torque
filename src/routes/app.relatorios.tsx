import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/relatorios")({
  head: () => ({ meta: [
    { title: "Relatórios — Torque" }, { name: "description", content: "Faturamento, serviços e produtividade." },
    { property: "og:title", content: "Relatórios — Torque" }, { property: "og:description", content: "Faturamento, serviços e produtividade." },
  ] }),
  component: () => <ComingSoon title="Relatórios" description="Faturamento, serviços e produtividade." icon={BarChart3} phase={4} />,
});
