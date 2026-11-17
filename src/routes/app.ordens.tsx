import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/ordens")({
  head: () => ({ meta: [
    { title: "Ordens de serviço — Torque" }, { name: "description", content: "Quadro e lista de OS, da entrada à entrega." },
    { property: "og:title", content: "Ordens de serviço — Torque" }, { property: "og:description", content: "Quadro e lista de OS, da entrada à entrega." },
  ] }),
  component: () => <ComingSoon title="Ordens de serviço" description="Quadro e lista de OS, da entrada à entrega." icon={ClipboardList} phase={2} />,
});
