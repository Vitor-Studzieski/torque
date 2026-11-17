import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/estoque")({
  head: () => ({ meta: [
    { title: "Estoque e peças — Torque" }, { name: "description", content: "Catálogo, saldos e movimentações." },
    { property: "og:title", content: "Estoque e peças — Torque" }, { property: "og:description", content: "Catálogo, saldos e movimentações." },
  ] }),
  component: () => <ComingSoon title="Estoque e peças" description="Catálogo, saldos e movimentações." icon={Package} phase={4} />,
});
