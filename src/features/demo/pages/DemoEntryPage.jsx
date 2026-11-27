import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Wrench, Wallet, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/torque/Logo";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { PROFILES, usePrefs } from "@/stores/preferences.store";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useWorkshopStore } from "@/stores/workshop.store";
import { WORK_ORDER_STATUS_META } from "@/lib/work-order";
import { useMotionLevel } from "@/lib/motion";
const ICONS = {
  gestor: ShieldCheck,
  atendente: Headset,
  mecanico: Wrench,
  financeiro: Wallet,
};
export function DemoEntryPage() {
  const { profile, setProfile } = usePrefs();
  const motionLevel = useMotionLevel();
  const orders = useWorkshopStore((state) => state.workOrders);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const featuredOrders = ["in-progress", "awaiting-approval", "ready"]
    .map((status) => activeOrders.find((order) => order.status === status))
    .filter((order) => order !== undefined);
  return (
    <div className="relative min-h-screen overflow-hidden pt-7">
      <DemoBanner />
      <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative mx-auto flex max-w-6xl items-center px-6 py-6">
        <Logo />
      </header>
      <main className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <motion.div
          initial={
            motionLevel === "full"
              ? { opacity: 0, y: 24 }
              : motionLevel === "reduced"
                ? { opacity: 0 }
                : false
          }
          animate={
            motionLevel === "off"
              ? false
              : motionLevel === "full"
                ? { opacity: 1, y: 0 }
                : { opacity: 1 }
          }
          transition={{ duration: motionLevel === "full" ? 0.7 : 0.25, ease: EASE }}
        >
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Gestão para oficinas
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Do portão à entrega,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              cada carro sob controle.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            A ordem de serviço conecta entrada, diagnóstico, orçamento, execução, fotos e pagamento.
          </p>
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm font-semibold">Entrar como</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.keys(PROFILES).map((p) => {
                const Icon = ICONS[p];
                return (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    aria-pressed={profile === p}
                    className={cn(
                      "glass flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-all",
                      profile === p && "shadow-glow",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 text-muted-foreground",
                        profile === p && "text-primary",
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-bold">{PROFILES[p].label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {(PROFILES[profile] ?? PROFILES.gestor).hint}. Acesso demonstrativo por perfil, sem
              autenticação real.
            </p>
          </fieldset>
          <Button variant="glow" size="lg" className="mt-8" asChild>
            <Link to="/app">
              Entrar na demonstração <ArrowRight />
            </Link>
          </Button>
        </motion.div>
        <HeroStack orders={featuredOrders} vehicles={vehicles} motionLevel={motionLevel} />
      </main>
    </div>
  );
}
function HeroStack({ orders, vehicles, motionLevel }) {
  if (!orders.length) {
    return (
      <div className="relative hidden h-[440px] place-items-center lg:grid">
        <div className="glass max-w-sm rounded-3xl p-8 shadow-lift">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Wrench className="size-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-xl font-bold">Sua oficina começa vazia</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cadastre seus clientes e veículos para abrir a primeira ordem de serviço.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative hidden h-[440px] lg:block" style={{ perspective: 1200 }}>
      {orders.map((order, i) => {
        const vehicle = vehicles.find((item) => item.id === order.vehicleId);
        const status = WORK_ORDER_STATUS_META[order.status];
        return (
          <motion.div
            key={order.id}
            initial={
              motionLevel === "full"
                ? { opacity: 0, rotateX: 30, rotateY: -25, z: -200 }
                : motionLevel === "reduced"
                  ? { opacity: 0 }
                  : false
            }
            animate={
              motionLevel === "off"
                ? false
                : motionLevel === "full"
                  ? { opacity: 1, rotateX: 12, rotateY: -18, z: i * 70, y: [0, -8, 0] }
                  : { opacity: 1 }
            }
            transition={{
              delay: 0.2 + i * 0.15,
              duration: 0.9,
              ease: EASE,
              ...(motionLevel === "full"
                ? { y: { repeat: Infinity, duration: 5 + i, ease: "easeInOut" } }
                : {}),
            }}
            className="glass absolute w-80 rounded-2xl p-5 shadow-lift"
            style={{ left: 40 + i * 50, top: 40 + i * 100, transformStyle: "preserve-3d" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {order.code}
              </span>
              <Plate value={vehicle?.plate ?? "SEMPLACA"} size="sm" />
            </div>
            <p className="mt-3 font-bold">
              {vehicle ? `${vehicle.make} ${vehicle.model}` : "Veículo"}
            </p>
            <div className="mt-2">
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
