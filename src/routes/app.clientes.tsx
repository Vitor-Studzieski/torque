import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/features/customers/pages/CustomersPage";

export const Route = createFileRoute("/app/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Torque" },
      { name: "description", content: "Cadastro, veículos e histórico de cada cliente." },
      { property: "og:title", content: "Clientes — Torque" },
      { property: "og:description", content: "Cadastro, veículos e histórico de cada cliente." },
    ],
  }),
  component: CustomersPage,
});
