import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/torque/PageHeader";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/torque/GlassCard";
import { CreateWorkOrderDialog } from "@/features/work-orders/components/CreateWorkOrderDialog";
import { WorkOrderCard } from "@/features/work-orders/components/WorkOrderCard";
import { useWorkshopStore } from "@/stores/workshop.store";
import {
  getWorkOrderTotal,
  getWorkOrderTransitionError,
  WORK_ORDER_STATUS_META,
} from "@/lib/work-order";
import { formatBRL, formatDate } from "@/lib/format";
import { usePrefs } from "@/stores/preferences.store";
import { canMoveWorkOrder, hasPermission } from "@/lib/permissions";
const BOARD_STATUSES = [
  "intake",
  "diagnosis",
  "awaiting-approval",
  "waiting-parts",
  "in-progress",
  "ready",
  "delivered",
  "cancelled",
];
const selectClass =
  "h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function WorkOrdersPage() {
  const navigate = useNavigate();
  const profile = usePrefs((state) => state.profile);
  const canCreate = hasPermission(profile, "createWorkOrder");
  const canViewPrices = hasPermission(profile, "viewWorkOrderPrices");
  const customers = useWorkshopStore((state) => state.customers);
  const vehicles = useWorkshopStore((state) => state.vehicles);
  const workOrders = useWorkshopStore((state) => state.workOrders);
  const inventory = useWorkshopStore((state) => state.parts);
  const createWorkOrder = useWorkshopStore((state) => state.createWorkOrder);
  const setWorkOrderStatus = useWorkshopStore((state) => state.setWorkOrderStatus);
  const [view, setView] = useState("board");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return workOrders.filter((order) => {
      const customer = customers.find((item) => item.id === order.customerId);
      const vehicle = vehicles.find((item) => item.id === order.vehicleId);
      const matchesStatus = filter === "all" || order.status === filter;
      const matchesSearch =
        !query ||
        [
          order.code,
          order.complaint,
          customer?.name,
          vehicle?.plate,
          vehicle?.model,
          vehicle?.make,
        ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [customers, filter, search, vehicles, workOrders]);
  const openCount = workOrders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status),
  ).length;
  const approvalsCount = workOrders.filter((order) => order.status === "awaiting-approval").length;
  const overdueCount = workOrders.filter(
    (order) =>
      new Date(order.expectedAt).getTime() < Date.now() &&
      !["delivered", "cancelled", "ready"].includes(order.status),
  ).length;
  function handleCreate(input) {
    if (!canCreate) return;
    const order = createWorkOrder(input);
    setCreateOpen(false);
    toast.success(`${order.code} criada`, {
      description: "O veículo já aparece na etapa de entrada.",
    });
    void navigate({ to: "/app/ordens/$id", params: { id: order.id } });
  }
  function dropOnStatus(status, event) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData("text/work-order") || draggedId;
    if (!orderId) return;
    if (status === "cancelled") {
      toast.info("Cancele a OS pela tela de detalhes para confirmar a ação.");
      setDraggedId(null);
      return;
    }
    const order = workOrders.find((item) => item.id === orderId);
    if (!order) return;
    const transitionError = getWorkOrderTransitionError(order, status, inventory);
    if (!canMoveWorkOrder(profile, order.status, status, order, inventory)) {
      toast.error(transitionError ?? "Seu perfil não pode alterar esta etapa.");
      setDraggedId(null);
      return;
    }
    const result = setWorkOrderStatus(orderId, status, profile);
    if (!result?.ok) {
      toast.error(result?.error ?? "Não foi possível atualizar a etapa da OS.");
      return;
    }
    setDraggedId(null);
    toast.success("Etapa da OS atualizada", { description: WORK_ORDER_STATUS_META[status].label });
  }
  return (
    <>
      <PageHeader
        title="Ordens de serviço"
        description="Acompanhe cada veículo da entrada à entrega."
        actions={
          <>
            <div
              className="inline-flex rounded-xl border border-border bg-muted p-1"
              role="group"
              aria-label="Formato da visualização"
            >
              <button
                onClick={() => setView("board")}
                aria-pressed={view === "board"}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "board" ? "bg-background text-foreground shadow-card" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="size-4" aria-hidden /> Quadro
              </button>
              <button
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "list" ? "bg-background text-foreground shadow-card" : "text-muted-foreground"}`}
              >
                <List className="size-4" aria-hidden /> Lista
              </button>
            </div>
            {canCreate && (
              <Button variant="glow" onClick={() => setCreateOpen(true)}>
                <Plus /> Nova OS
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="OS em andamento" value={String(openCount).padStart(2, "0")} />
        <Metric label="Aguardando aprovação" value={String(approvalsCount).padStart(2, "0")} />
        <Metric
          label="Com prazo vencido"
          value={String(overdueCount).padStart(2, "0")}
          warning={overdueCount > 0}
        />
        <Metric label="Total de registros" value={String(workOrders.length).padStart(2, "0")} />
      </div>

      <GlassCard className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por OS, placa ou cliente"
            aria-label="Buscar ordens de serviço"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="sr-only">Filtrar por etapa</span>
          <select
            className={selectClass}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">Todas as etapas</option>
            {BOARD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {WORK_ORDER_STATUS_META[status].label}
              </option>
            ))}
          </select>
        </label>
      </GlassCard>

      {view === "board" ? (
        <div className="grid auto-cols-[minmax(245px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-4">
          {BOARD_STATUSES.map((status) => {
            const orders = filteredOrders.filter((order) => order.status === status);
            const meta = WORK_ORDER_STATUS_META[status];
            return (
              <section
                key={status}
                aria-label={`${meta.label}, ${orders.length} ordens`}
                className="min-h-[440px] rounded-2xl border border-border bg-muted/35 p-2.5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropOnStatus(status, event)}
              >
                <header className="mb-3 flex items-center justify-between gap-2 px-1 py-1">
                  <h2 className="text-sm font-bold">{meta.label}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {orders.length}
                  </span>
                </header>
                <div className="space-y-2.5">
                  {orders.map((order) => (
                    <WorkOrderCard
                      key={order.id}
                      order={order}
                      customer={customers.find((item) => item.id === order.customerId)}
                      vehicle={vehicles.find((item) => item.id === order.vehicleId)}
                      draggable={BOARD_STATUSES.some(
                        (target) =>
                          target !== "cancelled" &&
                          canMoveWorkOrder(profile, order.status, target, order, inventory),
                      )}
                      showFinancials={canViewPrices}
                      onDragStart={(event, id) => {
                        setDraggedId(id);
                        event.dataTransfer.setData("text/work-order", id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    />
                  ))}
                  {orders.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                      Arraste uma OS para cá ou ajuste os filtros.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="border-b border-border bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">OS / veículo</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Etapa</th>
                  <th className="px-4 py-3 font-semibold">Responsável</th>
                  <th className="px-4 py-3 font-semibold">Previsão</th>
                  {canViewPrices && <th className="px-4 py-3 text-right font-semibold">Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const customer = customers.find((item) => item.id === order.customerId);
                  const vehicle = vehicles.find((item) => item.id === order.vehicleId);
                  const status = WORK_ORDER_STATUS_META[order.status];
                  return (
                    <tr key={order.id} className="transition hover:bg-accent/45">
                      <td className="px-4 py-3">
                        <LinkWorkOrder
                          id={order.id}
                          plate={vehicle?.plate ?? "SEM PLACA"}
                          code={order.code}
                          vehicle={`${vehicle?.make ?? ""} ${vehicle?.model ?? ""}`}
                        />
                      </td>
                      <td className="px-4 py-3">{customer?.name ?? "Cliente não encontrado"}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{order.mechanic}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(order.expectedAt)}
                      </td>
                      {canViewPrices && (
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {formatBRL(getWorkOrderTotal(order))}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Nenhuma OS encontrada. Ajuste a busca ou crie uma nova ordem.
            </p>
          )}
        </GlassCard>
      )}

      <CreateWorkOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        customers={customers}
        vehicles={vehicles}
        onCreate={handleCreate}
      />
    </>
  );
}
function LinkWorkOrder({ id, plate, code, vehicle }) {
  return (
    <Link
      to="/app/ordens/$id"
      params={{ id }}
      className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Plate value={plate} size="sm" />
      <span>
        <strong className="block font-mono text-xs">{code}</strong>
        <span className="text-xs text-muted-foreground">{vehicle}</span>
      </span>
    </Link>
  );
}
function Metric({ label, value, warning = false }) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <strong className="font-mono text-2xl">{value}</strong>
        {warning && <StatusPill tone="warning">Revisar</StatusPill>}
      </div>
    </GlassCard>
  );
}
