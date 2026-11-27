export const WORK_ORDER_STATUS_META = {
  intake: { label: "Entrada", tone: "primary" },
  diagnosis: { label: "Diagnóstico", tone: "info" },
  "awaiting-approval": { label: "Aguardando aprovação", tone: "warning" },
  "waiting-parts": { label: "Aguardando peça", tone: "neutral" },
  "in-progress": { label: "Em execução", tone: "info" },
  ready: { label: "Pronto para retirada", tone: "success" },
  delivered: { label: "Entregue", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
};
export const APPROVAL_LABEL = {
  "not-sent": "Não enviado",
  pending: "Aguardando retorno",
  approved: "Aprovado",
  partial: "Aprovado parcialmente",
  rejected: "Recusado",
};
export function getWorkOrderTotal(order) {
  const labor = order.services
    .filter((service) => service.approval !== "rejected")
    .reduce((sum, service) => sum + service.laborPrice, 0);
  const parts = order.parts
    .filter((part) => part.approval !== "rejected")
    .reduce((sum, part) => sum + part.quantity * part.unitPrice, 0);
  return labor + parts;
}
export function getApprovedWorkOrderTotal(order) {
  const labor = order.services
    .filter((service) => service.approval === "approved")
    .reduce((sum, service) => sum + service.laborPrice, 0);
  const parts = order.parts
    .filter((part) => part.approval === "approved")
    .reduce((sum, part) => sum + part.quantity * part.unitPrice, 0);
  return labor + parts;
}
export function getOpenWorkOrderCount(orders) {
  return orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled")
    .length;
}

const WORK_ORDER_TRANSITIONS = {
  intake: ["diagnosis", "cancelled"],
  diagnosis: ["awaiting-approval", "cancelled"],
  "awaiting-approval": ["cancelled"],
  "waiting-parts": ["in-progress", "cancelled"],
  "in-progress": ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function getWorkOrderTransitionError(order, targetStatus, inventory = []) {
  if (!order) return "Ordem de serviço não encontrada.";
  if (order.status === targetStatus) return "A ordem já está nesta etapa.";
  if (!WORK_ORDER_TRANSITIONS[order.status]?.includes(targetStatus)) {
    return "Esta mudança de etapa não é permitida para a ordem.";
  }

  const quoteItems = [...(order.services ?? []), ...(order.parts ?? [])];
  if (targetStatus === "awaiting-approval" && quoteItems.length === 0) {
    return "Adicione ao menos um serviço ou uma peça antes de enviar o orçamento.";
  }
  if (targetStatus === "in-progress") {
    const approvedParts = (order.parts ?? []).filter((part) => part.approval === "approved");
    const shortage = approvedParts.find(
      (usage) =>
        !usage.installed &&
        (inventory.find((part) => part.id === usage.partId)?.quantity ?? 0) < usage.quantity,
    );
    if (shortage) return `Estoque insuficiente para ${shortage.name}.`;
    if (!quoteItems.some((item) => item.approval === "approved")) {
      return "A OS precisa ter ao menos um item aprovado para iniciar a execução.";
    }
  }
  if (targetStatus === "ready") {
    const pendingItems = quoteItems.filter((item) => item.approval === "pending");
    if (pendingItems.length)
      return "Aguarde a decisão do cliente sobre todos os itens do orçamento.";
    const approvedServices = (order.services ?? []).filter(
      (service) => service.approval === "approved",
    );
    const approvedParts = (order.parts ?? []).filter((part) => part.approval === "approved");
    if (!approvedServices.length && !approvedParts.length) {
      return "A OS precisa ter ao menos um serviço ou peça aprovado.";
    }
    if (approvedServices.some((service) => service.status !== "done")) {
      return "Conclua todos os serviços aprovados antes de liberar o veículo.";
    }
    if (approvedParts.some((part) => !part.installed)) {
      return "Registre a aplicação de todas as peças aprovadas antes de liberar o veículo.";
    }
    if ((order.entryChecklist ?? []).some((item) => !item.checked)) {
      return "Conclua o checklist de entrada antes de liberar o veículo.";
    }
  }
  if (targetStatus === "delivered" && (order.exitChecklist ?? []).some((item) => !item.checked)) {
    return "Conclua cada item do checklist de saída antes de registrar a entrega.";
  }

  return null;
}
