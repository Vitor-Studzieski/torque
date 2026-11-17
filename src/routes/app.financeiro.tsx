import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/financeiro")({
  head: () => ({ meta: [
    { title: "Financeiro — Torque" }, { name: "description", content: "Caixa, contas a receber e a pagar." },
    { property: "og:title", content: "Financeiro — Torque" }, { property: "og:description", content: "Caixa, contas a receber e a pagar." },
  ] }),
  component: () => <ComingSoon title="Financeiro" description="Caixa, contas a receber e a pagar." icon={Wallet} phase={4} />,
});
