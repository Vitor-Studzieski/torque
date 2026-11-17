import { createFileRoute } from "@tanstack/react-router";
import { WorkOrdersPage } from "@/features/work-orders/pages/WorkOrdersPage";

export const Route = createFileRoute("/app/ordens/")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço — Torque" },
      { name: "description", content: "Quadro e lista de OS, da entrada à entrega." },
      { property: "og:title", content: "Ordens de serviço — Torque" },
      { property: "og:description", content: "Quadro e lista de OS, da entrada à entrega." },
    ],
  }),
  component: WorkOrdersPage,
});
