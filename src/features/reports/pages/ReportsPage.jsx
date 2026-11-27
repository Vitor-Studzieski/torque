import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Car, CircleDollarSign, ClipboardList, Download, Users } from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { GlassCard } from "@/components/torque/GlassCard";
import { useWorkshopStore } from "@/stores/workshop.store";
import { formatBRL } from "@/lib/format";
import { getApprovedWorkOrderTotal, WORK_ORDER_STATUS_META } from "@/lib/work-order";
import { Button } from "@/components/ui/button";
const palette = [
  "var(--primary)",
  "var(--success)",
  "var(--info)",
  "var(--warning)",
  "var(--danger)",
  "#7c8a9b",
  "#b16ff0",
  "#34c6bd",
];
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
};
function dateForExport(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
}
function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function ReportsPage() {
  const orders = useWorkshopStore((state) => state.workOrders);
  const finance = useWorkshopStore((state) => state.financeEntries);
  const customers = useWorkshopStore((state) => state.customers);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const [period, setPeriod] = useState(30);
  const analytics = useMemo(() => {
    const now = Date.now();
    const since = now - period * 86_400_000;
    const scopedOrders = orders.filter((order) => {
      const openedAt = new Date(order.openedAt).getTime();
      return openedAt >= since && openedAt <= now;
    });
    const scopedFinance = finance.filter((entry) => {
      const dueAt = new Date(entry.dueDate).getTime();
      return dueAt >= since && dueAt <= now;
    });
    const statusRows = Object.entries(WORK_ORDER_STATUS_META).map(([status, meta]) => ({
      status,
      name: meta.label,
      total: scopedOrders.filter((order) => order.status === status).length,
    }));
    const serviceCounts = new Map();
    for (const order of scopedOrders)
      for (const service of order.services.filter(
        (item) => item.approval === "approved" && item.status === "done",
      ))
        serviceCounts.set(service.name, (serviceCounts.get(service.name) ?? 0) + 1);
    const services = [...serviceCounts]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    const mechanicCounts = new Map();
    for (const order of scopedOrders) {
      if (order.status === "cancelled") continue;
      const item = mechanicCounts.get(order.mechanic) ?? { done: 0, active: 0 };
      if (order.status === "delivered") item.done += 1;
      else if (!["cancelled"].includes(order.status)) item.active += 1;
      mechanicCounts.set(order.mechanic, item);
    }
    const mechanics = [...mechanicCounts].map(([name, data]) => ({
      name: name.split(" ")[0],
      ...data,
    }));
    const bucketCount = Math.min(period, 12);
    const bucketDays = period / bucketCount;
    const revenue = Array.from({ length: bucketCount }, (_, index) => {
      const end = Date.now() - (bucketCount - index - 1) * bucketDays * 86_400_000;
      const start = end - bucketDays * 86_400_000;
      const day = new Date(end);
      const key = day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const daily = scopedFinance.filter((entry) => {
        const dueAt = new Date(entry.dueDate).getTime();
        return dueAt >= start && dueAt < end;
      });
      return {
        day: key,
        entradas: daily
          .filter((entry) => entry.type === "receivable")
          .reduce((sum, entry) => sum + entry.amount, 0),
        saídas: daily
          .filter((entry) => entry.type === "payable")
          .reduce((sum, entry) => sum + entry.amount, 0),
      };
    });
    const received = finance
      .filter((entry) => {
        const paidAt = entry.paidAt ? new Date(entry.paidAt).getTime() : NaN;
        return (
          entry.type === "receivable" && entry.status === "paid" && paidAt >= since && paidAt <= now
        );
      })
      .reduce((sum, entry) => sum + entry.amount, 0);
    const vehicleCount = new Set(scopedOrders.map((order) => order.vehicleId)).size;
    return { scopedOrders, statusRows, services, mechanics, revenue, received, vehicleCount };
  }, [finance, orders, period]);
  function exportCsv() {
    const now = Date.now();
    const since = now - period * 86_400_000;
    const scopedOrders = orders.filter((order) => {
      const openedAt = new Date(order.openedAt).getTime();
      return openedAt >= since && openedAt <= now;
    });
    const scopedFinance = finance.filter((entry) => {
      const dueAt = new Date(entry.dueDate).getTime();
      return dueAt >= since && dueAt <= now;
    });
    const rows = [
      ["Registro", "Código", "Data", "Situação", "Cliente", "Veículo", "Descrição", "Valor (R$)"],
      ...scopedOrders.map((order) => {
        const customer = customers.find((item) => item.id === order.customerId);
        const vehicle = vehicles.find((item) => item.id === order.vehicleId);
        return [
          "Ordem de serviço",
          order.code,
          dateForExport(order.openedAt),
          WORK_ORDER_STATUS_META[order.status]?.label ?? order.status,
          customer?.name ?? "",
          vehicle ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}` : "",
          order.complaint,
          getApprovedWorkOrderTotal(order).toFixed(2).replace(".", ","),
        ];
      }),
      ...scopedFinance.map((entry) => [
        entry.type === "receivable" ? "Conta a receber" : "Conta a pagar",
        entry.id,
        dateForExport(entry.dueDate),
        entry.status === "paid" ? "Pago" : entry.status === "overdue" ? "Vencido" : "Em aberto",
        "",
        "",
        entry.description,
        Number(entry.amount).toFixed(2).replace(".", ","),
      ]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `torque-relatorio-${period}-dias-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Indicadores operacionais calculados pelas ordens e lançamentos da demonstração."
        actions={
          <>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
              <CalendarDays className="size-4 text-primary" />
              <span className="sr-only">Período</span>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="bg-transparent font-semibold outline-none"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
                <option value={365}>Últimos 12 meses</option>
              </select>
            </label>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Baixar CSV
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          icon={ClipboardList}
          label="OS no período"
          value={analytics.scopedOrders.length.toString()}
        />
        <Metric icon={Car} label="Veículos atendidos" value={analytics.vehicleCount.toString()} />
        <Metric icon={CircleDollarSign} label="Recebido" value={formatBRL(analytics.received)} />
        <Metric
          icon={Users}
          label="Mecânicos ativos"
          value={analytics.mechanics.length.toString()}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-5">
          <ChartHeading
            title="Ordens por etapa"
            note={`Distribuição das ${analytics.scopedOrders.length} OS no período`}
          />
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusRows.filter((item) => item.total > 0)}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {analytics.statusRows.map((row, index) => (
                    <Cell key={row.status} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} OS`, "Ordens"]}
                />
                <Legend verticalAlign="bottom" height={38} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <ChartHeading
            title="Entradas e saídas"
            note="Valores por vencimento no período selecionado · R$"
          />
          <div className="h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenue} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatBRL(Number(value)), ""]}
                />
                <Legend />
                <Bar dataKey="entradas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saídas" fill="var(--warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <ChartHeading
            title="Serviços mais realizados"
            note="Itens de mão de obra registrados nas OS"
          />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.services}
                layout="vertical"
                margin={{ top: 8, right: 14, left: 12, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Serviços" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <ChartHeading
            title="Produtividade por responsável"
            note="OS concluídas e em andamento · valores estimados"
          />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.mechanics}
                margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="done" name="Concluídas" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="active"
                  name="Em andamento"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Relatório demonstrativo. Valores agregados respeitam o período selecionado e não substituem
        a apuração contábil.
      </p>
    </>
  );
}
function ChartHeading({ title, note }) {
  return (
    <div className="mb-2">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
function Metric({ icon: Icon, label, value }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 font-mono text-xl font-bold">{value}</p>
    </GlassCard>
  );
}
