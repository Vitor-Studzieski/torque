import { createFileRoute, redirect } from "@tanstack/react-router";
import { getRequestAuth } from "@/lib/server/auth";
import { DemoEntryPage } from "@/features/demo/pages/DemoEntryPage";
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const authContext = await getRequestAuth();
    if (authContext.mode === "unconfigured") throw redirect({ href: "/entrar" });
    if (authContext.mode === "clerk") {
      throw redirect({ href: authContext.isAuthenticated ? "/app" : "/entrar" });
    }
  },
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
