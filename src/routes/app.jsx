import { useEffect } from "react";
import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PageTransition } from "@/components/layout/PageTransition";
import { usePrefs } from "@/stores/preferences.store";
import { canAccessPath, homePathFor } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { UserButton } from "@clerk/tanstack-react-start";
import { getRequestAuth } from "@/lib/server/auth";
import { TeamInviteForm } from "@/features/auth/components/TeamInviteForm";
import { TeamManagement } from "@/features/auth/components/TeamManagement";
import { toast } from "sonner";
import { useWorkshopStore } from "@/stores/workshop.store";
export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const authContext = await getRequestAuth();
    if (authContext.mode === "unconfigured") throw redirect({ href: "/entrar" });
    if (authContext.mode === "clerk" && !authContext.isAuthenticated) {
      throw redirect({ href: "/entrar" });
    }
    return { authContext };
  },
  component: AppLayout,
});
function AppLayout() {
  const { authContext } = Route.useRouteContext();
  const profile = usePrefs((state) => state.profile);
  const setProfile = usePrefs((state) => state.setProfile);
  const hasHydrated = usePrefs((state) => state.hasHydrated);
  const backendReady = useWorkshopStore((state) => state.backendReady);
  const backendLoading = useWorkshopStore((state) => state.backendLoading);
  const backendError = useWorkshopStore((state) => state.backendError);
  const loadOperationalData = useWorkshopStore((state) => state.loadOperationalData);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isWorkshopMember =
    authContext.mode === "clerk" && authContext.membershipStatus === "active";
  const effectiveProfile = isWorkshopMember
    ? profileForWorkshopRole(authContext.membership?.role)
    : profile;
  const allowed = canAccessPath(effectiveProfile, pathname);

  useEffect(() => {
    if (!isWorkshopMember || !hasHydrated) return undefined;
    setProfile(profileForWorkshopRole(authContext.membership?.role));
    void loadOperationalData();
    const showOperationalError = (event) => {
      toast.error("A alteração não foi salva no banco", {
        description: event.detail?.message ?? "Atualize os dados e tente novamente.",
      });
    };
    window.addEventListener("torque:operational-error", showOperationalError);
    return () => window.removeEventListener("torque:operational-error", showOperationalError);
  }, [
    authContext.membership?.role,
    hasHydrated,
    isWorkshopMember,
    loadOperationalData,
    setProfile,
  ]);

  if (authContext.mode === "clerk" && !isWorkshopMember) {
    return (
      <WorkshopAccessPending
        membershipStatus={authContext.membershipStatus}
        membership={authContext.membership}
      />
    );
  }
  if (isWorkshopMember && (!backendReady || backendLoading)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-7 text-center shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Torque</p>
          <h1 className="mt-3 text-xl font-bold">
            {backendError ? "Não foi possível carregar os dados" : "Conectando à oficina"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {backendError ||
              "Carregando clientes, veículos, ordens, estoque e financeiro do PostgreSQL."}
          </p>
          {backendError && (
            <button
              type="button"
              onClick={() => void loadOperationalData()}
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar novamente
            </button>
          )}
          <div className="mt-6 flex justify-center">
            <UserButton />
          </div>
        </section>
      </main>
    );
  }
  if (!hasHydrated) {
    return (
      <div className="pt-7">
        {authContext.mode === "demo" && <DemoBanner />}
        <main className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6">
          <p role="status" className="text-center text-sm text-muted-foreground">
            Carregando perfil…
          </p>
        </main>
      </div>
    );
  }
  return (
    <div className="pt-7">
      {authContext.mode === "demo" && <DemoBanner />}
      <div className="flex">
        <Sidebar profile={effectiveProfile} />
        <div className="min-w-0 flex-1">
          <Topbar profile={effectiveProfile} profileLocked={isWorkshopMember} />
          <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
            <PageTransition>
              {allowed ? <Outlet /> : <AccessDenied profile={effectiveProfile} />}
            </PageTransition>
          </main>
        </div>
      </div>
      <MobileNav profile={effectiveProfile} />
    </div>
  );
}

function profileForWorkshopRole(role) {
  if (role === "attendant") return "atendente";
  if (role === "mechanic") return "mecanico";
  if (role === "finance") return "financeiro";
  return "gestor";
}
function AccessDenied({ profile }) {
  return (
    <div className="mx-auto grid max-w-lg justify-items-center rounded-2xl border border-border bg-card/70 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-warning/10 text-warning">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-bold">Acesso não permitido</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        O perfil atual não tem permissão para abrir este módulo.
      </p>
      <Link
        to={homePathFor(profile)}
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        Voltar aos módulos permitidos
      </Link>
    </div>
  );
}

function WorkshopAccessPending({ membershipStatus, membership }) {
  const copy = {
    none: {
      title: "Convite da oficina pendente",
      message:
        "Esta conta foi autenticada, mas ainda não foi vinculada a uma oficina. Peça ao responsável da oficina para concluir seu convite.",
    },
    multiple: {
      title: "Mais de uma oficina vinculada",
      message:
        "A seleção entre oficinas ainda não está disponível. Peça ao suporte do Torque para revisar os vínculos desta conta.",
    },
    active: {
      title: "Oficina vinculada",
      message: `Acesso confirmado${membership?.displayName ? ` para ${membership.displayName}` : ""}. Os dados desta oficina são carregados do PostgreSQL; a conta não usa registros de demonstração.`,
    },
    "database-unavailable": {
      title: "Não foi possível confirmar o acesso",
      message:
        "O Torque não conseguiu consultar o vínculo da oficina. Confira a conexão e tente novamente.",
    },
  };
  const { title, message } = copy[membershipStatus] ?? copy["database-unavailable"];

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-7 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Torque</p>
        <h1 className="mt-3 text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        {membershipStatus === "active" &&
          (membership?.role === "owner" || membership?.role === "manager") && (
            <>
              <TeamInviteForm role={membership.role} />
              <TeamManagement role={membership.role} />
            </>
          )}
        <div className="mt-6 flex items-center justify-center gap-3">
          {membershipStatus === "database-unavailable" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar novamente
            </button>
          )}
          <UserButton />
        </div>
      </section>
    </main>
  );
}
