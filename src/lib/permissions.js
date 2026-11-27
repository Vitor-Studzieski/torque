import { getWorkOrderTransitionError } from "@/lib/work-order";

const ROLE_PERMISSIONS = {
  gestor: [
    "viewDashboard",
    "viewWorkOrders",
    "createWorkOrder",
    "manageWorkOrderQuote",
    "approveWorkOrderQuote",
    "executeWorkOrders",
    "editWorkOrderDiagnosis",
    "manageWorkOrderIntake",
    "manageWorkOrderEvidence",
    "manageWorkOrderChecklists",
    "manageWorkOrderAssignments",
    "viewWorkOrderPrices",
    "manageWorkOrderPayments",
    "viewCustomers",
    "manageCustomers",
    "viewVehicles",
    "manageVehicles",
    "viewInventory",
    "manageInventory",
    "viewFinance",
    "manageFinance",
    "viewReports",
    "manageSettings",
  ],
  atendente: [
    "viewDashboard",
    "viewWorkOrders",
    "createWorkOrder",
    "manageWorkOrderQuote",
    "manageWorkOrderIntake",
    "manageWorkOrderEvidence",
    "manageWorkOrderChecklists",
    "viewWorkOrderPrices",
    "viewCustomers",
    "manageCustomers",
    "viewVehicles",
    "manageVehicles",
  ],
  mecanico: [
    "viewDashboard",
    "viewWorkOrders",
    "executeWorkOrders",
    "editWorkOrderDiagnosis",
    "manageWorkOrderEvidence",
    "manageWorkOrderChecklists",
  ],
  financeiro: [
    "viewDashboard",
    "viewWorkOrders",
    "viewWorkOrderPrices",
    "viewCustomers",
    "viewFinance",
    "manageFinance",
  ],
};
export function hasPermission(profile, permission) {
  return ROLE_PERMISSIONS[profile]?.includes(permission) ?? false;
}
const ROUTE_PERMISSIONS = [
  { prefix: "/app/financeiro", permission: "viewFinance" },
  { prefix: "/app/estoque", permission: "viewInventory" },
  { prefix: "/app/relatorios", permission: "viewReports" },
  { prefix: "/app/configuracoes", permission: "manageSettings" },
  { prefix: "/app/clientes", permission: "viewCustomers" },
  { prefix: "/app/veiculos", permission: "viewVehicles" },
  { prefix: "/app/ordens", permission: "viewWorkOrders" },
];
export function canAccessPath(profile, pathname) {
  if (pathname === "/app" || pathname === "/app/") return true;
  const rule = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule ? hasPermission(profile, rule.permission) : false;
}
export function homePathFor(profile) {
  return profile === "financeiro" ? "/app/financeiro" : "/app";
}
const ATTENDANT_TRANSITIONS = [
  ["intake", "diagnosis"],
  ["diagnosis", "awaiting-approval"],
];
const MECHANIC_TRANSITIONS = [
  ["waiting-parts", "in-progress"],
  ["in-progress", "ready"],
];
export function canMoveWorkOrder(profile, from, to, order, inventory = []) {
  const transitions =
    profile === "gestor"
      ? [
          ...ATTENDANT_TRANSITIONS,
          ...MECHANIC_TRANSITIONS,
          ["waiting-parts", "in-progress"],
          ["in-progress", "ready"],
          ...[
            "intake",
            "diagnosis",
            "awaiting-approval",
            "waiting-parts",
            "in-progress",
            "ready",
          ].map((status) => [status, "cancelled"]),
          ["ready", "delivered"],
        ]
      : profile === "atendente"
        ? ATTENDANT_TRANSITIONS
        : profile === "mecanico"
          ? MECHANIC_TRANSITIONS
          : [];
  const roleAllows = transitions.some(
    ([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to,
  );
  if (!roleAllows) return false;
  if (!order) return true;
  return !getWorkOrderTransitionError(order, to, inventory);
}
