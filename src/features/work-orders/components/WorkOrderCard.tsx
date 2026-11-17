import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, UserRound } from "lucide-react";
import { GlassCard } from "@/components/torque/GlassCard";
import { Plate } from "@/components/torque/Plate";
import { StatusPill } from "@/components/torque/StatusPill";
import { formatBRL, formatDate } from "@/lib/format";
import { getWorkOrderTotal, WORK_ORDER_STATUS_META } from "@/lib/work-order";
import type { Customer } from "@/features/customers/types";
import type { Vehicle } from "@/features/vehicles/types";
import type { WorkOrder, WorkOrderStatus } from "@/features/work-orders/types";

export function WorkOrderCard({
  order,
  customer,
  vehicle,
  draggable = false,
  onDragStart,
}: {
  order: WorkOrder;
  customer: Customer | undefined;
  vehicle: Vehicle | undefined;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLElement>, id: string) => void;
}) {
  const status = WORK_ORDER_STATUS_META[order.status as WorkOrderStatus];
  const isLate =
    new Date(order.expectedAt).getTime() < Date.now() &&
    !["delivered", "cancelled", "ready"].includes(order.status);

  return (
    <Link
      to="/app/ordens/$id"
      params={{ id: order.id }}
      draggable={draggable}
      onDragStart={(event) => onDragStart?.(event, order.id)}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GlassCard className="group p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-xs font-bold text-muted-foreground">{order.code}</span>
          <Plate value={vehicle?.plate ?? "SEM PLACA"} size="sm" />
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-bold">
              {vehicle ? `${vehicle.make} ${vehicle.model}` : "Veículo não encontrado"}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {customer?.name ?? "Cliente não encontrado"}
            </p>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
            aria-hidden
          />
        </div>
        <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-5 text-muted-foreground">
          {order.complaint}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {order.priority === "urgent" && <StatusPill tone="danger">Prioridade</StatusPill>}
          {isLate && <StatusPill tone="warning">Atrasada</StatusPill>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5" aria-hidden />
            {order.mechanic.split(" ")[0]}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" aria-hidden />
            {formatDate(order.expectedAt)}
          </span>
          <span className="font-mono font-semibold text-foreground">
            {formatBRL(getWorkOrderTotal(order))}
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
