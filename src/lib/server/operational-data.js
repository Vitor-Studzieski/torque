import { randomUUID } from "node:crypto";
import { roleHasWorkshopPermission } from "@/lib/server/workshop-access";
import { getWorkOrderTransitionError } from "@/lib/work-order";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workOrderStatuses = new Set([
  "intake",
  "diagnosis",
  "awaiting-approval",
  "waiting-parts",
  "in-progress",
  "ready",
  "delivered",
  "cancelled",
]);
const itemApprovalStatuses = new Set(["pending", "approved", "rejected"]);
const serviceStatuses = new Set(["todo", "in-progress", "done"]);
const financeDirections = new Set(["receivable", "payable"]);
const operationalActions = new Set([
  "customer.create",
  "customer.update",
  "customer.delete",
  "vehicle.create",
  "vehicle.update",
  "vehicle.delete",
  "part.create",
  "part.update",
  "part.delete",
  "part.adjust",
  "finance.create",
  "finance.update",
  "finance.delete",
  "finance.status",
  "work-order.create",
  "work-order.update",
  "work-order.delete",
  "workshop.update",
]);
const businessDateSql = `(
  now() AT TIME ZONE COALESCE(
    (SELECT timezone FROM workshops LIMIT 1),
    'America/Sao_Paulo'
  )
)::date`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requirePermission(membership, permission) {
  assert(
    roleHasWorkshopPermission(membership.role, permission),
    "O papel desta conta não permite esta ação.",
  );
}

function requireText(value, label, maxLength = 500) {
  const text = String(value ?? "").trim();
  assert(text.length > 0 && text.length <= maxLength, `${label} é obrigatório.`);
  return text;
}

function optionalText(value, maxLength = 2000) {
  const text = String(value ?? "").trim();
  assert(text.length <= maxLength, "Um dos campos de texto excede o tamanho permitido.");
  return text || null;
}

function requireUuid(value, label) {
  assert(uuidPattern.test(String(value ?? "")), `${label} inválido.`);
  return value;
}

function requireNumber(
  value,
  label,
  { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {},
) {
  const number = Number(value);
  assert(
    Number.isFinite(number) &&
      number >= min &&
      number <= max &&
      (!integer || Number.isInteger(number)),
    `${label} inválido.`,
  );
  return number;
}

function parseDate(value, label) {
  const date = new Date(value);
  assert(value && !Number.isNaN(date.getTime()), `${label} inválida.`);
  return date.toISOString();
}

function dateOnly(value) {
  const text = String(value ?? "");
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  assert(match, "Data de vencimento inválida.");
  return match[1];
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNumber(value) {
  return value == null ? 0 : Number(value);
}

function dateToKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function deriveWorkOrderApproval(services, parts, status, previousApproval) {
  const items = [...services, ...parts];
  if (!items.length) return previousApproval ?? "not-sent";

  const approved = items.filter((item) => item.approval === "approved").length;
  const rejected = items.filter((item) => item.approval === "rejected").length;
  const pending = items.length - approved - rejected;

  if (approved === items.length) return "approved";
  if (rejected === items.length) return "rejected";
  if (approved > 0 && rejected > 0 && pending === 0) return "partial";
  if (pending > 0 && ["intake", "diagnosis"].includes(status) && previousApproval === "not-sent") {
    return "not-sent";
  }
  if (pending > 0) return "pending";
  return previousApproval ?? "not-sent";
}

function isAutomaticWorkOrderStatusChange(oldStatus, status, oldItems, services, parts, inventory) {
  const items = [...services, ...parts];
  const itemStatesChanged = items.some((item) => {
    const previous = oldItems.get(item.id);
    return (
      !previous ||
      item.approval !== previous.approval ||
      (previous.kind === "service" && item.status !== previous.service_status) ||
      (previous.kind === "part" &&
        (Boolean(item.installed) !== previous.installed ||
          item.partId !== previous.inventory_item_id ||
          Number(item.quantity) !== toNumber(previous.quantity)))
    );
  });

  if (
    status === "awaiting-approval" &&
    ["waiting-parts", "in-progress", "ready"].includes(oldStatus) &&
    itemStatesChanged
  ) {
    return true;
  }

  if (oldStatus === "awaiting-approval" && ["in-progress", "waiting-parts"].includes(status)) {
    const approvalsChanged = items.some(
      (item) => item.approval !== oldItems.get(item.id)?.approval,
    );
    if (!approvalsChanged) return false;
    if (!items.length || items.some((item) => item.approval === "pending")) return false;
    if (!items.some((item) => item.approval === "approved")) return false;
    const shortage = parts.some(
      (part) =>
        part.approval === "approved" &&
        !part.installed &&
        (inventory.find((item) => item.id === part.partId)?.quantity ?? 0) < part.quantity,
    );
    return status === (shortage ? "waiting-parts" : "in-progress");
  }

  return false;
}

export async function loadOperationalSnapshot(client, membership) {
  const canReadCustomers = roleHasWorkshopPermission(membership.role, "customers:read");
  const canReadVehicles = roleHasWorkshopPermission(membership.role, "vehicles:read");
  const canReadOrders = roleHasWorkshopPermission(membership.role, "work-orders:read");
  const canReadInventory = roleHasWorkshopPermission(membership.role, "inventory:read");
  const canReadFinance = roleHasWorkshopPermission(membership.role, "finance:read");
  const canReadTeam = roleHasWorkshopPermission(membership.role, "team:read");

  const { rows: shopRows } = await client.query("SELECT name, cnpj, phone FROM workshops LIMIT 1");
  let [customerResult, vehicleResult, itemResult, orderResult, teamResult] = await Promise.all([
    canReadCustomers
      ? client.query(
          `SELECT id, name, document, phone, email, notes, created_at
           FROM customers ORDER BY created_at DESC`,
        )
      : { rows: [] },
    canReadVehicles
      ? client.query(
          `SELECT id, customer_id, plate, make, model, model_year, color, mileage, fuel_percent, notes
           FROM vehicles ORDER BY created_at DESC`,
        )
      : { rows: [] },
    canReadInventory
      ? client.query(
          `SELECT id, sku, name, category, brand, description, unit, quantity,
                  minimum_quantity, unit_cost, sale_price
           FROM inventory_items WHERE active = true ORDER BY created_at DESC`,
        )
      : { rows: [] },
    canReadOrders
      ? client.query(
          `SELECT id, display_number, customer_id, vehicle_id, assigned_to_user_id,
                  status, priority, approval, expected_at, fuel_percent, damage_areas,
                  complaint, diagnosis, internal_notes, customer_notes, odometer_in,
                  created_at, updated_at
           FROM work_orders
           WHERE ($1::boolean = false OR assigned_to_user_id = $2)
           ORDER BY created_at DESC`,
          [membership.role === "mechanic", membership.userId],
        )
      : { rows: [] },
    canReadTeam || roleHasWorkshopPermission(membership.role, "work-orders:assign")
      ? client.query(
          `SELECT auth_user_id, display_name, role
           FROM workshop_memberships
           WHERE active = true AND joined_at IS NOT NULL AND role = 'mechanic'
           ORDER BY lower(display_name)`,
        )
      : { rows: [] },
  ]);

  const orderIds = orderResult.rows.map((row) => row.id);
  const assignedUserIds = [
    ...new Set(orderResult.rows.map((row) => row.assigned_to_user_id).filter(Boolean)),
  ];
  const loadedTeamIds = new Set(teamResult.rows.map((row) => row.auth_user_id));
  const missingAssignedUserIds = assignedUserIds.filter((id) => !loadedTeamIds.has(id));
  if (missingAssignedUserIds.length) {
    const assignedMembers = await client.query(
      `SELECT auth_user_id, display_name, role
       FROM workshop_memberships WHERE auth_user_id = ANY($1::varchar[]) AND active = true`,
      [missingAssignedUserIds],
    );
    teamResult = { rows: [...teamResult.rows, ...assignedMembers.rows] };
  }
  if (!canReadCustomers && orderResult.rows.length) {
    const customerIds = [...new Set(orderResult.rows.map((row) => row.customer_id))];
    customerResult = await client.query(
      `SELECT id, name, document, phone, email, notes, created_at
       FROM customers WHERE id = ANY($1::uuid[])`,
      [customerIds],
    );
  }
  if (!canReadVehicles && orderResult.rows.length) {
    const vehicleIds = [...new Set(orderResult.rows.map((row) => row.vehicle_id))];
    vehicleResult = await client.query(
      `SELECT id, customer_id, plate, make, model, model_year, color, mileage, fuel_percent, notes
       FROM vehicles WHERE id = ANY($1::uuid[])`,
      [vehicleIds],
    );
  }
  let workOrderItems = { rows: [] };
  let checklistItems = { rows: [] };
  let timelineEvents = { rows: [] };
  let photoItems = { rows: [] };
  if (orderIds.length) {
    [workOrderItems, checklistItems, timelineEvents, photoItems] = await Promise.all([
      client.query(
        `SELECT id, work_order_id, inventory_item_id, kind, name, description,
                approval, service_status, installed, quantity, unit_cost, unit_price, used_at
         FROM work_order_items WHERE work_order_id = ANY($1::uuid[])
         ORDER BY created_at, id`,
        [orderIds],
      ),
      client.query(
        `SELECT id, work_order_id, checklist_type, label, sort_order, checked
         FROM work_order_checklist_items WHERE work_order_id = ANY($1::uuid[])
         ORDER BY checklist_type, sort_order`,
        [orderIds],
      ),
      client.query(
        `SELECT id, work_order_id, actor_label, title, detail, created_at
         FROM work_order_timeline_events WHERE work_order_id = ANY($1::uuid[])
         ORDER BY created_at DESC`,
        [orderIds],
      ),
      roleHasWorkshopPermission(membership.role, "photos:read")
        ? client.query(
            `SELECT id, work_order_id, category, title, original_name, caption, created_at
             FROM work_order_photos WHERE work_order_id = ANY($1::uuid[])
             ORDER BY created_at DESC`,
            [orderIds],
          )
        : { rows: [] },
    ]);
  }

  const financeResult = canReadFinance
    ? await client
        .query(
          `UPDATE financial_entries
         SET status = 'overdue', updated_at = now()
         WHERE status = 'pending' AND due_date < ${businessDateSql}`,
        )
        .then(() =>
          client.query(
            `SELECT id, work_order_id, direction, status, description, category,
                amount, due_date, paid_at, payment_method, notes
         FROM financial_entries ORDER BY due_date DESC, created_at DESC`,
          ),
        )
    : { rows: [] };

  const movementResult = canReadInventory
    ? await client.query(
        `SELECT id, inventory_item_id, work_order_id, quantity_delta, reason, created_at
         FROM inventory_movements ORDER BY created_at DESC LIMIT 1000`,
      )
    : { rows: [] };

  const itemsByOrder = new Map();
  for (const row of workOrderItems.rows) {
    const items = itemsByOrder.get(row.work_order_id) ?? { services: [], parts: [] };
    const base = {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      approval: row.approval,
    };
    if (row.kind === "service") {
      items.services.push({
        ...base,
        laborPrice: toNumber(row.unit_price),
        status: row.service_status,
      });
    } else {
      items.parts.push({
        ...base,
        partId: row.inventory_item_id,
        quantity: toNumber(row.quantity),
        unitPrice: toNumber(row.unit_price),
        unitCost: toNumber(row.unit_cost),
        installed: row.installed,
        ...(row.used_at ? { usedAt: toIso(row.used_at) } : {}),
      });
    }
    itemsByOrder.set(row.work_order_id, items);
  }

  const checklistsByOrder = new Map();
  for (const row of checklistItems.rows) {
    const lists = checklistsByOrder.get(row.work_order_id) ?? {
      entryChecklist: [],
      exitChecklist: [],
    };
    const list = row.checklist_type === "entry" ? lists.entryChecklist : lists.exitChecklist;
    list.push({ id: row.id, label: row.label, checked: row.checked });
    checklistsByOrder.set(row.work_order_id, lists);
  }

  const timelineByOrder = new Map();
  for (const row of timelineEvents.rows) {
    const timeline = timelineByOrder.get(row.work_order_id) ?? [];
    timeline.push({
      id: row.id,
      title: row.title,
      detail: row.detail,
      actor: row.actor_label,
      createdAt: toIso(row.created_at),
    });
    timelineByOrder.set(row.work_order_id, timeline);
  }

  const photosByOrder = new Map();
  for (const row of photoItems.rows) {
    const photos = photosByOrder.get(row.work_order_id) ?? [];
    photos.push({
      id: row.id,
      photoId: row.id,
      category: row.category,
      title: row.title,
      caption: row.caption ?? row.original_name ?? "",
      originalFileName: row.original_name ?? "",
      createdAt: toIso(row.created_at),
    });
    photosByOrder.set(row.work_order_id, photos);
  }

  const mechanicsById = new Map(teamResult.rows.map((row) => [row.auth_user_id, row.display_name]));
  const financeByOrder = new Map();
  for (const entry of financeResult.rows) {
    if (entry.work_order_id) {
      const entries = financeByOrder.get(entry.work_order_id) ?? [];
      entries.push(entry);
      financeByOrder.set(entry.work_order_id, entries);
    }
  }

  return {
    shop: shopRows[0] ?? { name: "", cnpj: "", phone: "" },
    customers: customerResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      document: row.document ?? "",
      phone: row.phone,
      email: row.email ?? "",
      notes: row.notes ?? "",
      createdAt: toIso(row.created_at),
    })),
    vehicles: vehicleResult.rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      plate: row.plate,
      make: row.make,
      model: row.model,
      year: row.model_year,
      color: row.color ?? "",
      mileage: row.mileage,
      fuelPercent: row.fuel_percent,
      notes: row.notes ?? "",
    })),
    parts: itemResult.rows.map((row) => ({
      id: row.id,
      code: row.sku,
      name: row.name,
      category: row.category,
      brand: row.brand ?? "",
      description: row.description ?? "",
      unit: row.unit,
      quantity: toNumber(row.quantity),
      minimumQuantity: toNumber(row.minimum_quantity),
      costPrice: toNumber(row.unit_cost),
      salePrice: toNumber(row.sale_price),
    })),
    workOrders: orderResult.rows.map((row) => {
      const children = itemsByOrder.get(row.id) ?? { services: [], parts: [] };
      const lists = checklistsByOrder.get(row.id) ?? { entryChecklist: [], exitChecklist: [] };
      const receivables = (financeByOrder.get(row.id) ?? []).filter(
        (entry) => entry.direction === "receivable" && entry.status !== "canceled",
      );
      const orderEvents = timelineByOrder.get(row.id) ?? [];
      return {
        id: row.id,
        code: `OS-${row.display_number}`,
        customerId: row.customer_id,
        vehicleId: row.vehicle_id,
        status: row.status,
        priority: row.priority,
        openedAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        expectedAt: toIso(row.expected_at),
        mileageIn: row.odometer_in,
        fuelPercent: row.fuel_percent,
        damageAreas: row.damage_areas ?? [],
        complaint: row.complaint,
        diagnosis: row.diagnosis ?? "",
        internalNotes: row.internal_notes ?? "",
        customerNotes: row.customer_notes ?? "",
        mechanic: mechanicsById.get(row.assigned_to_user_id) ?? "",
        approval: row.approval,
        services: children.services,
        parts: children.parts,
        evidence: photosByOrder.get(row.id) ?? [],
        timeline: orderEvents,
        entryChecklist: lists.entryChecklist,
        exitChecklist: lists.exitChecklist,
        paymentStatus:
          receivables.length > 0 && receivables.every((entry) => entry.status === "paid")
            ? "paid"
            : "pending",
      };
    }),
    financeEntries: financeResult.rows.map((row) => ({
      id: row.id,
      workOrderId: row.work_order_id,
      type: row.direction,
      status: row.status,
      description: row.description,
      category: row.category,
      amount: toNumber(row.amount),
      dueDate: `${dateToKey(row.due_date)}T12:00:00.000Z`,
      ...(row.paid_at ? { paidAt: toIso(row.paid_at) } : {}),
      ...(row.payment_method ? { paymentMethod: row.payment_method } : {}),
      notes: row.notes ?? "",
    })),
    inventoryMovements: movementResult.rows.map((row) => ({
      id: row.id,
      partId: row.inventory_item_id,
      workOrderId: row.work_order_id,
      quantityDelta: toNumber(row.quantity_delta),
      reason: row.reason,
      createdAt: toIso(row.created_at),
    })),
    mechanics: teamResult.rows.map((row) => row.display_name),
  };
}

async function findMechanicId(client, name) {
  const normalized = String(name ?? "").trim();
  if (!normalized) return null;
  const { rows } = await client.query(
    `SELECT auth_user_id FROM workshop_memberships
     WHERE active = true AND joined_at IS NOT NULL AND role = 'mechanic'
       AND lower(display_name) = lower($1)
     LIMIT 2`,
    [normalized],
  );
  assert(rows.length === 1, "Selecione um mecânico ativo da equipe.");
  return rows[0].auth_user_id;
}

async function saveWorkOrder(client, membership, order, isCreate) {
  assert(order && typeof order === "object", "Ordem de serviço inválida.");
  const id = requireUuid(order.id, "Ordem de serviço");
  const status = isCreate ? "intake" : requireText(order.status, "Etapa", 40);
  assert(workOrderStatuses.has(status), "Etapa de OS inválida.");
  const customerId = requireUuid(order.customerId, "Cliente");
  const vehicleId = requireUuid(order.vehicleId, "Veículo");
  const complaint = requireText(order.complaint, "Relato", 4000);
  const expectedAt = parseDate(order.expectedAt, "Previsão");
  const mileage = requireNumber(order.mileageIn, "Quilometragem", { integer: true });
  const fuelPercent = requireNumber(order.fuelPercent, "Combustível", { max: 100, integer: true });
  const priority = requireText(order.priority ?? "normal", "Prioridade", 20);
  assert(["normal", "urgent"].includes(priority), "Prioridade inválida.");
  const damageAreas = Array.isArray(order.damageAreas)
    ? [...new Set(order.damageAreas.map((area) => requireText(area, "Avaria", 80)))]
    : [];
  const services = Array.isArray(order.services) ? order.services : [];
  const parts = Array.isArray(order.parts) ? order.parts : [];
  const entryChecklist = Array.isArray(order.entryChecklist) ? order.entryChecklist : [];
  const exitChecklist = Array.isArray(order.exitChecklist) ? order.exitChecklist : [];
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  let hasDomainChange = isCreate;

  requirePermission(membership, isCreate ? "work-orders:create" : "work-orders:read");
  const { rows: oldRows } = await client.query(
    `SELECT id, customer_id, vehicle_id, assigned_to_user_id, status, priority, approval,
            expected_at, fuel_percent, damage_areas, complaint, diagnosis, internal_notes,
            customer_notes, odometer_in, created_at
     FROM work_orders WHERE id = $1 LIMIT 1`,
    [id],
  );
  const oldRow = oldRows[0];
  assert(
    isCreate ? !oldRow : Boolean(oldRow),
    isCreate ? "A ordem já existe." : "Ordem de serviço não encontrada.",
  );

  const currentChildren = oldRow
    ? await client.query(
        `SELECT id, kind, inventory_item_id, name, description, approval, service_status,
                installed, quantity, unit_cost, unit_price
         FROM work_order_items WHERE work_order_id = $1`,
        [id],
      )
    : { rows: [] };
  const oldItems = new Map(currentChildren.rows.map((row) => [row.id, row]));
  const oldLists = oldRow
    ? await client.query(
        `SELECT id, checklist_type, label, checked FROM work_order_checklist_items WHERE work_order_id = $1`,
        [id],
      )
    : { rows: [] };
  const oldChecklist = new Map(oldLists.rows.map((row) => [row.id, row]));

  if (isCreate) {
    assert(status === "intake", "Uma OS nova precisa iniciar na etapa Entrada.");
    assert(
      services.length === 0 && parts.length === 0,
      "Crie a OS antes de adicionar itens ao orçamento.",
    );
    if (String(order.mechanic ?? "").trim()) requirePermission(membership, "work-orders:assign");
  } else {
    assert(
      membership.role !== "mechanic" || oldRow.assigned_to_user_id === membership.userId,
      "Mecânicos só podem alterar ordens atribuídas a eles.",
    );
    assert(
      !["delivered", "cancelled"].includes(oldRow.status),
      "OS encerrada não pode ser alterada.",
    );
    if (status !== oldRow.status) {
      const [inventoryResult, itemStateResult, checklistStateResult] = await Promise.all([
        client.query("SELECT id, quantity FROM inventory_items WHERE active = true"),
        client.query(
          `SELECT id, kind, inventory_item_id AS part_id, name, approval, service_status AS status,
                  installed, quantity FROM work_order_items WHERE work_order_id = $1`,
          [id],
        ),
        client.query(
          `SELECT checklist_type, checked FROM work_order_checklist_items WHERE work_order_id = $1`,
          [id],
        ),
      ]);
      const oldOrder = {
        status: oldRow.status,
        services: itemStateResult.rows
          .filter((item) => item.kind === "service")
          .map((item) => ({
            ...item,
            laborPrice: toNumber(item.unit_price),
          })),
        parts: itemStateResult.rows
          .filter((item) => item.kind === "part")
          .map((item) => ({
            ...item,
            partId: item.part_id,
          })),
        entryChecklist: checklistStateResult.rows
          .filter((item) => item.checklist_type === "entry")
          .map((item) => ({ checked: item.checked })),
        exitChecklist: checklistStateResult.rows
          .filter((item) => item.checklist_type === "exit")
          .map((item) => ({ checked: item.checked })),
      };
      const nextOrder = {
        ...oldOrder,
        status,
        services,
        parts,
        entryChecklist,
        exitChecklist,
      };
      const inventory = inventoryResult.rows.map((item) => ({
        id: item.id,
        quantity: toNumber(item.quantity),
      }));
      const isAutomaticChange = isAutomaticWorkOrderStatusChange(
        oldRow.status,
        status,
        oldItems,
        services,
        parts,
        inventory,
      );
      const transitionError = isAutomaticChange
        ? null
        : getWorkOrderTransitionError(oldOrder, status, inventory);
      assert(!transitionError, transitionError ?? "Mudança de etapa inválida.");
      const transitionsAllowed = {
        owner: [
          ["intake", "diagnosis"],
          ["diagnosis", "awaiting-approval"],
          ["waiting-parts", "in-progress"],
          ["in-progress", "ready"],
          ["ready", "delivered"],
          ...[
            "intake",
            "diagnosis",
            "awaiting-approval",
            "waiting-parts",
            "in-progress",
            "ready",
          ].map((from) => [from, "cancelled"]),
        ],
        manager: [
          ["intake", "diagnosis"],
          ["diagnosis", "awaiting-approval"],
          ["waiting-parts", "in-progress"],
          ["in-progress", "ready"],
          ["ready", "delivered"],
          ...[
            "intake",
            "diagnosis",
            "awaiting-approval",
            "waiting-parts",
            "in-progress",
            "ready",
          ].map((from) => [from, "cancelled"]),
        ],
        attendant: [
          ["intake", "diagnosis"],
          ["diagnosis", "awaiting-approval"],
        ],
        mechanic: [
          ["waiting-parts", "in-progress"],
          ["in-progress", "ready"],
        ],
        finance: [],
      };
      assert(
        isAutomaticChange ||
          transitionsAllowed[membership.role]?.some(
            ([from, to]) => from === oldRow.status && to === status,
          ),
        "O papel desta conta não pode fazer essa mudança de etapa.",
      );
      hasDomainChange = true;
    }

    const assignedNameChanged =
      String(order.mechanic ?? "") !==
      (await assignedMechanicName(client, oldRow.assigned_to_user_id));
    if (assignedNameChanged) {
      requirePermission(membership, "work-orders:assign");
      hasDomainChange = true;
    }
    if (
      customerId !== oldRow.customer_id ||
      vehicleId !== oldRow.vehicle_id ||
      String(order.complaint ?? "") !== oldRow.complaint ||
      Number(order.mileageIn) !== oldRow.odometer_in ||
      Number(order.fuelPercent) !== oldRow.fuel_percent ||
      JSON.stringify(damageAreas) !== JSON.stringify(oldRow.damage_areas ?? [])
    ) {
      requirePermission(membership, "work-orders:intake");
      hasDomainChange = true;
    }
    if (
      String(order.diagnosis ?? "") !== String(oldRow.diagnosis ?? "") ||
      String(order.internalNotes ?? "") !== String(oldRow.internal_notes ?? "") ||
      String(order.customerNotes ?? "") !== String(oldRow.customer_notes ?? "") ||
      expectedAt !== toIso(oldRow.expected_at) ||
      priority !== oldRow.priority
    ) {
      requirePermission(membership, "work-orders:operate");
      hasDomainChange = true;
    }

    const incomingIds = new Set([...services, ...parts].map((item) => item.id));
    assert(
      incomingIds.size === services.length + parts.length,
      "Um item de orçamento não pode ser repetido.",
    );
    assert(
      [...oldItems.keys()].every((oldId) => incomingIds.has(oldId)),
      "Itens de orçamento existentes não podem ser removidos.",
    );
    for (const item of [...services, ...parts]) {
      requireUuid(item.id, "Item da OS");
      const previous = oldItems.get(item.id);
      if (!previous) {
        assert(item.approval === "pending", "Itens novos precisam aguardar aprovação do cliente.");
        requirePermission(membership, "work-orders:quote");
        hasDomainChange = true;
        continue;
      }
      const itemType = services.includes(item) ? "service" : "part";
      assert(previous.kind === itemType, "O tipo de item da OS não pode ser alterado.");
      if (item.approval !== previous.approval) {
        if (oldRow.status === "awaiting-approval") {
          requirePermission(membership, "work-orders:approve");
        } else {
          assert(
            previous.approval === "rejected" &&
              item.approval === "pending" &&
              ["diagnosis", "awaiting-approval"].includes(status),
            "A aprovação do cliente só pode ser alterada durante uma revisão de orçamento.",
          );
          requirePermission(membership, "work-orders:quote");
        }
        hasDomainChange = true;
      }
      if (itemType === "service") {
        if (item.status !== previous.service_status) {
          requirePermission(membership, "work-orders:operate");
          hasDomainChange = true;
        }
        if (
          item.name !== previous.name ||
          item.description !== previous.description ||
          Number(item.laborPrice) !== toNumber(previous.unit_price)
        ) {
          requirePermission(membership, "work-orders:quote");
          hasDomainChange = true;
        }
      } else {
        const partId = requireUuid(item.partId, "Peça de estoque");
        const quantity = requireNumber(item.quantity, "Quantidade", {
          min: 0.001,
          max: 999999,
        });
        if (
          previous.installed &&
          (partId !== previous.inventory_item_id || quantity !== toNumber(previous.quantity))
        ) {
          throw new Error("Desfaça a aplicação da peça antes de alterar peça ou quantidade.");
        }
        if (Boolean(item.installed) !== previous.installed) {
          requirePermission(membership, "work-orders:operate");
          hasDomainChange = true;
        }
        if (
          partId !== previous.inventory_item_id ||
          item.name !== previous.name ||
          quantity !== toNumber(previous.quantity) ||
          Number(item.unitPrice) !== toNumber(previous.unit_price) ||
          Number(item.unitCost) !== toNumber(previous.unit_cost)
        ) {
          requirePermission(membership, "work-orders:quote");
          hasDomainChange = true;
        }
      }
    }

    const allChecklistItems = [...entryChecklist, ...exitChecklist];
    const incomingChecklistIds = new Set(allChecklistItems.map((item) => item.id));
    assert(
      incomingChecklistIds.size === allChecklistItems.length &&
        incomingChecklistIds.size === oldChecklist.size &&
        [...oldChecklist.keys()].every((oldId) => incomingChecklistIds.has(oldId)),
      "O checklist da OS não pode remover ou repetir itens.",
    );
    for (const [listName, listItems, type] of [
      ["entryChecklist", entryChecklist, "entry"],
      ["exitChecklist", exitChecklist, "exit"],
    ]) {
      void listName;
      for (const item of listItems) {
        requireUuid(item.id, "Item de checklist");
        const previous = oldChecklist.get(item.id);
        assert(
          previous && previous.checklist_type === type && previous.label === item.label,
          "O checklist desta OS não pode ser reconfigurado.",
        );
        if (Boolean(item.checked) !== previous.checked) {
          requirePermission(membership, "work-orders:checklist");
          hasDomainChange = true;
        }
      }
    }
  }

  const previousApproval = oldRow?.approval ?? "not-sent";
  const approval = deriveWorkOrderApproval(services, parts, status, previousApproval);
  assert(order.approval === approval, "A aprovação geral deve refletir a aprovação dos itens.");

  const assignedToUserId = await findMechanicId(client, order.mechanic);
  if (isCreate) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [membership.workshopId]);
    const { rows: numberRows } = await client.query(
      "SELECT COALESCE(MAX(display_number), 1042) + 1 AS next_number FROM work_orders",
    );
    await client.query(
      `INSERT INTO work_orders
         (workshop_id, id, display_number, customer_id, vehicle_id, assigned_to_user_id, status, priority,
          approval, expected_at, fuel_percent, damage_areas, complaint, diagnosis,
          internal_notes, customer_notes, odometer_in, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'intake', $7, 'not-sent', $8, $9, $10, $11, '', NULL, NULL, $12, $13)`,
      [
        membership.workshopId,
        id,
        numberRows[0].next_number,
        customerId,
        vehicleId,
        assignedToUserId,
        priority,
        expectedAt,
        fuelPercent,
        damageAreas,
        complaint,
        mileage,
        membership.userId,
      ],
    );
  } else {
    await client.query(
      `UPDATE work_orders SET
         customer_id = $2, vehicle_id = $3, assigned_to_user_id = $4, status = $5,
         priority = $6, approval = $7, expected_at = $8, fuel_percent = $9,
         damage_areas = $10, complaint = $11, diagnosis = $12, internal_notes = $13,
         customer_notes = $14, odometer_in = $15,
         approved_at = CASE WHEN $7 IN ('approved', 'partial') AND approved_at IS NULL THEN now() ELSE approved_at END,
         delivered_at = CASE WHEN $5 = 'delivered' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
         updated_at = now()
       WHERE id = $1`,
      [
        id,
        customerId,
        vehicleId,
        assignedToUserId,
        status,
        priority,
        approval,
        expectedAt,
        fuelPercent,
        damageAreas,
        complaint,
        optionalText(order.diagnosis, 4000),
        optionalText(order.internalNotes, 4000),
        optionalText(order.customerNotes, 4000),
        mileage,
      ],
    );
  }

  for (const service of services) {
    const serviceId = requireUuid(service.id, "Serviço");
    assert(itemApprovalStatuses.has(service.approval), "Aprovação de serviço inválida.");
    assert(serviceStatuses.has(service.status), "Situação do serviço inválida.");
    const price = requireNumber(service.laborPrice, "Valor do serviço");
    const { rowCount } = await client.query(
      `INSERT INTO work_order_items
         (workshop_id, id, work_order_id, kind, name, description, approval, service_status, quantity, unit_cost, unit_price)
       VALUES ($1, $2, $3, 'service', $4, $5, $6, $7, 1, 0, $8)
       ON CONFLICT (workshop_id, id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, approval = EXCLUDED.approval,
         service_status = EXCLUDED.service_status, unit_price = EXCLUDED.unit_price,
         updated_at = now()
       WHERE work_order_items.work_order_id = EXCLUDED.work_order_id`,
      [
        membership.workshopId,
        serviceId,
        id,
        requireText(service.name, "Nome do serviço", 200),
        optionalText(service.description, 4000) ?? "",
        service.approval,
        service.status,
        price,
      ],
    );
    assert(rowCount === 1, "Serviço não pertence a esta ordem de serviço.");
  }

  for (const part of parts) {
    const itemId = requireUuid(part.id, "Peça da OS");
    const partId = requireUuid(part.partId, "Peça de estoque");
    assert(itemApprovalStatuses.has(part.approval), "Aprovação da peça inválida.");
    const quantity = requireNumber(part.quantity, "Quantidade", { min: 0.001, max: 999999 });
    const unitPrice = requireNumber(part.unitPrice, "Preço da peça");
    const unitCost = requireNumber(part.unitCost ?? 0, "Custo da peça");
    const wasInstalled = oldItems.get(itemId)?.installed ?? false;
    const installed = Boolean(part.installed);
    const previousPart = oldItems.get(itemId);
    if (
      previousPart?.installed &&
      (partId !== previousPart.inventory_item_id || quantity !== toNumber(previousPart.quantity))
    ) {
      throw new Error("Desfaça a aplicação da peça antes de alterar peça ou quantidade.");
    }
    if (installed) {
      assert(part.approval === "approved", "Somente uma peça aprovada pode ser aplicada.");
      assert(
        ["in-progress", "waiting-parts"].includes(status),
        "A peça só pode ser aplicada durante a execução da OS.",
      );
    }
    const { rowCount } = await client.query(
      `INSERT INTO work_order_items
         (workshop_id, id, work_order_id, inventory_item_id, kind, name, description, approval,
          installed, quantity, unit_cost, unit_price, used_at)
       VALUES ($1, $2, $3, $4, 'part', $5, '', $6, $7, $8, $9, $10, CASE WHEN $7 THEN now() ELSE NULL END)
       ON CONFLICT (workshop_id, id) DO UPDATE SET
         inventory_item_id = EXCLUDED.inventory_item_id, name = EXCLUDED.name,
         approval = EXCLUDED.approval, installed = EXCLUDED.installed,
         quantity = EXCLUDED.quantity, unit_cost = EXCLUDED.unit_cost,
         unit_price = EXCLUDED.unit_price,
         used_at = CASE WHEN EXCLUDED.installed THEN COALESCE(work_order_items.used_at, now()) ELSE NULL END,
         updated_at = now()
       WHERE work_order_items.work_order_id = EXCLUDED.work_order_id`,
      [
        membership.workshopId,
        itemId,
        id,
        partId,
        requireText(part.name, "Nome da peça", 200),
        part.approval,
        installed,
        quantity,
        unitCost,
        unitPrice,
      ],
    );
    assert(rowCount === 1, "Peça não pertence a esta ordem de serviço.");
    if (installed !== wasInstalled) {
      const delta = installed ? -quantity : quantity;
      if (installed) {
        const { rowCount } = await client.query(
          `UPDATE inventory_items SET quantity = quantity - $2, updated_at = now()
           WHERE id = $1 AND active = true AND quantity >= $2`,
          [partId, quantity],
        );
        assert(rowCount === 1, "Estoque insuficiente para aplicar esta peça.");
      } else {
        await client.query(
          "UPDATE inventory_items SET quantity = quantity + $2, updated_at = now() WHERE id = $1",
          [partId, quantity],
        );
      }
      await client.query(
        `INSERT INTO inventory_movements
           (workshop_id, id, inventory_item_id, work_order_id, work_order_item_id, movement_type,
            quantity_delta, reason, idempotency_key, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (workshop_id, idempotency_key) DO NOTHING`,
        [
          membership.workshopId,
          randomUUID(),
          partId,
          id,
          itemId,
          delta > 0 ? "inbound" : "outbound",
          delta,
          `${installed ? "Aplicação" : "Estorno de aplicação"} na OS-${oldRow?.display_number ?? "nova"}`,
          `work-order-item:${itemId}:${installed ? "install" : "return"}:${Date.now()}`,
          membership.userId,
        ],
      );
    }
  }

  for (const [items, type] of [
    [entryChecklist, "entry"],
    [exitChecklist, "exit"],
  ]) {
    for (const [index, item] of items.entries()) {
      const label = requireText(item.label, "Item do checklist", 200);
      const itemKey = slugify(label) || `${type}-${index + 1}`;
      const checked = Boolean(item.checked);
      await client.query(
        `INSERT INTO work_order_checklist_items
           (workshop_id, id, work_order_id, checklist_type, item_key, label, sort_order, checked,
            checked_by_user_id, checked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 THEN $9 ELSE NULL END,
                 CASE WHEN $8 THEN now() ELSE NULL END)
         ON CONFLICT (workshop_id, work_order_id, checklist_type, item_key) DO UPDATE SET
           checked = EXCLUDED.checked,
           checked_by_user_id = CASE WHEN EXCLUDED.checked THEN $8 ELSE NULL END,
           checked_at = CASE WHEN EXCLUDED.checked THEN now() ELSE NULL END,
           updated_at = now()`,
        [
          membership.workshopId,
          requireUuid(item.id, "Item do checklist"),
          id,
          type,
          itemKey,
          label,
          index,
          checked,
          membership.userId,
        ],
      );
    }
  }

  const existingEvents = oldRow
    ? await client.query("SELECT id FROM work_order_timeline_events WHERE work_order_id = $1", [id])
    : { rows: [] };
  const existingEventIds = new Set(existingEvents.rows.map((event) => event.id));
  const newTimelineEvents = timeline.filter(
    (event) => uuidPattern.test(String(event?.id ?? "")) && !existingEventIds.has(event.id),
  );
  assert(
    !newTimelineEvents.length || hasDomainChange,
    "O histórico só pode ser registrado junto com uma alteração autorizada da OS.",
  );
  for (const event of timeline) {
    if (!uuidPattern.test(String(event?.id ?? "")) || existingEventIds.has(event.id)) continue;
    const title = requireText(event.title, "Evento do histórico", 200);
    const detail = String(event.detail ?? "")
      .trim()
      .slice(0, 1000);
    await client.query(
      `INSERT INTO work_order_timeline_events
         (workshop_id, id, work_order_id, actor_user_id, actor_label, title, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (workshop_id, id) DO NOTHING`,
      [
        membership.workshopId,
        event.id,
        id,
        membership.userId,
        membership.displayName,
        title,
        detail,
      ],
    );
  }
}

async function assignedMechanicName(client, userId) {
  if (!userId) return "";
  const { rows } = await client.query(
    "SELECT display_name FROM workshop_memberships WHERE auth_user_id = $1 LIMIT 1",
    [userId],
  );
  return rows[0]?.display_name ?? "";
}

async function customerCommand(client, membership, action, payload) {
  requirePermission(membership, "customers:write");
  const id = requireUuid(payload?.id, "Cliente");
  if (action === "customer.delete") {
    const { rowCount } = await client.query("DELETE FROM customers WHERE id = $1", [id]);
    assert(rowCount === 1, "Cliente não encontrado ou vinculado a outro registro.");
    return;
  }
  const customer = payload?.record ?? {};
  const values = [
    membership.workshopId,
    id,
    requireText(customer.name, "Nome", 200),
    optionalText(customer.document, 40),
    requireText(customer.phone, "Telefone", 40),
    optionalText(customer.email, 320),
    optionalText(customer.notes, 4000),
  ];
  if (action === "customer.create") {
    await client.query(
      `INSERT INTO customers (workshop_id, id, name, document, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      values,
    );
  } else {
    const { rowCount } = await client.query(
      `UPDATE customers SET name = $3, document = $4, phone = $5, email = $6,
              notes = $7, updated_at = now() WHERE id = $2`,
      values,
    );
    assert(rowCount === 1, "Cliente não encontrado.");
  }
}

async function vehicleCommand(client, membership, action, payload) {
  requirePermission(membership, "vehicles:write");
  const id = requireUuid(payload?.id, "Veículo");
  if (action === "vehicle.delete") {
    const { rowCount } = await client.query("DELETE FROM vehicles WHERE id = $1", [id]);
    assert(rowCount === 1, "Veículo não encontrado ou vinculado a uma OS.");
    return;
  }
  const vehicle = payload?.record ?? {};
  const values = [
    membership.workshopId,
    id,
    requireUuid(vehicle.customerId, "Cliente"),
    requireText(vehicle.plate, "Placa", 8).toUpperCase(),
    requireText(vehicle.make, "Marca", 100),
    requireText(vehicle.model, "Modelo", 100),
    requireNumber(vehicle.year, "Ano", { min: 1886, max: 2200, integer: true }),
    optionalText(vehicle.color, 100),
    requireNumber(vehicle.mileage, "Quilometragem", { integer: true }),
    requireNumber(vehicle.fuelPercent, "Combustível", { max: 100, integer: true }),
    optionalText(vehicle.notes, 4000),
  ];
  if (action === "vehicle.create") {
    await client.query(
      `INSERT INTO vehicles (workshop_id, id, customer_id, plate, make, model, model_year, color, mileage, fuel_percent, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      values,
    );
  } else {
    const { rowCount } = await client.query(
      `UPDATE vehicles SET customer_id = $3, plate = $4, make = $5, model = $6,
              model_year = $7, color = $8, mileage = $9, fuel_percent = $10,
              notes = $11, updated_at = now() WHERE id = $2`,
      values,
    );
    assert(rowCount === 1, "Veículo não encontrado.");
  }
}

async function inventoryCommand(client, membership, action, payload) {
  requirePermission(membership, action === "part.delete" ? "inventory:write" : "inventory:write");
  const id = requireUuid(payload?.id, "Peça");
  if (action === "part.delete") {
    const usages = await client.query(
      "SELECT 1 FROM work_order_items WHERE inventory_item_id = $1 LIMIT 1",
      [id],
    );
    assert(!usages.rowCount, "A peça está vinculada ao histórico de uma OS.");
    const { rowCount } = await client.query(
      "UPDATE inventory_items SET active = false, updated_at = now() WHERE id = $1 AND active = true",
      [id],
    );
    assert(rowCount === 1, "Peça não encontrada.");
    return;
  }
  if (action === "part.adjust") {
    const amount = requireNumber(payload.amount, "Quantidade movimentada", {
      min: -999999,
      max: 999999,
      integer: true,
    });
    assert(amount !== 0, "A movimentação precisa ser diferente de zero.");
    const { rows } = await client.query(
      `UPDATE inventory_items SET quantity = quantity + $2, updated_at = now()
       WHERE id = $1 AND active = true AND quantity + $2 >= 0
       RETURNING quantity`,
      [id, amount],
    );
    assert(rows.length === 1, "O saldo da peça não pode ficar negativo.");
    await client.query(
      `INSERT INTO inventory_movements
         (workshop_id, id, inventory_item_id, movement_type, quantity_delta, reason, idempotency_key, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        membership.workshopId,
        randomUUID(),
        id,
        amount > 0 ? "inbound" : "outbound",
        amount,
        requireText(payload.reason ?? "Movimentação manual", "Motivo", 200),
        `manual:${randomUUID()}`,
        membership.userId,
      ],
    );
    return;
  }

  const part = payload?.record ?? {};
  const values = [
    membership.workshopId,
    id,
    requireText(part.code, "Código", 100),
    requireText(part.name, "Nome", 200),
    requireText(part.category || "Outros", "Categoria", 100),
    optionalText(part.brand, 100),
    optionalText(part.description, 4000),
    requireText(part.unit || "un", "Unidade", 20),
    requireNumber(part.minimumQuantity ?? 0, "Estoque mínimo", { max: 999999 }),
    requireNumber(part.costPrice ?? 0, "Custo unitário"),
    requireNumber(part.salePrice, "Preço de venda", { min: 0.01 }),
  ];
  if (action === "part.create") {
    const quantity = requireNumber(part.quantity ?? 0, "Saldo inicial", { max: 999999 });
    await client.query(
      `INSERT INTO inventory_items
         (workshop_id, id, sku, name, category, brand, description, unit, quantity,
          minimum_quantity, unit_cost, sale_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        quantity,
        ...values.slice(8),
      ],
    );
    if (quantity > 0) {
      await client.query(
        `INSERT INTO inventory_movements
           (workshop_id, id, inventory_item_id, movement_type, quantity_delta, reason, idempotency_key, created_by_user_id)
         VALUES ($1, $2, $3, 'inbound', $4, 'Saldo inicial da peça cadastrada', $5, $6)`,
        [membership.workshopId, randomUUID(), id, quantity, `initial:${id}`, membership.userId],
      );
    }
  } else {
    const { rowCount } = await client.query(
      `UPDATE inventory_items SET sku = $3, name = $4, category = $5, brand = $6,
              description = $7, unit = $8, minimum_quantity = $9, unit_cost = $10,
              sale_price = $11, updated_at = now() WHERE id = $2 AND active = true`,
      values,
    );
    assert(rowCount === 1, "Peça não encontrada.");
  }
}

async function financeCommand(client, membership, action, payload) {
  requirePermission(membership, "finance:write");
  const id = requireUuid(payload?.id, "Lançamento");
  if (action === "finance.delete") {
    const { rowCount } = await client.query(
      "DELETE FROM financial_entries WHERE id = $1 AND status <> 'paid'",
      [id],
    );
    assert(rowCount === 1, "Lançamento não encontrado ou já baixado.");
    return;
  }
  if (action === "finance.status") {
    const status = payload.status === "paid" ? "paid" : "pending";
    const { rowCount } = await client.query(
      `UPDATE financial_entries SET
         status = CASE WHEN $2 = 'paid' THEN 'paid'
                       WHEN due_date < ${businessDateSql} THEN 'overdue' ELSE 'pending' END,
         paid_at = CASE WHEN $2 = 'paid' THEN COALESCE(paid_at, now()) ELSE NULL END,
         updated_at = now()
       WHERE id = $1`,
      [id, status],
    );
    assert(rowCount === 1, "Lançamento não encontrado.");
    return;
  }
  const entry = payload?.record ?? {};
  const direction = entry.type;
  assert(financeDirections.has(direction), "Tipo de lançamento inválido.");
  const values = [
    membership.workshopId,
    id,
    entry.workOrderId ? requireUuid(entry.workOrderId, "Ordem de serviço") : null,
    direction,
    requireText(entry.description, "Descrição", 300),
    requireText(entry.category || "Outros", "Categoria", 100),
    requireNumber(entry.amount, "Valor", { min: 0.01, max: 999999999 }),
    dateOnly(entry.dueDate),
    optionalText(entry.paymentMethod, 30),
    optionalText(entry.notes, 4000),
  ];
  if (action === "finance.create") {
    await client.query(
      `INSERT INTO financial_entries
         (workshop_id, id, work_order_id, direction, status, description, category, amount,
          due_date, payment_method, notes, created_by_user_id)
       VALUES ($1, $2, $3, $4,
         CASE WHEN $8 < ${businessDateSql} THEN 'overdue' ELSE 'pending' END,
         $5, $6, $7, $8, $9, $10, $11)`,
      [...values, membership.userId],
    );
  } else {
    const { rowCount } = await client.query(
      `UPDATE financial_entries SET work_order_id = $3, direction = $4,
              description = $5, category = $6, amount = $7, due_date = $8,
              payment_method = $9, notes = $10,
              status = CASE WHEN $8 < ${businessDateSql} THEN 'overdue' ELSE 'pending' END,
              updated_at = now()
       WHERE id = $2 AND status <> 'paid'`,
      values,
    );
    assert(rowCount === 1, "Lançamento não encontrado ou já baixado.");
  }
}

async function workshopCommand(client, membership, payload) {
  requirePermission(membership, "workshop:write");
  const name = requireText(payload?.name, "Nome da oficina", 200);
  const cnpj = optionalText(payload?.cnpj, 18);
  const phone = optionalText(payload?.phone, 40);
  await client.query("UPDATE workshops SET name = $1, cnpj = $2, phone = $3, updated_at = now()", [
    name,
    cnpj,
    phone,
  ]);
}

export async function applyOperationalCommand(client, membership, action, payload) {
  assert(typeof action === "string", "Ação inválida.");
  if (action.startsWith("customer.")) return customerCommand(client, membership, action, payload);
  if (action.startsWith("vehicle.")) return vehicleCommand(client, membership, action, payload);
  if (action.startsWith("part.")) return inventoryCommand(client, membership, action, payload);
  if (action.startsWith("finance.")) return financeCommand(client, membership, action, payload);
  if (action.startsWith("work-order.")) {
    if (action === "work-order.delete") {
      requirePermission(membership, "work-orders:delete");
      const id = requireUuid(payload?.id, "Ordem de serviço");
      const [paid, movements] = await Promise.all([
        client.query(
          "SELECT 1 FROM financial_entries WHERE work_order_id = $1 AND status = 'paid' LIMIT 1",
          [id],
        ),
        client.query("SELECT 1 FROM inventory_movements WHERE work_order_id = $1 LIMIT 1", [id]),
      ]);
      assert(
        !paid.rowCount,
        "A OS tem recebimentos baixados. Preserve o histórico e cancele a OS.",
      );
      assert(
        !movements.rowCount,
        "A OS tem movimentações de estoque. Preserve o histórico e cancele a OS.",
      );
      await client.query("DELETE FROM financial_entries WHERE work_order_id = $1", [id]);
      const { rowCount } = await client.query("DELETE FROM work_orders WHERE id = $1", [id]);
      assert(rowCount === 1, "Ordem de serviço não encontrada.");
      return;
    }
    const isCreate = action === "work-order.create";
    assert(isCreate || action === "work-order.update", "Ação de OS não reconhecida.");
    return saveWorkOrder(client, membership, payload?.record, isCreate);
  }
  if (action === "workshop.update") return workshopCommand(client, membership, payload);
  throw new Error("Ação operacional não reconhecida.");
}

export function validateOperationalCommand(action, payload) {
  assert(operationalActions.has(action), "Ação inválida.");
  assert(
    payload && typeof payload === "object" && !Array.isArray(payload),
    "Dados da ação inválidos.",
  );
  let serializedPayload;
  try {
    serializedPayload = JSON.stringify(payload);
  } catch {
    throw new Error("Dados da ação inválidos.");
  }
  assert(
    Buffer.byteLength(serializedPayload ?? "", "utf8") <= 32 * 1024,
    "A solicitação excede o tamanho permitido.",
  );
}
