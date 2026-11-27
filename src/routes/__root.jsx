import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/tanstack-react-start";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { usePrefs } from "@/stores/preferences.store";
import { useWorkshopStore } from "@/stores/workshop.store";
import appCss from "../styles.css?url";
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi alterado.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
function ErrorComponent({ error, reset }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro ao abrir esta tela. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
export const Route = createRootRouteWithContext()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Torque — Gestão para oficinas mecânicas" },
      {
        name: "description",
        content:
          "Ordens de serviço, clientes, veículos, financeiro e estoque da oficina em um só lugar.",
      },
      { property: "og:title", content: "Torque — Gestão para oficinas mecânicas" },
      {
        property: "og:description",
        content:
          "Ordens de serviço, clientes, veículos, financeiro e estoque da oficina em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }) {
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {clerkPublishableKey ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            signInUrl="/entrar"
            signUpUrl="/convite"
            signInFallbackRedirectUrl="/app"
            signUpFallbackRedirectUrl="/app"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const theme = usePrefs((s) => s.theme);
  useEffect(() => {
    void usePrefs.persist.rehydrate();
    void useWorkshopStore.persist.rehydrate().then(() => {
      useWorkshopStore.getState().refreshOverdueFinanceEntries();
    });
  }, []);
  useEffect(() => {
    const refreshOverdue = () => useWorkshopStore.getState().refreshOverdueFinanceEntries();
    const intervalId = window.setInterval(refreshOverdue, 60_000);
    document.addEventListener("visibilitychange", refreshOverdue);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOverdue);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);
  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster theme={theme} position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}
