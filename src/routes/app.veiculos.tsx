import { createFileRoute } from "@tanstack/react-router";
import { Car } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/veiculos")({
  head: () => ({ meta: [
    { title: "Veículos — Torque" }, { name: "description", content: "Busca por placa e histórico de manutenção." },
    { property: "og:title", content: "Veículos — Torque" }, { property: "og:description", content: "Busca por placa e histórico de manutenção." },
  ] }),
  component: () => <ComingSoon title="Veículos" description="Busca por placa e histórico de manutenção." icon={Car} phase={4} />,
});
