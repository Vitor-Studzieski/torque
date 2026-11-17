import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Car, Hourglass, Wallet, CircleDollarSign } from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { KpiCard } from "@/components/torque/KpiCard";
import { TiltCard } from "@/components/torque/TiltCard";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { SkeletonCard } from "@/components/torque/SkeletonCard";
import { SimulatedBadge } from "@/components/torque/SimulatedBadge";
import { GlassCard } from "@/components/torque/GlassCard";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { simulate } from "@/lib/simulated";
import { usePrefs, PROFILES } from "@/lib/prefs";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [
    { title: "Visão geral — Torque" }, { name: "description", content: "Indicadores e veículos na oficina agora." },
    { property: "og:title", content: "Visão geral — Torque" }, { property: "og:description", content: "Indicadores e veículos na oficina agora." },
  ] }),
  component: Overview,
});

const PREVIEW = [
  { os: "OS-1042", plate: "BRA2E19", car: "Onix 1.0 LT", step: "Em execução", tone: "info" as const },
  { os: "OS-1039", plate: "RIO4F21", car: "HB20 Comfort", step: "Aguardando aprovação", tone: "warning" as const },
  { os: "OS-1035", plate: "SPX7B33", car: "Corolla XEi", step: "Pronto para retirada", tone: "success" as const },
];

function Overview() {
  const profile = usePrefs((s) => s.profile);
  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Perfil ${PROFILES[profile].label} · prévia do sistema visual (os números reais chegam na Fase 2)`}
        actions={<Button variant="glass" onClick={() => simulate("Orçamento enviado por WhatsApp")}>Enviar orçamento <SimulatedBadge /></Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="OS abertas" value={14} icon={ClipboardList} spark={[6, 8, 7, 10, 9, 12, 14]} />
        <KpiCard label="Na oficina" value={9} icon={Car} spark={[5, 7, 6, 8, 9, 8, 9]} />
        <KpiCard label="Aprovações" value={3} icon={Hourglass} spark={[1, 2, 4, 3, 2, 4, 3]} />
        <KpiCard label="Recebido" value={18430} icon={Wallet} format={formatBRL} spark={[8, 11, 9, 14, 13, 16, 18]} />
        <KpiCard label="A receber" value={6215.5} icon={CircleDollarSign} format={formatBRL} spark={[4, 5, 7, 6, 8, 7, 6]} />
      </div>
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">Veículos na oficina agora</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PREVIEW.map((v) => (
          <TiltCard key={v.os} className="p-5">
            <div className="flex items-start justify-between">
              <span className="font-mono text-xs font-bold text-muted-foreground">{v.os}</span>
              <Plate value={v.plate} size="sm" />
            </div>
            <p className="mt-4 text-lg font-bold">{v.car}</p>
            <div className="mt-3"><StatusPill tone={v.tone}>{v.step}</StatusPill></div>
          </TiltCard>
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-5">
          <h3 className="mb-3 font-bold">Estados de status</h3>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="success">Entregue</StatusPill><StatusPill tone="warning">Atrasada</StatusPill>
            <StatusPill tone="danger">Cancelada</StatusPill><StatusPill tone="info">Diagnóstico</StatusPill>
            <StatusPill tone="primary">Entrada</StatusPill><StatusPill tone="neutral">Aguardando peça</StatusPill>
          </div>
        </GlassCard>
        <SkeletonCard lines={4} />
      </div>
    </>
  );
}
