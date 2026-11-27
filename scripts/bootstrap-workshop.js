import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { z } from "zod";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
const configFiles = [".env.local", ".env"];

async function readConfigValue(key) {
  if (process.env[key]) return process.env[key];

  for (const fileName of configFiles) {
    try {
      const contents = await readFile(path.join(projectDirectory, fileName), "utf8");
      const line = contents
        .split(/\r?\n/)
        .find((entry) => new RegExp(`^\\s*${key}\\s*=`).test(entry));
      if (!line) continue;

      const value = line.replace(new RegExp(`^\\s*${key}\\s*=`), "").trim();
      const unquoted = value.replace(
        /^(?:"(.*)"|'(.*)')$/,
        (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted ?? "",
      );
      if (unquoted) return unquoted;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return undefined;
}

async function bootstrapWorkshop() {
  const values = await Promise.all(
    [
      "DATABASE_ADMIN_URL",
      "CLERK_SECRET_KEY",
      "TORQUE_BOOTSTRAP_OWNER_CLERK_ID",
      "TORQUE_BOOTSTRAP_OWNER_NAME",
      "TORQUE_BOOTSTRAP_OWNER_EMAIL",
      "TORQUE_BOOTSTRAP_WORKSHOP_NAME",
      "TORQUE_BOOTSTRAP_WORKSHOP_CNPJ",
      "TORQUE_BOOTSTRAP_WORKSHOP_PHONE",
    ].map(readConfigValue),
  );
  const [
    adminConnectionString,
    clerkSecretKey,
    ownerUserId,
    ownerName,
    ownerEmail,
    workshopName,
    cnpj,
    phone,
  ] = values;
  const connectionString = adminConnectionString;

  if (!connectionString) throw new Error("DATABASE_ADMIN_URL não foi configurado.");
  const parsedConnection = new URL(connectionString);
  if (
    !["postgres:", "postgresql:"].includes(parsedConnection.protocol) ||
    /-pooler(?:\.|$)/i.test(parsedConnection.hostname)
  ) {
    throw new Error("DATABASE_ADMIN_URL precisa ser uma conexão PostgreSQL direta, sem pooler.");
  }
  if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY não foi configurado.");
  if (!ownerUserId || !/^user_[A-Za-z0-9_-]+$/.test(ownerUserId)) {
    throw new Error("Informe um ID de usuário Clerk válido em TORQUE_BOOTSTRAP_OWNER_CLERK_ID.");
  }

  const validated = z
    .object({
      ownerName: z.string().trim().min(1).max(200),
      ownerEmail: z.string().trim().toLowerCase().email().max(320),
      workshopName: z.string().trim().min(1).max(200),
      cnpj: z.string().trim().max(18).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .parse({ ownerName, ownerEmail, workshopName, cnpj, phone });

  const clerkResponse = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(ownerUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!clerkResponse.ok) {
    throw new Error("Não foi possível confirmar a conta owner na instância Clerk configurada.");
  }
  const clerkUser = await clerkResponse.json();
  const verifiedOwnerEmail = clerkUser.email_addresses?.find(
    (emailAddress) =>
      emailAddress.email_address?.trim().toLowerCase() === validated.ownerEmail &&
      emailAddress.verification?.status === "verified",
  );
  if (clerkUser.id !== ownerUserId || !verifiedOwnerEmail) {
    throw new Error("O ID e o e-mail do owner precisam corresponder a uma conta Clerk verificada.");
  }

  const client = new Client({ connectionString, application_name: "torque-workshop-bootstrap" });
  let transactionOpen = false;

  try {
    await client.connect();
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `torque:bootstrap:${ownerUserId}`,
    ]);
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [ownerUserId]);
    const existingMembership = await client.query(
      `SELECT workshop_id FROM workshop_memberships
       WHERE auth_user_id = $1 AND active = true AND joined_at IS NOT NULL
       LIMIT 1`,
      [ownerUserId],
    );
    if (existingMembership.rowCount) {
      throw new Error("Esta conta Clerk já está vinculada a uma oficina ativa.");
    }

    const workshopId = randomUUID();
    await client.query(
      "SELECT set_config('app.current_workshop_id', $1, true), set_config('app.current_user_id', $2, true)",
      [workshopId, ownerUserId],
    );
    await client.query(
      `INSERT INTO workshops (id, name, cnpj, phone)
       VALUES ($1, $2, $3, $4)`,
      [workshopId, validated.workshopName, validated.cnpj || null, validated.phone || null],
    );
    await client.query(
      `INSERT INTO workshop_memberships
         (workshop_id, auth_user_id, display_name, email, role, active, joined_at)
       VALUES ($1, $2, $3, $4, 'owner', true, now())`,
      [workshopId, ownerUserId, validated.ownerName, validated.ownerEmail],
    );
    await client.query(
      `INSERT INTO audit_events
         (workshop_id, actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'workshop.bootstrap', 'workshop', $1, '{"source":"local-cli","version":1}'::jsonb)`,
      [workshopId, ownerUserId],
    );
    await client.query("COMMIT");
    transactionOpen = false;
    console.info(`Oficina criada e owner associado. ID da oficina: ${workshopId}`);
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

bootstrapWorkshop().catch((error) => {
  console.error("Falha ao iniciar a oficina.", {
    code: typeof error?.code === "string" ? error.code : "UNKNOWN",
    name: typeof error?.name === "string" ? error.name : "Error",
  });
  process.exitCode = 1;
});
