import { createFileRoute } from "@tanstack/react-router";
import { DemoEntryPage } from "@/features/demo/pages/DemoEntryPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Torque — A oficina inteira na ordem de serviço" },
      {
        name: "description",
        content:
          "Demonstração do Torque: OS, clientes, veículos, financeiro e estoque para oficinas mecânicas.",
      },
      { property: "og:title", content: "Torque — A oficina inteira na ordem de serviço" },
      {
        property: "og:description",
        content:
          "Demonstração do Torque: OS, clientes, veículos, financeiro e estoque para oficinas mecânicas.",
      },
    ],
  }),
  component: DemoEntryPage,
});
