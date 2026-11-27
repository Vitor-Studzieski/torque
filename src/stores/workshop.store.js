import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ENTRY_CHECKLIST_LABELS, EXIT_CHECKLIST_LABELS } from "@/data/work-order-checklists";
import { getApprovedWorkOrderTotal, getWorkOrderTransitionError } from "@/lib/work-order";
import { canMoveWorkOrder } from "@/lib/permissions";
import {
  getWorkshopOperationalData,
  runWorkshopOperationalCommand,
} from "@/features/workshop/api/operational";

export const isServerBackedWorkshop = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const noStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
let backendCommandQueue = Promise.resolve();
const initialWorkshopData = {
  customers: [],
  vehicles: [],
  workOrders: [],
  parts: [],
  financeEntries: [],
  inventoryMovements: [],
  mechanics: [],
};
const initialShop = {
  name: "",
  cnpj: "",
  phone: "",
};
const legacyDemoMechanics = new Set([
  "Rafael Nunes",
  "Diego Martins",
  "Bruno Costa",
  "Marcos Lima",
]);
function isLegacyDemoId(id, prefix, max) {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(String(id ?? ""));
  return Boolean(match && Number(match[1]) >= 1 && Number(match[1]) <= max);
}
function removeLegacyDemoData(persistedState) {
  const state = persistedState && typeof persistedState === "object" ? persistedState : {};
  const customers = Array.isArray(state.customers) ? state.customers : [];
  const vehicles = Array.isArray(state.vehicles) ? state.vehicles : [];
  const workOrders = Array.isArray(state.workOrders) ? state.workOrders : [];
  const parts = Array.isArray(state.parts) ? state.parts : [];
  const financeEntries = Array.isArray(state.financeEntries) ? state.financeEntries : [];
  const inventoryMovements = Array.isArray(state.inventoryMovements)
    ? state.inventoryMovements
    : [];
  const removedWorkOrderIds = new Set(
    workOrders
      .filter(
        (order) =>
          isLegacyDemoId(order.id, "work-order", 25) ||
          isLegacyDemoId(order.customerId, "customer", 12) ||
          isLegacyDemoId(order.vehicleId, "vehicle", 18),
      )
      .map((order) => order.id),
  );
  const cleanedWorkOrders = workOrders
    .filter((order) => !removedWorkOrderIds.has(order.id))
    .map((order) => ({
      ...order,
      mechanic: legacyDemoMechanics.has(order.mechanic) ? "" : (order.mechanic ?? ""),
      parts: (Array.isArray(order.parts) ? order.parts : []).filter(
        (part) => !isLegacyDemoId(part.partId, "part", 30),
      ),
      evidence: (Array.isArray(order.evidence) ? order.evidence : []).filter(
        (item) =>
          item.variant == null &&
          !String(item.caption ?? "")
            .toLowerCase()
            .includes("demonstrativo"),
      ),
      timeline: (Array.isArray(order.timeline) ? order.timeline : []).map((event) =>
        event.actor === "Você · Demonstração" ? { ...event, actor: "Você" } : event,
      ),
    }));
  const shop = { ...initialShop, ...(state.shop ?? {}) };
  if (shop.name === "Torque Centro Automotivo") shop.name = "";
  if (shop.cnpj === "00.000.000/0001-00") shop.cnpj = "";
  if (shop.phone === "(11) 4000-2026") shop.phone = "";

  return {
    ...state,
    customers: customers.filter((item) => !isLegacyDemoId(item.id, "customer", 12)),
    vehicles: vehicles.filter(
      (item) =>
        !isLegacyDemoId(item.id, "vehicle", 18) && !isLegacyDemoId(item.customerId, "customer", 12),
    ),
    workOrders: cleanedWorkOrders,
    parts: parts.filter((item) => !isLegacyDemoId(item.id, "part", 30)),
    financeEntries: financeEntries.filter(
      (item) =>
        !isLegacyDemoId(item.id, "finance", 40) && !removedWorkOrderIds.has(item.workOrderId),
    ),
    inventoryMovements: inventoryMovements.filter(
      (item) =>
        !String(item.id ?? "").startsWith("movement-initial-") &&
        !isLegacyDemoId(item.partId, "part", 30),
    ),
    mechanics: [],
    shop,
  };
}
function createLocalId(prefix) {
  void prefix;
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes]
    .map(
      (byte, index) =>
        `${[4, 6, 8, 10].includes(index) ? "-" : ""}${byte.toString(16).padStart(2, "0")}`,
    )
    .join("");
}
function replaceBackendSnapshot(set, snapshot) {
  set({
    ...initialWorkshopData,
    ...snapshot,
    backendReady: true,
    backendLoading: false,
    backendError: "",
  });
}
function persistBackendCommand(get, set, action, payload) {
  if (!isServerBackedWorkshop || !get().backendReady) return;
  backendCommandQueue = backendCommandQueue
    .catch(() => {})
    .then(async () => {
      const snapshot = await runWorkshopOperationalCommand({ data: { action, payload } });
      replaceBackendSnapshot(set, snapshot);
    })
    .catch(async (error) => {
      try {
        const snapshot = await getWorkshopOperationalData();
        replaceBackendSnapshot(set, snapshot);
      } catch (loadError) {
        set({
          backendReady: false,
          backendLoading: false,
          backendError: "Não foi possível sincronizar os dados com o banco.",
        });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("torque:operational-error", {
            detail: {
              message:
                error instanceof Error && error.message
                  ? error.message
                  : "A alteração não foi salva no banco.",
            },
          }),
        );
      }
    });
}
function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
function dueDateStatus(dueDate) {
  const key = String(dueDate ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && key < localDateKey() ? "overdue" : "pending";
}
function approvalAfterItemChange(services, parts, previous) {
  const approvals = [...services, ...parts].map((item) => item.approval);
  if (!approvals.length) return previous;
  const approved = approvals.filter((value) => value === "approved").length;
  const rejected = approvals.filter((value) => value === "rejected").length;
  const pending = approvals.length - approved - rejected;
  if (approved === approvals.length) return "approved";
  if (rejected === approvals.length) return "rejected";
  if (pending > 0) return previous === "not-sent" ? "not-sent" : "pending";
  if (approved > 0 && rejected > 0) return "partial";
  return previous;
}
function statusAfterApprovalChange(order, approval, services, parts, inventory) {
  if (["delivered", "cancelled"].includes(order.status)) return order.status;
  const items = [...services, ...parts];
  if (!items.some((item) => item.approval === "approved")) return "awaiting-approval";
  if (items.some((item) => item.approval === "pending")) return "awaiting-approval";
  const shortage = parts.some(
    (part) =>
      part.approval === "approved" &&
      !part.installed &&
      (inventory.find((item) => item.id === part.partId)?.quantity ?? 0) < part.quantity,
  );
  return shortage ? "waiting-parts" : "in-progress";
}
function timelineEvent(title, detail, actor = "Você") {
  return {
    id: createLocalId("event"),
    title,
    detail,
    createdAt: new Date().toISOString(),
    actor,
  };
}
const statusLabel = {
  intake: "Entrada",
  diagnosis: "Diagnóstico",
  "awaiting-approval": "Aguardando aprovação",
  "waiting-parts": "Aguardando peça",
  "in-progress": "Em execução",
  ready: "Pronto para retirada",
  delivered: "Entregue",
  cancelled: "Cancelada",
};
function makeChecklist(labels) {
  return labels.map((label) => ({
    id: createLocalId("checklist"),
    label,
    checked: false,
  }));
}
export const useWorkshopStore = create()(
  persist(
    (set, get) => ({
      ...initialWorkshopData,
      shop: { ...initialShop },
      backendReady: false,
      backendLoading: false,
      backendError: "",
      loadOperationalData: async () => {
        set({ backendLoading: true, backendError: "" });
        try {
          const snapshot = await getWorkshopOperationalData();
          replaceBackendSnapshot(set, snapshot);
          return true;
        } catch (error) {
          set({
            backendLoading: false,
            backendReady: false,
            backendError:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar os dados da oficina.",
          });
          return false;
        }
      },
      createCustomer: (input) => {
        const customer = {
          ...input,
          id: createLocalId("customer"),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ customers: [customer, ...state.customers] }));
        persistBackendCommand(get, set, "customer.create", { id: customer.id, record: customer });
        return customer;
      },
      updateCustomer: (id, changes) => {
        set((state) => ({
          customers: state.customers.map((customer) =>
            customer.id === id ? { ...customer, ...changes } : customer,
          ),
        }));
        const record = get().customers.find((customer) => customer.id === id);
        if (record) persistBackendCommand(get, set, "customer.update", { id, record });
      },
      deleteCustomer: (id) => {
        const state = get();
        const customer = state.customers.find((item) => item.id === id);
        if (!customer) return { ok: false, error: "Cliente não encontrado." };
        if (state.vehicles.some((vehicle) => vehicle.customerId === id)) {
          return { ok: false, error: "Remova ou transfira os veículos deste cliente primeiro." };
        }
        if (state.workOrders.some((order) => order.customerId === id)) {
          return { ok: false, error: "O cliente tem ordens de serviço no histórico." };
        }
        set((current) => ({ customers: current.customers.filter((item) => item.id !== id) }));
        persistBackendCommand(get, set, "customer.delete", { id });
        return { ok: true };
      },
      createVehicle: (input) => {
        const vehicle = { ...input, id: createLocalId("vehicle") };
        set((state) => ({ vehicles: [vehicle, ...state.vehicles] }));
        persistBackendCommand(get, set, "vehicle.create", { id: vehicle.id, record: vehicle });
        return vehicle;
      },
      updateVehicle: (id, changes) => {
        set((state) => ({
          vehicles: state.vehicles.map((vehicle) =>
            vehicle.id === id ? { ...vehicle, ...changes } : vehicle,
          ),
        }));
        const record = get().vehicles.find((vehicle) => vehicle.id === id);
        if (record) persistBackendCommand(get, set, "vehicle.update", { id, record });
      },
      deleteVehicle: (id) => {
        const state = get();
        if (!state.vehicles.some((item) => item.id === id)) {
          return { ok: false, error: "Veículo não encontrado." };
        }
        if (state.workOrders.some((order) => order.vehicleId === id)) {
          return { ok: false, error: "O veículo tem ordens de serviço no histórico." };
        }
        set((current) => ({ vehicles: current.vehicles.filter((item) => item.id !== id) }));
        persistBackendCommand(get, set, "vehicle.delete", { id });
        return { ok: true };
      },
      createWorkOrder: (input) => {
        const state = get();
        const latestNumber = state.workOrders.reduce((highest, order) => {
          const value = Number(order.code.replace("OS-", ""));
          return Math.max(highest, Number.isFinite(value) ? value : 0);
        }, 1042);
        const now = new Date().toISOString();
        const order = {
          id: createLocalId("work-order"),
          code: `OS-${latestNumber + 1}`,
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          status: "intake",
          priority: "normal",
          openedAt: now,
          updatedAt: now,
          expectedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          mileageIn: input.mileageIn,
          fuelPercent: input.fuelPercent,
          damageAreas: [],
          complaint: input.complaint,
          diagnosis: "",
          mechanic: input.mechanic?.trim() ?? "",
          approval: "not-sent",
          services: [],
          parts: [],
          evidence: [],
          timeline: [
            timelineEvent(
              "Veículo recebido",
              "Ordem de serviço aberta e checklist de entrada iniciado.",
            ),
          ],
          entryChecklist: makeChecklist(ENTRY_CHECKLIST_LABELS),
          exitChecklist: makeChecklist(EXIT_CHECKLIST_LABELS),
          paymentStatus: "pending",
        };
        set((current) => ({ workOrders: [order, ...current.workOrders] }));
        persistBackendCommand(get, set, "work-order.create", { record: order });
        return order;
      },
      deleteWorkOrder: (id) => {
        const state = get();
        const order = state.workOrders.find((item) => item.id === id);
        if (!order) return { ok: false, error: "Ordem de serviço não encontrada." };
        const linkedEntries = state.financeEntries.filter((entry) => entry.workOrderId === id);
        if (linkedEntries.some((entry) => entry.status === "paid")) {
          return {
            ok: false,
            error:
              "A OS tem recebimentos baixados. Preserve o histórico financeiro e cancele a OS.",
          };
        }
        const now = new Date().toISOString();
        const returns = order.parts
          .filter((usage) => usage.installed)
          .map((usage) => ({
            id: createLocalId("movement"),
            partId: usage.partId,
            quantityDelta: usage.quantity,
            reason: `Estorno por exclusão da ${order.code}`,
            workOrderId: order.id,
            createdAt: now,
          }));
        set((current) => ({
          workOrders: current.workOrders.filter((item) => item.id !== id),
          financeEntries: current.financeEntries.filter((entry) => entry.workOrderId !== id),
          parts: current.parts.map((part) => ({
            ...part,
            quantity:
              part.quantity +
              order.parts
                .filter((usage) => usage.partId === part.id && usage.installed)
                .reduce((sum, usage) => sum + usage.quantity, 0),
          })),
          inventoryMovements: [...returns, ...(current.inventoryMovements ?? [])],
        }));
        persistBackendCommand(get, set, "work-order.delete", { id });
        return { ok: true, evidence: order.evidence };
      },
      updateWorkOrder: (id, changes) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === id ? { ...order, ...changes, updatedAt: new Date().toISOString() } : order,
          ),
        }));
        const record = get().workOrders.find((order) => order.id === id);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      setWorkOrderStatus: (id, status, profile) => {
        let result = { ok: false, error: "Ordem de serviço não encontrada." };
        let newReceivableId = null;
        set((state) => {
          const order = state.workOrders.find((item) => item.id === id);
          const error = getWorkOrderTransitionError(order, status, state.parts);
          if (error) {
            result = { ok: false, error };
            return {};
          }
          if (!canMoveWorkOrder(profile, order.status, status, order, state.parts)) {
            result = { ok: false, error: "Seu perfil não pode alterar esta etapa." };
            return {};
          }
          const now = new Date().toISOString();
          const nextOrder = {
            ...order,
            status,
            ...(status === "awaiting-approval"
              ? {
                  approval: "pending",
                  services: order.services.map((service) => ({
                    ...service,
                    approval: service.approval === "not-sent" ? "pending" : service.approval,
                  })),
                  parts: order.parts.map((part) => ({
                    ...part,
                    approval: part.approval === "not-sent" ? "pending" : part.approval,
                  })),
                }
              : {}),
            updatedAt: now,
            timeline: [
              timelineEvent(
                status === "cancelled" ? "Ordem cancelada" : "Etapa atualizada",
                status === "cancelled"
                  ? "A ordem de serviço foi cancelada pelo gestor."
                  : "Status alterado para " + (statusLabel[status] ?? status) + ".",
              ),
              ...order.timeline,
            ],
          };
          const linkedReceivable = state.financeEntries.some(
            (entry) => entry.workOrderId === id && entry.type === "receivable",
          );
          const amount = getApprovedWorkOrderTotal(nextOrder);
          const receivable =
            status === "delivered" &&
            nextOrder.paymentStatus !== "paid" &&
            !linkedReceivable &&
            amount > 0
              ? {
                  id: createLocalId("finance"),
                  description:
                    nextOrder.code +
                    " · " +
                    (state.vehicles.find((vehicle) => vehicle.id === nextOrder.vehicleId)?.plate ??
                      "Veículo"),
                  type: "receivable",
                  category: "Serviços e peças",
                  amount,
                  dueDate: now,
                  workOrderId: id,
                  status: dueDateStatus(now),
                }
              : null;
          newReceivableId = receivable?.id ?? null;
          result = { ok: true };
          return {
            workOrders: state.workOrders.map((item) => (item.id === id ? nextOrder : item)),
            ...(receivable ? { financeEntries: [receivable, ...state.financeEntries] } : {}),
          };
        });
        if (result.ok) {
          const record = get().workOrders.find((order) => order.id === id);
          if (record) persistBackendCommand(get, set, "work-order.update", { record });
          const receivable = newReceivableId
            ? get().financeEntries.find((entry) => entry.id === newReceivableId)
            : null;
          if (receivable) {
            persistBackendCommand(get, set, "finance.create", {
              id: receivable.id,
              record: receivable,
            });
          }
        }
        return result;
      },
      sendWorkOrderQuote: (id) => {
        let result = { ok: false, error: "Ordem de serviço não encontrada." };
        set((state) => {
          const order = state.workOrders.find((item) => item.id === id);
          if (!order) return {};
          if (["delivered", "cancelled"].includes(order.status)) {
            result = { ok: false, error: "Não é possível enviar orçamento para uma OS encerrada." };
            return {};
          }
          if (!["diagnosis", "awaiting-approval"].includes(order.status)) {
            result = {
              ok: false,
              error: "O orçamento só pode ser enviado na etapa de diagnóstico ou revisão.",
            };
            return {};
          }
          if (!order.services.length && !order.parts.length) {
            result = {
              ok: false,
              error: "Adicione ao menos um serviço ou uma peça antes de enviar o orçamento.",
            };
            return {};
          }
          const services = order.services.map((service) => ({
            ...service,
            approval: ["not-sent", "rejected"].includes(service.approval)
              ? "pending"
              : service.approval,
            ...(service.approval === "rejected" ? { status: "todo" } : {}),
          }));
          const parts = order.parts.map((part) => ({
            ...part,
            approval: ["not-sent", "rejected"].includes(part.approval) ? "pending" : part.approval,
          }));
          const approval = approvalAfterItemChange(services, parts, "pending");
          result = { ok: true };
          return {
            workOrders: state.workOrders.map((item) =>
              item.id === id
                ? {
                    ...item,
                    services,
                    parts,
                    approval,
                    status: "awaiting-approval",
                    updatedAt: new Date().toISOString(),
                    timeline: [
                      timelineEvent(
                        "Orçamento enviado",
                        "Envio demonstrativo; nenhuma mensagem foi enviada.",
                      ),
                      ...item.timeline,
                    ],
                  }
                : item,
            ),
          };
        });
        if (result.ok) {
          const record = get().workOrders.find((order) => order.id === id);
          if (record) persistBackendCommand(get, set, "work-order.update", { record });
        }
        return result;
      },
      setWorkOrderApproval: (id, approval) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (order.id !== id) return order;
            if (order.status !== "awaiting-approval") return order;
            if (!["approved", "rejected", "partial"].includes(approval)) return order;
            if (!order.services.length && !order.parts.length) return order;
            const hasPending = [...order.services, ...order.parts].some(
              (item) => item.approval === "pending",
            );
            if (!hasPending) return order;
            const hasApprovedItem = [...order.services, ...order.parts].some(
              (item) => item.approval === "approved",
            );
            const firstPendingId = [...order.services, ...order.parts].find(
              (item) => item.approval === "pending",
            )?.id;
            const respond = (item) => {
              if (item.approval !== "pending") return item;
              const nextApproval =
                approval === "partial"
                  ? !hasApprovedItem && item.id === firstPendingId
                    ? "approved"
                    : "rejected"
                  : approval;
              return {
                ...item,
                approval: nextApproval,
                ...(nextApproval === "rejected" && Object.hasOwn(item, "status")
                  ? { status: "todo" }
                  : {}),
              };
            };
            let services = order.services.map(respond);
            let parts = order.parts.map(respond);
            if (approval === "partial") {
              const allItems = [...services, ...parts];
              if (!allItems.some((item) => item.approval === "approved")) return order;
            }
            const nextApproval = approvalAfterItemChange(services, parts, order.approval);
            const status = statusAfterApprovalChange(
              order,
              nextApproval,
              services,
              parts,
              state.parts,
            );
            return {
              ...order,
              approval: nextApproval,
              services,
              parts,
              status,
              updatedAt: new Date().toISOString(),
              timeline: [
                timelineEvent("Retorno do orçamento", "Aprovação atualizada: " + approval + "."),
                ...order.timeline,
              ],
            };
          }),
        }));
        const record = get().workOrders.find((order) => order.id === id);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      setWorkOrderServiceStatus: (orderId, serviceId, status) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId &&
            ["in-progress", "waiting-parts"].includes(order.status) &&
            ["todo", "in-progress", "done"].includes(status) &&
            order.services.some(
              (service) => service.id === serviceId && service.approval === "approved",
            )
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  services: order.services.map((service) =>
                    service.id === serviceId ? { ...service, status } : service,
                  ),
                  timeline: [
                    timelineEvent(
                      "Tarefa atualizada",
                      `${order.services.find((service) => service.id === serviceId)?.name ?? "Serviço"}: ${status === "done" ? "concluído" : status === "in-progress" ? "em andamento" : "por fazer"}.`,
                    ),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        }));
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      setWorkOrderServiceApproval: (orderId, serviceId, approval) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (
              order.id !== orderId ||
              order.status !== "awaiting-approval" ||
              !["pending", "approved", "rejected"].includes(approval) ||
              (order.services.find((service) => service.id === serviceId)?.status === "done" &&
                approval !== "approved")
            )
              return order;
            const services = order.services.map((service) =>
              service.id === serviceId
                ? {
                    ...service,
                    approval,
                    ...(approval === "approved" ? {} : { status: "todo" }),
                  }
                : service,
            );
            const orderApproval = approvalAfterItemChange(services, order.parts, order.approval);
            return {
              ...order,
              approval: orderApproval,
              status: statusAfterApprovalChange(
                order,
                orderApproval,
                services,
                order.parts,
                state.parts,
              ),
              updatedAt: new Date().toISOString(),
              services,
              timeline: [
                timelineEvent(
                  "Aprovação por item",
                  (order.services.find((service) => service.id === serviceId)?.name ?? "Serviço") +
                    ": " +
                    approval +
                    ".",
                ),
                ...order.timeline,
              ],
            };
          }),
        }));
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      setWorkOrderPartApproval: (orderId, partId, approval) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            const currentPart = order.parts.find((part) => part.id === partId);
            if (
              order.id !== orderId ||
              order.status !== "awaiting-approval" ||
              !["pending", "approved", "rejected"].includes(approval) ||
              (currentPart?.installed && approval !== "approved")
            )
              return order;
            const parts = order.parts.map((part) =>
              part.id === partId ? { ...part, approval } : part,
            );
            const orderApproval = approvalAfterItemChange(order.services, parts, order.approval);
            return {
              ...order,
              approval: orderApproval,
              status: statusAfterApprovalChange(
                order,
                orderApproval,
                order.services,
                parts,
                state.parts,
              ),
              updatedAt: new Date().toISOString(),
              parts,
              timeline: [
                timelineEvent(
                  "Aprovação por item",
                  (order.parts.find((part) => part.id === partId)?.name ?? "Peça") +
                    ": " +
                    approval +
                    ".",
                ),
                ...order.timeline,
              ],
            };
          }),
        }));
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      addWorkOrderService: (orderId, service) => {
        let result = false;
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (order.id !== orderId || ["delivered", "cancelled"].includes(order.status))
              return order;
            const services = [
              ...order.services,
              { ...service, id: createLocalId("service"), approval: "pending", status: "todo" },
            ];
            const approval = approvalAfterItemChange(services, order.parts, order.approval);
            result = true;
            return {
              ...order,
              approval,
              status: ["intake", "diagnosis"].includes(order.status)
                ? order.status
                : "awaiting-approval",
              updatedAt: new Date().toISOString(),
              services,
              timeline: [timelineEvent("Serviço incluído", service.name), ...order.timeline],
            };
          }),
        }));
        if (result) {
          const record = get().workOrders.find((order) => order.id === orderId);
          if (record) persistBackendCommand(get, set, "work-order.update", { record });
        }
        return result;
      },
      addWorkOrderPart: (orderId, part) => {
        let result = false;
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (order.id !== orderId || ["delivered", "cancelled"].includes(order.status))
              return order;
            const parts = [
              ...order.parts,
              { ...part, id: createLocalId("usage"), approval: "pending", installed: false },
            ];
            const approval = approvalAfterItemChange(order.services, parts, order.approval);
            result = true;
            return {
              ...order,
              approval,
              status: ["intake", "diagnosis"].includes(order.status)
                ? order.status
                : "awaiting-approval",
              updatedAt: new Date().toISOString(),
              parts,
              timeline: [timelineEvent("Peça incluída no orçamento", part.name), ...order.timeline],
            };
          }),
        }));
        if (result) {
          const record = get().workOrders.find((order) => order.id === orderId);
          if (record) persistBackendCommand(get, set, "work-order.update", { record });
        }
        return result;
      },
      setWorkOrderPartInstalled: (orderId, partUsageId, installed) => {
        set((state) => {
          const order = state.workOrders.find((item) => item.id === orderId);
          const usage = order?.parts.find((item) => item.id === partUsageId);
          if (
            !order ||
            !usage ||
            usage.installed === installed ||
            !["in-progress", "waiting-parts"].includes(order.status)
          )
            return {};
          const stock = state.parts.find((item) => item.id === usage.partId);
          if (
            installed &&
            (usage.approval !== "approved" || (stock?.quantity ?? 0) < usage.quantity)
          )
            return {};
          const movement = {
            id: createLocalId("movement"),
            partId: usage.partId,
            quantityDelta: installed ? -usage.quantity : usage.quantity,
            reason: `${installed ? "Aplicação" : "Estorno de aplicação"} na ${order.code}`,
            workOrderId: order.id,
            createdAt: new Date().toISOString(),
          };
          return {
            parts: state.parts.map((part) =>
              part.id === usage.partId
                ? {
                    ...part,
                    quantity: Math.max(
                      0,
                      part.quantity + (installed ? -usage.quantity : usage.quantity),
                    ),
                  }
                : part,
            ),
            workOrders: state.workOrders.map((item) =>
              item.id === orderId
                ? {
                    ...item,
                    updatedAt: new Date().toISOString(),
                    parts: item.parts.map((part) =>
                      part.id === partUsageId ? { ...part, installed } : part,
                    ),
                    timeline: [
                      timelineEvent(installed ? "Peça aplicada" : "Aplicação desfeita", usage.name),
                      ...item.timeline,
                    ],
                  }
                : item,
            ),
            inventoryMovements: [movement, ...(state.inventoryMovements ?? [])],
          };
        });
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      toggleChecklistItem: (orderId, list, itemId) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId &&
            ["entryChecklist", "exitChecklist"].includes(list) &&
            !["delivered", "cancelled"].includes(order.status) &&
            order[list]?.some((item) => item.id === itemId)
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  [list]: order[list].map((item) =>
                    item.id === itemId ? { ...item, checked: !item.checked } : item,
                  ),
                  timeline: [
                    timelineEvent(
                      "Checklist atualizado",
                      order[list].find((item) => item.id === itemId)?.label ?? "Item de checklist",
                    ),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        }));
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      toggleDamageArea: (orderId, area) => {
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  damageAreas: order.damageAreas.includes(area)
                    ? order.damageAreas.filter((item) => item !== area)
                    : [...order.damageAreas, area],
                  timeline: [
                    timelineEvent(
                      "Mapa de avarias atualizado",
                      `Região ${area} ${order.damageAreas.includes(area) ? "desmarcada" : "marcada"}.`,
                    ),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        }));
        const record = get().workOrders.find((order) => order.id === orderId);
        if (record) persistBackendCommand(get, set, "work-order.update", { record });
      },
      addWorkOrderEvidence: (orderId, evidence) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  evidence: [
                    {
                      ...evidence,
                      id: evidence.id ?? evidence.photoId ?? `evidence-${Date.now()}`,
                      createdAt: evidence.createdAt ?? new Date().toISOString(),
                    },
                    ...order.evidence,
                  ],
                  timeline: isServerBackedWorkshop
                    ? order.timeline
                    : [timelineEvent("Evidência adicionada", evidence.title), ...order.timeline],
                }
              : order,
          ),
        })),
      removeWorkOrderEvidence: (orderId, evidenceId) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (order.id !== orderId) return order;
            const evidence = order.evidence.find((item) => item.id === evidenceId);
            return {
              ...order,
              updatedAt: new Date().toISOString(),
              evidence: order.evidence.filter((item) => item.id !== evidenceId),
              timeline:
                evidence && !isServerBackedWorkshop
                  ? [
                      timelineEvent("Evidência removida", `${evidence.title} foi excluída.`),
                      ...order.timeline,
                    ]
                  : order.timeline,
            };
          }),
        })),
      createFinanceEntry: (input) => {
        const entry = {
          ...input,
          id: createLocalId("finance"),
          status: dueDateStatus(input.dueDate),
        };
        set((state) => ({ financeEntries: [entry, ...state.financeEntries] }));
        persistBackendCommand(get, set, "finance.create", { id: entry.id, record: entry });
        return entry;
      },
      updateFinanceEntry: (id, changes) => {
        const current = get().financeEntries.find((entry) => entry.id === id);
        if (!current || current.status === "paid") return false;
        set((state) => {
          const financeEntries = state.financeEntries.map((entry) => {
            if (entry.id !== id) return entry;
            const next = { ...entry, ...changes, id: entry.id, workOrderId: entry.workOrderId };
            if (entry.status !== "paid") next.status = dueDateStatus(next.dueDate);
            return next;
          });
          const workOrders =
            current.type === "receivable" && current.workOrderId
              ? state.workOrders.map((order) => {
                  if (order.id !== current.workOrderId) return order;
                  const linked = financeEntries.filter(
                    (entry) => entry.workOrderId === order.id && entry.type === "receivable",
                  );
                  return {
                    ...order,
                    paymentStatus:
                      linked.length > 0 && linked.every((entry) => entry.status === "paid")
                        ? "paid"
                        : "pending",
                  };
                })
              : state.workOrders;
          return { financeEntries, workOrders };
        });
        const record = get().financeEntries.find((entry) => entry.id === id);
        if (record) persistBackendCommand(get, set, "finance.update", { id, record });
        return true;
      },
      deleteFinanceEntry: (id) => {
        const current = get().financeEntries.find((entry) => entry.id === id);
        if (!current) return { ok: false, error: "Lançamento não encontrado." };
        if (current.status === "paid") {
          return { ok: false, error: "Reabra o lançamento antes de excluí-lo." };
        }
        set((state) => {
          const financeEntries = state.financeEntries.filter((entry) => entry.id !== id);
          const workOrders =
            current.type === "receivable" && current.workOrderId
              ? state.workOrders.map((order) => {
                  if (order.id !== current.workOrderId) return order;
                  const linked = financeEntries.filter(
                    (entry) => entry.workOrderId === order.id && entry.type === "receivable",
                  );
                  return {
                    ...order,
                    paymentStatus:
                      linked.length > 0 && linked.every((entry) => entry.status === "paid")
                        ? "paid"
                        : "pending",
                  };
                })
              : state.workOrders;
          return { financeEntries, workOrders };
        });
        persistBackendCommand(get, set, "finance.delete", { id });
        return { ok: true };
      },
      refreshOverdueFinanceEntries: () => {
        const today = localDateKey();
        let updatedCount = 0;
        set((state) => {
          let changed = false;
          const financeEntries = state.financeEntries.map((entry) => {
            if (entry.status === "pending" && dueDateStatus(entry.dueDate) === "overdue") {
              changed = true;
              updatedCount += 1;
              return { ...entry, status: "overdue" };
            }
            if (entry.status === "overdue" && String(entry.dueDate).slice(0, 10) >= today) {
              changed = true;
              return { ...entry, status: "pending" };
            }
            return entry;
          });
          return changed ? { financeEntries } : state;
        });
        return updatedCount;
      },
      setFinanceEntryStatus: (id, status) => {
        set((state) => {
          const currentEntry = state.financeEntries.find((entry) => entry.id === id);
          if (!currentEntry) return {};
          const nextStatus = status === "paid" ? "paid" : dueDateStatus(currentEntry.dueDate);
          const financeEntries = state.financeEntries.map((entry) => {
            if (entry.id !== id) return entry;
            const { paidAt: _paidAt, ...rest } = entry;
            return {
              ...rest,
              status: nextStatus,
              ...(nextStatus === "paid" ? { paidAt: new Date().toISOString() } : {}),
            };
          });
          const workOrders =
            currentEntry.type === "receivable" && currentEntry.workOrderId
              ? state.workOrders.map((order) => {
                  if (order.id !== currentEntry.workOrderId) return order;
                  const linked = financeEntries.filter(
                    (entry) => entry.workOrderId === order.id && entry.type === "receivable",
                  );
                  return {
                    ...order,
                    paymentStatus:
                      linked.length > 0 && linked.every((entry) => entry.status === "paid")
                        ? "paid"
                        : "pending",
                    updatedAt: new Date().toISOString(),
                  };
                })
              : state.workOrders;
          return { financeEntries, workOrders };
        });
        persistBackendCommand(get, set, "finance.status", { id, status });
      },
      createPart: (input) => {
        const part = { ...input, id: createLocalId("part") };
        const initialMovement =
          part.quantity > 0
            ? {
                id: createLocalId("movement"),
                partId: part.id,
                quantityDelta: part.quantity,
                reason: "Saldo inicial da peça cadastrada",
                createdAt: new Date().toISOString(),
              }
            : null;
        set((state) => ({
          parts: [part, ...state.parts],
          ...(initialMovement
            ? { inventoryMovements: [initialMovement, ...(state.inventoryMovements ?? [])] }
            : {}),
        }));
        persistBackendCommand(get, set, "part.create", { id: part.id, record: part });
        return part;
      },
      updatePart: (id, changes) => {
        set((state) => ({
          parts: state.parts.map((part) =>
            part.id === id ? { ...part, ...changes, quantity: part.quantity } : part,
          ),
        }));
        const record = get().parts.find((part) => part.id === id);
        if (record) persistBackendCommand(get, set, "part.update", { id, record });
      },
      deletePart: (id) => {
        const state = get();
        if (!state.parts.some((part) => part.id === id)) {
          return { ok: false, error: "Peça não encontrada." };
        }
        if (state.workOrders.some((order) => order.parts.some((usage) => usage.partId === id))) {
          return { ok: false, error: "A peça está vinculada ao histórico de uma OS." };
        }
        set((current) => ({
          parts: current.parts.filter((part) => part.id !== id),
          inventoryMovements: (current.inventoryMovements ?? []).filter(
            (movement) => movement.partId !== id,
          ),
        }));
        persistBackendCommand(get, set, "part.delete", { id });
        return { ok: true };
      },
      adjustPartStock: (id, amount, reason = "Movimentação manual") => {
        let result = { ok: false, error: "Peça não encontrada." };
        set((state) => {
          const current = state.parts.find((part) => part.id === id);
          if (!current) return {};
          if (!Number.isInteger(amount) || amount === 0 || current.quantity + amount < 0) {
            result = { ok: false, error: "O saldo da peça não pode ficar negativo." };
            return {};
          }
          result = { ok: true };
          return {
            parts: state.parts.map((part) =>
              part.id === id ? { ...part, quantity: part.quantity + amount } : part,
            ),
            inventoryMovements: [
              {
                id: createLocalId("movement"),
                partId: id,
                quantityDelta: amount,
                reason: reason.trim() || "Movimentação manual",
                createdAt: new Date().toISOString(),
              },
              ...(state.inventoryMovements ?? []),
            ],
          };
        });
        if (result.ok) persistBackendCommand(get, set, "part.adjust", { id, amount, reason });
        return result;
      },
      updateShop: (changes) => {
        set((state) => ({ shop: { ...state.shop, ...changes } }));
        persistBackendCommand(get, set, "workshop.update", get().shop);
      },
    }),
    {
      name: "torque-workshop-demo",
      storage: createJSONStorage(() => (isServerBackedWorkshop ? noStorage : localStorage)),
      skipHydration: true,
      version: 1,
      migrate: (persistedState) => removeLegacyDemoData(persistedState),
    },
  ),
);
