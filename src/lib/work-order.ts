import type { Tone } from "@/components/torque/StatusPill";
import type { ApprovalStatus, WorkOrder, WorkOrderStatus } from "@/features/work-orders/types";

export const WORK_ORDER_STATUS_META: Record<WorkOrderStatus, { label: string; tone: Tone }> = {
  intake: { label: "Entrada", tone: "primary" },
  diagnosis: { label: "Diagnóstico", tone: "info" },
  "awaiting-approval": { label: "Aguardando aprovação", tone: "warning" },
  "waiting-parts": { label: "Aguardando peça", tone: "neutral" },
  "in-progress": { label: "Em execução", tone: "info" },
  ready: { label: "Pronto para retirada", tone: "success" },
  delivered: { label: "Entregue", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  "not-sent": "Não enviado",
  pending: "Aguardando retorno",
  approved: "Aprovado",
  partial: "Aprovado parcialmente",
  rejected: "Recusado",
};

export function getWorkOrderTotal(order: Pick<WorkOrder, "services" | "parts">) {
  const labor = order.services
    .filter((service) => service.approval !== "rejected")
    .reduce((sum, service) => sum + service.laborPrice, 0);
  const parts = order.parts
    .filter((part) => part.approval !== "rejected")
    .reduce((sum, part) => sum + part.quantity * part.unitPrice, 0);
  return labor + parts;
}

export function getOpenWorkOrderCount(orders: WorkOrder[]) {
  return orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled")
    .length;
}
