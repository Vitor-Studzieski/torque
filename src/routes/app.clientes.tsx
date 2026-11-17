import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/torque/ComingSoon";

export const Route = createFileRoute("/app/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — Torque" }, { name: "description", content: "Cadastro, veículos e histórico de cada cliente." },
    { property: "og:title", content: "Clientes — Torque" }, { property: "og:description", content: "Cadastro, veículos e histórico de cada cliente." },
  ] }),
  component: () => <ComingSoon title="Clientes" description="Cadastro, veículos e histórico de cada cliente." icon={Users} phase={4} />,
});
