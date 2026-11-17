import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Car,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Hourglass,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { KpiCard } from "@/components/torque/KpiCard";
import { TiltCard } from "@/components/torque/TiltCard";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { GlassCard } from "@/components/torque/GlassCard";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDate } from "@/lib/format";
import { WORK_ORDER_STATUS_META } from "@/lib/work-order";
import { PROFILES, usePrefs } from "@/stores/preferences.store";
import { useWorkshopStore } from "@/stores/workshop.store";

export function DashboardPage() {
  const navigate = useNavigate();
  const profile = usePrefs((state) => state.profile);
  const orders = useWorkshopStore((state) => state.workOrders);
  const customers = useWorkshopStore((state) => state.customers);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const finance = useWorkshopStore((state) => state.financeEntries);
  const [period, setPeriod] = useState(30);
  const metrics = useMemo(() => {
    const cutoff = Date.now() - period * 86_400_000;
    const inPeriod = finance.filter((entry) => new Date(entry.dueDate).getTime() >= cutoff);
    const activeOrders = orders.filter(
      (order) => !["delivered", "cancelled"].includes(order.status),
    );
    const received = finance
      .filter(
        (entry) =>
          entry.type === "receivable" &&
          entry.status === "paid" &&
          entry.paidAt &&
          new Date(entry.paidAt).getTime() >= cutoff,
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    const toReceive = inPeriod
      .filter((entry) => entry.type === "receivable" && entry.status !== "paid")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const approvalCount = orders.filter((order) => order.status === "awaiting-approval").length;
    const now = new Date();
    const spark = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - index));
      return orders.filter(
        (order) => new Date(order.openedAt).toDateString() === day.toDateString(),
      ).length;
    });
    const funnel = Object.entries(WORK_ORDER_STATUS_META).map(([status, meta]) => ({
      status: meta.label,
      total: orders.filter((order) => order.status === status).length,
    }));
    const active = activeOrders
      .slice()
      .sort((a, b) => a.expectedAt.localeCompare(b.expectedAt))
      .slice(0, 4);
    const overdue = activeOrders.filter(
      (order) => new Date(order.expectedAt).getTime() < Date.now() && order.status !== "ready",
    );
    const approvals = orders.filter((order) => order.status === "awaiting-approval");
    const ready = orders.filter((order) => order.status === "ready");
    const recent = orders
      .flatMap((order) =>
        order.timeline.map((event) => ({ ...event, orderCode: order.code, orderId: order.id })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
    return {
      activeOrders,
      vehiclesInShop: new Set(activeOrders.map((order) => order.vehicleId)).size,
      received,
      toReceive,
      approvalCount,
      spark,
      funnel,
      active,
      overdue,
      approvals,
      ready,
      recent,
    };
  }, [finance, orders, period]);

  function simulatedQuote() {
    const target =
      metrics.approvals[0] ?? orders.find((order) => order.status === "diagnosis") ?? orders[0];
    if (target) void navigate({ to: "/app/ordens/$id", params: { id: target.id } });
  }

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`${PROFILES[profile].hint} · indicadores vinculados aos dados de demonstração`}
        actions={
          <>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
              <Clock3 className="size-4 text-primary" />
              <span className="sr-only">Período dos indicadores financeiros</span>
              <select
                className="bg-transparent font-semibold outline-none"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </label>
            <Button variant="glass" onClick={simulatedQuote}>
              Abrir orçamento{" "}
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                Simulado
              </span>
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard
          label="OS abertas"
          value={metrics.activeOrders.length}
          icon={ClipboardList}
          spark={metrics.spark}
          hint="Entradas não encerradas"
        />
        <KpiCard
          label="Na oficina"
          value={metrics.vehiclesInShop}
          icon={Car}
          spark={metrics.spark}
          hint="Veículos em atendimento"
        />
        <KpiCard
          label="Aprovações"
          value={metrics.approvalCount}
          icon={Hourglass}
          spark={metrics.spark}
          hint="Aguardando resposta"
        />
        <KpiCard
          label="Recebido no período"
          value={metrics.received}
          icon={Wallet}
          format={formatBRL}
          spark={metrics.spark}
          hint={`Últimos ${period} dias`}
        />
        <KpiCard
          label="A receber"
          value={metrics.toReceive}
          icon={CircleDollarSign}
          format={formatBRL}
          spark={metrics.spark}
          hint={`Últimos ${period} dias`}
        />
      </div>
      <div className="mt-7 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <GlassCard className="p-5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-bold">Fluxo de ordens</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Distribuição atual por etapa · {orders.length} registros
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/ordens">
                Ver quadro <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.funnel} margin={{ top: 12, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="status"
                  interval={0}
                  angle={-22}
                  textAnchor="end"
                  height={55}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="total" name="Ordens" fill="var(--primary)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Pendências do dia</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ações que pedem acompanhamento</p>
            </div>
            <StatusPill tone={metrics.overdue.length ? "warning" : "success"}>
              {metrics.overdue.length + metrics.approvals.length + metrics.ready.length} itens
            </StatusPill>
          </div>
          <div className="space-y-2">
            {[
              ...metrics.overdue.map((order) => ({
                order,
                label: "Prazo vencido",
                tone: "danger" as const,
              })),
              ...metrics.approvals.map((order) => ({
                order,
                label: "Aguardando aprovação",
                tone: "warning" as const,
              })),
              ...metrics.ready.map((order) => ({
                order,
                label: "Pronto para retirada",
                tone: "success" as const,
              })),
            ]
              .slice(0, 5)
              .map(({ order, label, tone }) => {
                const vehicle = vehicles.find((item) => item.id === order.vehicleId);
                const customer = customers.find((item) => item.id === order.customerId);
                return (
                  <Link
                    key={`${order.id}-${label}`}
                    to="/app/ordens/$id"
                    params={{ id: order.id }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition hover:border-primary/30 hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Plate value={vehicle?.plate ?? "SEMPLACA"} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {customer?.name ?? order.code}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {order.code} · {formatDate(order.expectedAt)}
                        </p>
                      </div>
                    </div>
                    <StatusPill tone={tone}>{label}</StatusPill>
                  </Link>
                );
              })}
            {metrics.overdue.length + metrics.approvals.length + metrics.ready.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma pendência por enquanto.
              </p>
            )}
          </div>
        </GlassCard>
      </div>
      <div className="mt-7 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Veículos na oficina agora
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/ordens">
                Todas as OS <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {metrics.active.map((order) => {
              const vehicle = vehicles.find((item) => item.id === order.vehicleId);
              const customer = customers.find((item) => item.id === order.customerId);
              const meta = WORK_ORDER_STATUS_META[order.status];
              return (
                <Link key={order.id} to="/app/ordens/$id" params={{ id: order.id }}>
                  <TiltCard className="h-full p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {order.code}
                      </span>
                      <Plate value={vehicle?.plate ?? "SEMPLACA"} size="sm" />
                    </div>
                    <p className="mt-3 font-bold">
                      {vehicle?.make} {vehicle?.model}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{customer?.name}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      <span className="text-xs text-muted-foreground">
                        Prev. {formatDate(order.expectedAt)}
                      </span>
                    </div>
                  </TiltCard>
                </Link>
              );
            })}
          </div>
        </div>
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Atividade recente</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizações das ordens de serviço
              </p>
            </div>
            <Button asChild variant="ghost" size="icon">
              <Link to="/app/ordens" aria-label="Abrir ordens de serviço">
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <ol className="space-y-4">
            {metrics.recent.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {event.title}{" "}
                    <Link
                      to="/app/ordens/$id"
                      params={{ id: event.orderId }}
                      className="font-mono text-primary hover:underline"
                    >
                      {event.orderCode}
                    </Link>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{event.detail}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {event.actor} · {formatDate(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </GlassCard>
      </div>
    </>
  );
}
