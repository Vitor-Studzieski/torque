import { auth } from "@clerk/tanstack-react-start/server";
import {
  consumeWorkshopRateLimit,
  withUserTransaction,
  withWorkshopTransaction,
} from "@/lib/server/database";
import { isClerkConfiguredForRuntime } from "@/lib/server/production-config";

const ROLE_PERMISSIONS = {
  owner: ["*"],
  manager: [
    "customers:read",
    "customers:write",
    "vehicles:read",
    "vehicles:write",
    "work-orders:read",
    "work-orders:create",
    "work-orders:operate",
    "work-orders:intake",
    "work-orders:quote",
    "work-orders:approve",
    "work-orders:checklist",
    "work-orders:delete",
    "work-orders:assign",
    "photos:read",
    "photos:write",
    "photos:delete",
    "inventory:read",
    "inventory:write",
    "finance:read",
    "finance:write",
    "reports:read",
    "workshop:write",
    "team:invite",
    "team:read",
  ],
  attendant: [
    "customers:read",
    "customers:write",
    "vehicles:read",
    "vehicles:write",
    "work-orders:read",
    "work-orders:create",
    "work-orders:intake",
    "work-orders:quote",
    "work-orders:checklist",
    "inventory:read",
    "photos:read",
    "photos:write",
  ],
  mechanic: [
    "work-orders:read",
    "work-orders:operate",
    "work-orders:checklist",
    "photos:read",
    "photos:write",
    "inventory:read",
  ],
  finance: [
    "finance:read",
    "finance:write",
    "reports:read",
    "work-orders:read",
    "customers:read",
    "vehicles:read",
  ],
};

export class WorkshopAccessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WorkshopAccessError";
    this.code = code;
  }
}

export function roleHasWorkshopPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && (permissions.includes("*") || permissions.includes(permission)));
}

export async function findActiveWorkshopMembership(request, userId) {
  return withUserTransaction(request, { userId }, async (client) => {
    const { rows } = await client.query(
      `SELECT workshop_id, display_name, role
       FROM workshop_memberships
       WHERE auth_user_id = $1 AND active = true AND joined_at IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 2`,
      [userId],
    );

    if (rows.length === 0) return { status: "none", membership: null };
    if (rows.length > 1) return { status: "multiple", membership: null };

    const row = rows[0];
    return {
      status: "active",
      membership: {
        workshopId: row.workshop_id,
        displayName: row.display_name,
        role: row.role,
      },
    };
  });
}

/**
 * Resolves the Clerk identity and workshop membership on the server, checks the
 * product role, then opens a transaction with RLS context for that workshop.
 */
function validateRateLimit(rateLimit) {
  if (rateLimit == null) return;
  const { scope, maximum, windowSeconds } = rateLimit;
  if (
    typeof scope !== "string" ||
    !/^[a-z][a-z0-9._-]{0,79}$/.test(scope) ||
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    maximum > 10_000 ||
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    windowSeconds > 86_400
  ) {
    throw new TypeError("A configuração do limite de requisições não é válida.");
  }
}

export async function withAuthorizedWorkshopTransaction(
  request,
  { permission, rateLimit },
  operation,
) {
  validateRateLimit(rateLimit);
  if (!isClerkConfiguredForRuntime()) {
    throw new WorkshopAccessError(
      "authentication-unconfigured",
      "A autenticação Clerk não está configurada para este ambiente.",
    );
  }
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    throw new WorkshopAccessError("unauthenticated", "É necessário entrar na conta.");
  }

  const membershipResult = await findActiveWorkshopMembership(request, session.userId);
  if (membershipResult.status !== "active") {
    throw new WorkshopAccessError(
      "workshop-membership-required",
      "A conta não está vinculada a uma oficina ativa.",
    );
  }

  if (!roleHasWorkshopPermission(membershipResult.membership.role, permission)) {
    throw new WorkshopAccessError("forbidden", "O papel desta conta não permite esta ação.");
  }

  const membership = { ...membershipResult.membership, userId: session.userId };
  if (
    rateLimit &&
    !(await consumeWorkshopRateLimit({
      ...rateLimit,
      workshopId: membership.workshopId,
      userId: membership.userId,
    }))
  ) {
    throw new WorkshopAccessError(
      "rate-limited",
      "Muitas ações em pouco tempo. Aguarde um instante e tente novamente.",
    );
  }

  return withWorkshopTransaction(
    request,
    { workshopId: membership.workshopId, userId: membership.userId },
    (client) => operation(client, membership),
  );
}
