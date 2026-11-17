import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Wrench, Wallet, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/torque/Logo";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { PROFILES, usePrefs, type Profile } from "@/lib/prefs";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Torque — A oficina inteira na ordem de serviço" },
    { name: "description", content: "Demonstração do Torque: OS, clientes, veículos, financeiro e estoque para oficinas mecânicas." },
    { property: "og:title", content: "Torque — A oficina inteira na ordem de serviço" },
    { property: "og:description", content: "Demonstração do Torque: OS, clientes, veículos, financeiro e estoque para oficinas mecânicas." },
  ] }),
  component: Entry,
});

const ICONS: Record<Profile, typeof Wrench> = { gestor: ShieldCheck, atendente: Headset, mecanico: Wrench, financeiro: Wallet };

function Entry() {
  const { profile, setProfile } = usePrefs();
  return (
    <div className="relative min-h-screen overflow-hidden pt-7">
      <DemoBanner />
      <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative mx-auto flex max-w-6xl items-center px-6 py-6"><Logo /></header>
      <main className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">Gestão para oficinas</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Do portão à entrega, <span className="bg-gradient-primary bg-clip-text text-transparent">cada carro sob controle.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">A ordem de serviço conecta entrada, diagnóstico, orçamento, execução, fotos e pagamento.</p>
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm font-semibold">Entrar como</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PROFILES) as Profile[]).map((p) => {
                const Icon = ICONS[p];
                return (
                  <button key={p} onClick={() => setProfile(p)} aria-pressed={profile === p}
                    className={cn("glass flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-all", profile === p && "shadow-glow")}>
                    <Icon className={cn("size-5 text-muted-foreground", profile === p && "text-primary")} aria-hidden />
                    <span className="text-sm font-bold">{PROFILES[p].label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{PROFILES[profile].hint}. O perfil só muda a visão, sem permissões reais.</p>
          </fieldset>
          <Button variant="glow" size="lg" className="mt-8" asChild>
            <Link to="/app">Entrar na demonstração <ArrowRight /></Link>
          </Button>
        </motion.div>
        <HeroStack />
      </main>
    </div>
  );
}

/** Interim CSS-3D hero; the lazy Three.js scene replaces it in Phase 2. */
function HeroStack() {
  const cards = [
    { os: "OS-1042", plate: "BRA2E19", car: "Onix 1.0 LT", s: "Em execução", t: "info" as const },
    { os: "OS-1039", plate: "RIO4F21", car: "HB20 Comfort", s: "Aguardando aprovação", t: "warning" as const },
    { os: "OS-1035", plate: "SPX7B33", car: "Corolla XEi", s: "Pronto para retirada", t: "success" as const },
  ];
  return (
    <div className="relative hidden h-[440px] lg:block" style={{ perspective: 1200 }}>
      {cards.map((c, i) => (
        <motion.div key={c.os}
          initial={{ opacity: 0, rotateX: 30, rotateY: -25, z: -200 }}
          animate={{ opacity: 1, rotateX: 12, rotateY: -18, z: i * 70, y: [0, -8, 0] }}
          transition={{ delay: 0.2 + i * 0.15, duration: 0.9, ease: EASE, y: { repeat: Infinity, duration: 5 + i, ease: "easeInOut" } }}
          className="glass absolute w-80 rounded-2xl p-5 shadow-lift"
          style={{ left: 40 + i * 50, top: 40 + i * 100, transformStyle: "preserve-3d" }}
        >
          <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-muted-foreground">{c.os}</span><Plate value={c.plate} size="sm" /></div>
          <p className="mt-3 font-bold">{c.car}</p>
          <div className="mt-2"><StatusPill tone={c.t}>{c.s}</StatusPill></div>
        </motion.div>
      ))}
    </div>
  );
}
