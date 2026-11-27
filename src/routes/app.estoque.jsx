import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
export const Route = createFileRoute("/app/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque e peças — Torque" },
      { name: "description", content: "Catálogo, saldos e movimentações." },
      { property: "og:title", content: "Estoque e peças — Torque" },
      { property: "og:description", content: "Catálogo, saldos e movimentações." },
    ],
  }),
  component: InventoryPage,
});
