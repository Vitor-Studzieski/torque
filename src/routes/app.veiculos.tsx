import { createFileRoute } from "@tanstack/react-router";
import { VehiclesPage } from "@/features/vehicles/pages/VehiclesPage";

export const Route = createFileRoute("/app/veiculos")({
  head: () => ({
    meta: [
      { title: "Veículos — Torque" },
      { name: "description", content: "Busca por placa e histórico de manutenção." },
      { property: "og:title", content: "Veículos — Torque" },
      { property: "og:description", content: "Busca por placa e histórico de manutenção." },
    ],
  }),
  component: VehiclesPage,
});
