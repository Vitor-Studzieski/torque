export const WORK_ORDER_STATUSES = [
  "intake",
  "diagnosis",
  "awaiting-approval",
  "waiting-parts",
  "in-progress",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];
export type ApprovalStatus = "not-sent" | "pending" | "approved" | "partial" | "rejected";
export type ServiceStatus = "todo" | "in-progress" | "done";
export type ItemApproval = "pending" | "approved" | "rejected";
export type EvidenceCategory = "entry" | "damage" | "part" | "work" | "delivery";
export type WorkOrderPriority = "normal" | "urgent";

export interface WorkOrderService {
  id: string;
  name: string;
  description: string;
  laborPrice: number;
  status: ServiceStatus;
  approval: ItemApproval;
}

export interface WorkOrderPart {
  id: string;
  partId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  installed: boolean;
  approval: ItemApproval;
}

export interface WorkOrderEvidence {
  id: string;
  category: EvidenceCategory;
  title: string;
  caption: string;
  createdAt: string;
  variant: number;
}

export interface WorkOrderTimelineEntry {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  actor: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note?: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  customerId: string;
  vehicleId: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  openedAt: string;
  updatedAt: string;
  expectedAt: string;
  mileageIn: number;
  fuelPercent: number;
  damageAreas: string[];
  complaint: string;
  diagnosis: string;
  mechanic: string;
  approval: ApprovalStatus;
  services: WorkOrderService[];
  parts: WorkOrderPart[];
  evidence: WorkOrderEvidence[];
  timeline: WorkOrderTimelineEntry[];
  entryChecklist: ChecklistItem[];
  exitChecklist: ChecklistItem[];
  paymentStatus: "paid" | "pending" | "partial";
}

export interface NewWorkOrderInput {
  customerId: string;
  vehicleId: string;
  complaint: string;
  mileageIn: number;
  fuelPercent: number;
  mechanic: string;
}
