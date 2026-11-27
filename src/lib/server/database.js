import { Pool } from "pg";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const runtimeRoleName = "torque_app_runtime_restricted";
const poolKey = Symbol.for("torque.databasePool");
const runtimeRoleVerifiedKey = Symbol.for("torque.databaseRuntimeRoleVerified");
const applicationTables = [
  "workshops",
  "workshop_memberships",
  "customers",
  "vehicles",
  "inventory_items",
  "work_orders",
  "work_order_items",
  "inventory_movements",
  "financial_entries",
  "work_order_photos",
  "work_order_photo_uploads",
  "work_order_checklist_items",
  "work_order_timeline_events",
  "workshop_invitations",
  "audit_events",
  "workshop_security_rate_limits",
];

export function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Banco de dados não configurado para esta execução.");
  }

  if (!globalThis[poolKey]) {
    const pool = new Pool({
      connectionString,
      application_name: "torque-vercel",
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", () => {
      console.error("Uma conexão PostgreSQL ociosa foi encerrada inesperadamente.");
    });
    globalThis[poolKey] = pool;
  }

  return globalThis[poolKey];
}

async function assertLeastPrivilegeRuntimeRole(client) {
  if (globalThis[runtimeRoleVerifiedKey] === true) return;

  const { rows } = await client.query(
    `SELECT role.rolname, role.rolsuper, role.rolbypassrls, role.rolcreaterole,
            role.rolcreatedb, role.rolreplication,
            EXISTS (
              SELECT 1
              FROM pg_class AS relation
              JOIN pg_namespace AS namespace_info ON namespace_info.oid = relation.relnamespace
              WHERE namespace_info.nspname = 'public'
                AND relation.relkind IN ('r', 'p')
                AND relation.relname = ANY($1::text[])
                AND relation.relowner = role.oid
            ) AS owns_application_table,
            EXISTS (
              SELECT 1
              FROM pg_roles AS granted_role
              WHERE granted_role.oid <> role.oid
                AND pg_has_role(role.oid, granted_role.oid, 'MEMBER')
            ) AS has_role_memberships,
            has_schema_privilege(role.oid, 'public', 'CREATE') AS can_create_in_public,
            (
              has_table_privilege(role.oid, 'public.workshops', 'INSERT') OR
              has_table_privilege(role.oid, 'public.workshops', 'DELETE') OR
              has_table_privilege(role.oid, 'public.workshops', 'TRUNCATE') OR
              has_table_privilege(role.oid, 'public.workshop_memberships', 'DELETE') OR
              has_table_privilege(role.oid, 'public.workshop_memberships', 'TRUNCATE') OR
              has_table_privilege(role.oid, 'public.audit_events', 'UPDATE') OR
              has_table_privilege(role.oid, 'public.audit_events', 'DELETE') OR
              has_table_privilege(role.oid, 'public.audit_events', 'TRUNCATE')
            ) AS has_dangerous_table_privileges
     FROM pg_roles AS role
     WHERE role.rolname = current_user`,
    [applicationTables],
  );
  const role = rows[0];
  if (
    !role ||
    role.rolname !== runtimeRoleName ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreaterole ||
    role.rolcreatedb ||
    role.rolreplication ||
    role.owns_application_table ||
    role.has_role_memberships ||
    role.can_create_in_public ||
    role.has_dangerous_table_privileges
  ) {
    const error = new Error(
      "DATABASE_URL precisa usar torque_app_runtime_restricted sem privilégios administrativos, associação a outros papéis ou propriedade das tabelas da aplicação.",
    );
    error.code = "DATABASE_RUNTIME_ROLE_UNSAFE";
    throw error;
  }

  globalThis[runtimeRoleVerifiedKey] = true;
}

export async function writeAuditEvent(client, membership, event) {
  const { action, entityType, entityId, details = {} } = event ?? {};
  if (
    typeof action !== "string" ||
    action.length < 1 ||
    action.length > 120 ||
    typeof entityType !== "string" ||
    entityType.length < 1 ||
    entityType.length > 80 ||
    typeof entityId !== "string" ||
    entityId.length < 1 ||
    entityId.length > 255 ||
    !details ||
    typeof details !== "object" ||
    Array.isArray(details)
  ) {
    throw new TypeError("Os dados do evento de auditoria não são válidos.");
  }

  await client.query(
    `INSERT INTO audit_events
       (workshop_id, actor_user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      membership.workshopId,
      membership.userId,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
    ],
  );
}

export async function consumeWorkshopRateLimit({
  workshopId,
  userId,
  scope,
  maximum,
  windowSeconds,
}) {
  if (
    !uuidPattern.test(workshopId ?? "") ||
    typeof userId !== "string" ||
    userId.length < 1 ||
    userId.length > 255 ||
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

  return withWorkshopTransaction(null, { workshopId, userId }, async (client) => {
    await client.query(
      "DELETE FROM workshop_security_rate_limits WHERE updated_at < now() - interval '2 days'",
    );
    const { rows } = await client.query(
      `INSERT INTO workshop_security_rate_limits
         (workshop_id, scope, subject_user_id, window_started_at, request_count, updated_at)
       VALUES ($1, $2, $3, now(), 1, now())
       ON CONFLICT (workshop_id, scope, subject_user_id)
       DO UPDATE SET
         window_started_at = CASE
           WHEN now() >= workshop_security_rate_limits.window_started_at + ($5::integer * interval '1 second')
           THEN now()
           ELSE workshop_security_rate_limits.window_started_at
         END,
         request_count = CASE
           WHEN now() >= workshop_security_rate_limits.window_started_at + ($5::integer * interval '1 second')
           THEN 1
           ELSE LEAST(workshop_security_rate_limits.request_count + 1, $4::integer + 1)
         END,
         updated_at = now()
       RETURNING request_count`,
      [workshopId, scope, userId, maximum, windowSeconds],
    );
    return Number(rows[0]?.request_count ?? 0) <= maximum;
  });
}

export async function verifyDatabaseReadiness() {
  const client = await getDatabasePool().connect();
  let transactionOpen = false;
  let destroyClient = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await assertLeastPrivilegeRuntimeRole(client);
    await client.query("SELECT 1 FROM workshop_security_rate_limits LIMIT 0");
    await client.query("SELECT 1 FROM audit_events LIMIT 0");
    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {
        destroyClient = true;
      });
    }
    throw error;
  } finally {
    client.release(destroyClient);
  }
}

/**
 * Runs a database operation with transaction-local tenant context for PostgreSQL RLS.
 * workshopId must come from a verified server-side membership, never directly from client input.
 */
export async function withWorkshopTransaction(_event, { workshopId, userId }, operation) {
  if (!uuidPattern.test(workshopId ?? "")) {
    throw new TypeError("O identificador da oficina não é válido.");
  }
  if (typeof userId !== "string" || userId.length === 0 || userId.length > 255) {
    throw new TypeError("O identificador do usuário não é válido.");
  }
  if (typeof operation !== "function") {
    throw new TypeError("A operação do banco precisa ser uma função.");
  }

  const client = await getDatabasePool().connect();
  let transactionOpen = false;
  let destroyClient = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await assertLeastPrivilegeRuntimeRole(client);
    await client.query(
      "SELECT set_config('app.current_workshop_id', $1, true), set_config('app.current_user_id', $2, true)",
      [workshopId, userId],
    );

    const result = await operation(client);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {
        destroyClient = true;
      });
    }
    throw error;
  } finally {
    client.release(destroyClient);
  }
}

/**
 * Runs an identity-scoped lookup before a workshop is known.
 * The user ID must come from a verified server-side authentication session.
 */
export async function withUserTransaction(_event, { userId }, operation) {
  if (typeof userId !== "string" || userId.length === 0 || userId.length > 255) {
    throw new TypeError("O identificador do usuário não é válido.");
  }
  if (typeof operation !== "function") {
    throw new TypeError("A operação do banco precisa ser uma função.");
  }

  const client = await getDatabasePool().connect();
  let transactionOpen = false;
  let destroyClient = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await assertLeastPrivilegeRuntimeRole(client);
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);

    const result = await operation(client);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {
        destroyClient = true;
      });
    }
    throw error;
  } finally {
    client.release(destroyClient);
  }
}
