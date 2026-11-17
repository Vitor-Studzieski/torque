import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createDemoData, ENTRY_CHECKLIST_LABELS, EXIT_CHECKLIST_LABELS } from "@/data/demo-data";
import type { Customer } from "@/features/customers/types";
import type { FinanceEntry } from "@/features/finance/types";
import type { Part } from "@/features/inventory/types";
import type { Vehicle } from "@/features/vehicles/types";
import type {
  ApprovalStatus,
  ChecklistItem,
  NewWorkOrderInput,
  ServiceStatus,
  WorkOrder,
  WorkOrderEvidence,
  WorkOrderStatus,
  ItemApproval,
} from "@/features/work-orders/types";

type DemoData = ReturnType<typeof createDemoData>;

interface ShopProfile {
  name: string;
  cnpj: string;
  phone: string;
}

interface WorkshopState extends DemoData {
  shop: ShopProfile;
  createCustomer: (input: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, changes: Partial<Omit<Customer, "id">>) => void;
  createVehicle: (input: Omit<Vehicle, "id">) => Vehicle;
  updateVehicle: (id: string, changes: Partial<Omit<Vehicle, "id">>) => void;
  createWorkOrder: (input: NewWorkOrderInput) => WorkOrder;
  updateWorkOrder: (id: string, changes: Partial<Omit<WorkOrder, "id" | "code">>) => void;
  setWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  setWorkOrderApproval: (id: string, approval: ApprovalStatus) => void;
  setWorkOrderServiceStatus: (orderId: string, serviceId: string, status: ServiceStatus) => void;
  setWorkOrderServiceApproval: (orderId: string, serviceId: string, approval: ItemApproval) => void;
  setWorkOrderPartApproval: (orderId: string, partId: string, approval: ItemApproval) => void;
  addWorkOrderService: (
    orderId: string,
    service: Omit<WorkOrder["services"][number], "id">,
  ) => void;
  addWorkOrderPart: (orderId: string, part: Omit<WorkOrder["parts"][number], "id">) => void;
  setWorkOrderPartInstalled: (orderId: string, partUsageId: string, installed: boolean) => void;
  toggleChecklistItem: (
    orderId: string,
    list: "entryChecklist" | "exitChecklist",
    itemId: string,
  ) => void;
  toggleDamageArea: (orderId: string, area: string) => void;
  addWorkOrderEvidence: (
    orderId: string,
    evidence: Omit<WorkOrderEvidence, "id" | "createdAt">,
  ) => void;
  createFinanceEntry: (input: Omit<FinanceEntry, "id" | "status">) => FinanceEntry;
  setFinanceEntryStatus: (id: string, status: FinanceEntry["status"]) => void;
  createPart: (input: Omit<Part, "id">) => Part;
  adjustPartStock: (id: string, amount: number) => void;
  updateShop: (changes: Partial<ShopProfile>) => void;
  resetDemoData: () => void;
}

const initialDemoData = createDemoData();
const initialShop: ShopProfile = {
  name: "Torque Centro Automotivo",
  cnpj: "00.000.000/0001-00",
  phone: "(11) 4000-2026",
};

function timelineEvent(title: string, detail: string, actor = "Você · Demonstração") {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    detail,
    createdAt: new Date().toISOString(),
    actor,
  };
}

const statusLabel: Record<WorkOrderStatus, string> = {
  intake: "Entrada",
  diagnosis: "Diagnóstico",
  "awaiting-approval": "Aguardando aprovação",
  "waiting-parts": "Aguardando peça",
  "in-progress": "Em execução",
  ready: "Pronto para retirada",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

function makeChecklist(labels: string[]): ChecklistItem[] {
  return labels.map((label, index) => ({
    id: `${Date.now()}-${index}`,
    label,
    checked: false,
  }));
}

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set, get) => ({
      ...initialDemoData,
      shop: initialShop,

      createCustomer: (input) => {
        const customer: Customer = {
          ...input,
          id: `customer-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ customers: [customer, ...state.customers] }));
        return customer;
      },
      updateCustomer: (id, changes) =>
        set((state) => ({
          customers: state.customers.map((customer) =>
            customer.id === id ? { ...customer, ...changes } : customer,
          ),
        })),
      createVehicle: (input) => {
        const vehicle: Vehicle = { ...input, id: `vehicle-${Date.now()}` };
        set((state) => ({ vehicles: [vehicle, ...state.vehicles] }));
        return vehicle;
      },
      updateVehicle: (id, changes) =>
        set((state) => ({
          vehicles: state.vehicles.map((vehicle) =>
            vehicle.id === id ? { ...vehicle, ...changes } : vehicle,
          ),
        })),
      createWorkOrder: (input) => {
        const state = get();
        const latestNumber = state.workOrders.reduce((highest, order) => {
          const value = Number(order.code.replace("OS-", ""));
          return Math.max(highest, Number.isFinite(value) ? value : 0);
        }, 1042);
        const now = new Date().toISOString();
        const order: WorkOrder = {
          id: `work-order-${Date.now()}`,
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
          mechanic: input.mechanic,
          approval: "not-sent",
          services: [],
          parts: [],
          evidence: [
            {
              id: `evidence-${Date.now()}`,
              category: "entry",
              title: "Entrada do veículo",
              caption: "Registro criado no recebimento demonstrativo.",
              createdAt: now,
              variant: Math.floor(Math.random() * 5),
            },
          ],
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
        return order;
      },
      updateWorkOrder: (id, changes) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === id ? { ...order, ...changes, updatedAt: new Date().toISOString() } : order,
          ),
        })),
      setWorkOrderStatus: (id, status) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === id
              ? {
                  ...order,
                  status,
                  updatedAt: new Date().toISOString(),
                  timeline: [
                    timelineEvent(
                      "Etapa atualizada",
                      `Status alterado para ${statusLabel[status]}.`,
                    ),
                    ...order.timeline,
                  ],
                  ...(status === "delivered"
                    ? {
                        exitChecklist: order.exitChecklist.map((item) => ({
                          ...item,
                          checked: true,
                        })),
                      }
                    : {}),
                }
              : order,
          ),
        })),
      setWorkOrderApproval: (id, approval) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) => {
            if (order.id !== id) return order;
            const services =
              approval === "approved"
                ? order.services.map((service) => ({ ...service, approval: "approved" as const }))
                : approval === "rejected"
                  ? order.services.map((service) => ({ ...service, approval: "rejected" as const }))
                  : approval === "partial"
                    ? order.services.map((service, index) => ({
                        ...service,
                        approval: index === 0 ? ("approved" as const) : ("pending" as const),
                      }))
                    : order.services;
            const parts =
              approval === "approved"
                ? order.parts.map((part) => ({ ...part, approval: "approved" as const }))
                : approval === "rejected"
                  ? order.parts.map((part) => ({ ...part, approval: "rejected" as const }))
                  : approval === "partial"
                    ? order.parts.map((part, index) => ({
                        ...part,
                        approval:
                          index === 0 && services.length === 0
                            ? ("approved" as const)
                            : ("pending" as const),
                      }))
                    : order.parts;
            const shortage = parts.some(
              (part) =>
                part.approval !== "rejected" &&
                (state.parts.find((item) => item.id === part.partId)?.quantity ?? 0) <
                  part.quantity,
            );
            const status =
              approval === "pending"
                ? ("awaiting-approval" as const)
                : approval === "approved" || approval === "partial"
                  ? shortage
                    ? ("waiting-parts" as const)
                    : ("in-progress" as const)
                  : order.status;
            return {
              ...order,
              approval,
              services,
              parts,
              status,
              updatedAt: new Date().toISOString(),
              timeline: [
                timelineEvent("Retorno do orçamento", `Aprovação atualizada: ${approval}.`),
                ...order.timeline,
              ],
            };
          }),
        })),
      setWorkOrderServiceStatus: (orderId, serviceId, status) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
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
        })),
      setWorkOrderServiceApproval: (orderId, serviceId, approval) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  services: order.services.map((service) =>
                    service.id === serviceId ? { ...service, approval } : service,
                  ),
                  timeline: [
                    timelineEvent(
                      "Aprovação por item",
                      `${order.services.find((service) => service.id === serviceId)?.name ?? "Serviço"}: ${approval}.`,
                    ),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        })),
      setWorkOrderPartApproval: (orderId, partId, approval) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  parts: order.parts.map((part) =>
                    part.id === partId ? { ...part, approval } : part,
                  ),
                  timeline: [
                    timelineEvent(
                      "Aprovação por item",
                      `${order.parts.find((part) => part.id === partId)?.name ?? "Peça"}: ${approval}.`,
                    ),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        })),
      addWorkOrderService: (orderId, service) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  services: [...order.services, { ...service, id: `service-${Date.now()}` }],
                  timeline: [timelineEvent("Serviço incluído", service.name), ...order.timeline],
                }
              : order,
          ),
        })),
      addWorkOrderPart: (orderId, part) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  updatedAt: new Date().toISOString(),
                  parts: [...order.parts, { ...part, id: `usage-${Date.now()}` }],
                  timeline: [
                    timelineEvent("Peça incluída no orçamento", part.name),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        })),
      setWorkOrderPartInstalled: (orderId, partUsageId, installed) =>
        set((state) => {
          const order = state.workOrders.find((item) => item.id === orderId);
          const usage = order?.parts.find((item) => item.id === partUsageId);
          if (!order || !usage || usage.installed === installed) return {};
          const stock = state.parts.find((item) => item.id === usage.partId);
          if (
            installed &&
            (usage.approval !== "approved" || (stock?.quantity ?? 0) < usage.quantity)
          )
            return {};
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
          };
        }),
      toggleChecklistItem: (orderId, list, itemId) =>
        set((state) => ({
          workOrders: state.workOrders.map((order) =>
            order.id === orderId
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
        })),
      toggleDamageArea: (orderId, area) =>
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
        })),
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
                      id: `evidence-${Date.now()}`,
                      createdAt: new Date().toISOString(),
                    },
                    ...order.evidence,
                  ],
                  timeline: [
                    timelineEvent("Evidência adicionada", evidence.title),
                    ...order.timeline,
                  ],
                }
              : order,
          ),
        })),
      createFinanceEntry: (input) => {
        const status = new Date(input.dueDate).getTime() < Date.now() ? "overdue" : "pending";
        const entry: FinanceEntry = { ...input, id: `finance-${Date.now()}`, status };
        set((state) => ({ financeEntries: [entry, ...state.financeEntries] }));
        return entry;
      },
      setFinanceEntryStatus: (id, status) =>
        set((state) => ({
          financeEntries: state.financeEntries.map((entry) =>
            entry.id === id
              ? (() => {
                  const { paidAt: _paidAt, ...rest } = entry;
                  return {
                    ...rest,
                    status,
                    ...(status === "paid" ? { paidAt: new Date().toISOString() } : {}),
                  };
                })()
              : entry,
          ),
        })),
      createPart: (input) => {
        const part: Part = { ...input, id: `part-${Date.now()}` };
        set((state) => ({ parts: [part, ...state.parts] }));
        return part;
      },
      adjustPartStock: (id, amount) =>
        set((state) => ({
          parts: state.parts.map((part) =>
            part.id === id ? { ...part, quantity: Math.max(0, part.quantity + amount) } : part,
          ),
        })),
      updateShop: (changes) => set((state) => ({ shop: { ...state.shop, ...changes } })),
      resetDemoData: () => set({ ...createDemoData(), shop: { ...initialShop } }),
    }),
    {
      name: "torque-workshop-demo",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
