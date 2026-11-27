import { createHash, randomBytes } from "node:crypto";
import { chmod, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const lockName = "torque:schema-migrations";
const runtimeRoleName = "torque_app_runtime_restricted";
const runtimeMigrationName = "0005_security_controls.sql";
const envFilePath = path.resolve(".env.local");
const migrationsDirectory = fileURLToPath(new URL("../database/migrations/", import.meta.url));

function readValueFromEnvFile(contents, key) {
  const line = contents
    .split(/\r?\n/)
    .find((entry) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(entry));
  if (!line) return undefined;

  const rawValue = line.replace(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`), "").trim();
  const quoted = rawValue.match(/^(['"])(.*)\1$/);
  return (quoted ? quoted[2] : rawValue) || undefined;
}

async function readEnvironmentValue(key) {
  if (process.env[key]?.trim()) return process.env[key].trim();

  for (const fileName of [".env.local", ".env"]) {
    try {
      const contents = await readFile(path.resolve(fileName), "utf8");
      const value = readValueFromEnvFile(contents, key);
      if (value) return value;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return undefined;
}

function validatePostgresUrl(value, variableName, requireDirect = false) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} precisa ser uma URL PostgreSQL válida.`);
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${variableName} precisa usar o protocolo PostgreSQL.`);
  }
  if (requireDirect && /-pooler(?:\.|$)/i.test(parsed.hostname)) {
    throw new Error(`${variableName} precisa ser uma conexão direta, sem pooler.`);
  }
  return parsed;
}

function decodeUrlUsername(parsedUrl) {
  try {
    return decodeURIComponent(parsedUrl.username);
  } catch {
    return parsedUrl.username;
  }
}

function buildRuntimeConnectionString(adminUrl, currentRuntimeUrl, password) {
  const parsed = new URL(currentRuntimeUrl || adminUrl);
  parsed.username = runtimeRoleName;
  parsed.password = password;
  return parsed.toString();
}

async function inspectRuntimeRole(client) {
  const { rows } = await client.query(
    `SELECT role.rolsuper, role.rolbypassrls, role.rolcreaterole,
            role.rolcreatedb, role.rolreplication,
            EXISTS (
              SELECT 1 FROM pg_roles AS granted_role
              WHERE granted_role.oid <> role.oid
                AND pg_has_role(role.oid, granted_role.oid, 'MEMBER')
            ) AS has_role_memberships,
            EXISTS (
              SELECT 1
              FROM pg_class AS relation
              JOIN pg_namespace AS namespace_info ON namespace_info.oid = relation.relnamespace
              WHERE namespace_info.nspname = 'public'
                AND relation.relkind IN ('r', 'p')
                AND relation.relowner = role.oid
            ) AS owns_public_tables
     FROM pg_roles AS role
     WHERE role.rolname = $1`,
    [runtimeRoleName],
  );
  return rows[0];
}

async function verifyRuntimeConnection(connectionString) {
  if (!connectionString) {
    throw new Error("DATABASE_URL não está configurada para o runtime.");
  }

  const runtimeClient = new Client({
    connectionString,
    application_name: "torque-db-runtime-verification",
  });
  try {
    await runtimeClient.connect();
    const { rows } = await runtimeClient.query(
      `SELECT role.rolname, role.rolsuper, role.rolbypassrls,
              role.rolcreaterole, role.rolcreatedb, role.rolreplication,
              EXISTS (
                SELECT 1 FROM pg_roles AS granted_role
                WHERE granted_role.oid <> role.oid
                  AND pg_has_role(role.oid, granted_role.oid, 'MEMBER')
              ) AS has_role_memberships,
              EXISTS (
                SELECT 1
                FROM pg_class AS relation
                JOIN pg_namespace AS namespace_info ON namespace_info.oid = relation.relnamespace
                WHERE namespace_info.nspname = 'public'
                  AND relation.relkind IN ('r', 'p')
                  AND relation.relname IN (
                    'workshops', 'workshop_memberships', 'customers', 'vehicles',
                    'inventory_items', 'work_orders', 'work_order_items',
                    'inventory_movements', 'financial_entries', 'work_order_photos',
                    'work_order_photo_uploads', 'work_order_checklist_items',
                    'work_order_timeline_events', 'workshop_invitations',
                    'audit_events', 'workshop_security_rate_limits'
                  )
                  AND relation.relowner = role.oid
              ) AS owns_application_table,
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
      role.has_role_memberships ||
      role.owns_application_table ||
      role.can_create_in_public ||
      role.has_dangerous_table_privileges
    ) {
      throw new Error("DATABASE_URL não está usando a role restrita esperada.");
    }
    await runtimeClient.query("SELECT 1 FROM workshop_security_rate_limits LIMIT 0");
    await runtimeClient.query("SELECT 1 FROM audit_events LIMIT 0");
  } finally {
    await runtimeClient.end().catch(() => {});
  }
}

async function ensureRestrictedRuntimeRole(client, adminUrl, configuredRuntimeUrl) {
  const existingRuntimeUrl = configuredRuntimeUrl
    ? validatePostgresUrl(configuredRuntimeUrl, "DATABASE_URL")
    : undefined;
  const runtimeUrlUsesRestrictedRole =
    existingRuntimeUrl && decodeUrlUsername(existingRuntimeUrl) === runtimeRoleName;
  const currentRole = await inspectRuntimeRole(client);

  if (currentRole) {
    if (
      currentRole.rolsuper ||
      currentRole.rolbypassrls ||
      currentRole.rolcreaterole ||
      currentRole.rolcreatedb ||
      currentRole.rolreplication ||
      currentRole.has_role_memberships ||
      currentRole.owns_public_tables
    ) {
      throw new Error(
        "A role torque_app_runtime_restricted já existe com privilégios inesperados; a migration foi interrompida sem alterá-la.",
      );
    }
    if (!runtimeUrlUsesRestrictedRole || !existingRuntimeUrl.password) {
      throw new Error(
        "A role torque_app_runtime_restricted já existe, mas DATABASE_URL local não usa essa role. Atualize a conexão local antes de repetir a migration.",
      );
    }
    return {
      created: false,
      connectionString: configuredRuntimeUrl,
    };
  }

  const password = randomBytes(32).toString("base64url");

  await client.query(
    `CREATE ROLE ${runtimeRoleName}
       WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
       NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20
       PASSWORD '${password}'`,
  );

  return {
    created: true,
    connectionString: buildRuntimeConnectionString(adminUrl, configuredRuntimeUrl, password),
  };
}

async function rotateRestrictedRuntimeCredential(client, adminUrl, configuredRuntimeUrl) {
  if (!configuredRuntimeUrl) {
    throw new Error("DATABASE_URL local não está configurada para a role restrita.");
  }
  const parsedRuntimeUrl = validatePostgresUrl(configuredRuntimeUrl, "DATABASE_URL");
  if (decodeUrlUsername(parsedRuntimeUrl) !== runtimeRoleName) {
    throw new Error("DATABASE_URL local não usa a role restrita esperada para rotação.");
  }

  const currentRole = await inspectRuntimeRole(client);
  if (
    !currentRole ||
    currentRole.rolsuper ||
    currentRole.rolbypassrls ||
    currentRole.rolcreaterole ||
    currentRole.rolcreatedb ||
    currentRole.rolreplication ||
    currentRole.has_role_memberships ||
    currentRole.owns_public_tables
  ) {
    throw new Error("A role de runtime não passou nas verificações de privilégios para rotação.");
  }

  const nextPassword = randomBytes(32).toString("base64url");
  const nextConnectionString = buildRuntimeConnectionString(
    adminUrl,
    configuredRuntimeUrl,
    nextPassword,
  );
  const environmentSnapshot = await writeRuntimeConnectionString(nextConnectionString);
  try {
    await client.query(`ALTER ROLE ${runtimeRoleName} PASSWORD '${nextPassword}'`);
  } catch (error) {
    await restoreLocalEnv(environmentSnapshot).catch(() => {});
    throw error;
  }

  return { connectionString: nextConnectionString };
}

async function writeLocalEnvContents(contents) {
  const temporaryPath = `${envFilePath}.torque-migrate-tmp`;
  await writeFile(temporaryPath, contents, { encoding: "utf8", mode: 0o600 });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, envFilePath);
  await chmod(envFilePath, 0o600);
}

async function writeRuntimeConnectionString(connectionString) {
  let fileExists = true;
  let previousContents = "";
  try {
    previousContents = await readFile(envFilePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") fileExists = false;
    else throw error;
  }

  const lines = previousContents ? previousContents.split(/\r?\n/) : [];
  const runtimeLine = `DATABASE_URL="${connectionString}"`;
  const lineIndex = lines.findIndex((line) => /^\s*(?:export\s+)?DATABASE_URL\s*=/.test(line));
  if (lineIndex >= 0) {
    lines[lineIndex] = runtimeLine;
  } else {
    if (lines.length > 0 && lines.at(-1) !== "") lines.push("");
    lines.push(runtimeLine);
  }

  const nextContents = `${lines.join("\n").replace(/\n*$/, "\n")}`;
  await writeLocalEnvContents(nextContents);
  return { fileExists, previousContents };
}

async function restoreLocalEnv(snapshot) {
  if (snapshot.fileExists) {
    await writeLocalEnvContents(snapshot.previousContents);
    return;
  }
  await unlink(envFilePath).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

async function removeCreatedRuntimeRole(client) {
  await client.query(`DROP ROLE IF EXISTS ${runtimeRoleName}`).catch(() => {});
}

function sanitizeErrorMessage(error) {
  return String(error?.message || "Falha sem mensagem detalhada.")
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "[URL PostgreSQL ocultada]")
    .replace(/SCRAM-SHA-256\$[^\s'"`]+/gi, "[verificador de senha ocultado]")
    .replace(/\bPASSWORD\s+'[^']*'/gi, "PASSWORD '[oculto]'")
    .replace(/\b(DATABASE_ADMIN_URL|DATABASE_URL)\s*[:=]\s*[^\s,;]+/gi, "$1=[oculto]")
    .slice(0, 300);
}

async function runMigrations() {
  const connectionString = await readEnvironmentValue("DATABASE_ADMIN_URL");
  const configuredRuntimeUrl = await readEnvironmentValue("DATABASE_URL");
  if (!connectionString) {
    throw new Error("DATABASE_ADMIN_URL não foi definido no ambiente, .env.local ou .env.");
  }
  const adminUrl = validatePostgresUrl(connectionString, "DATABASE_ADMIN_URL", true);

  const client = new Client({ connectionString, application_name: "torque-db-migrations" });
  let lockAcquired = false;
  let createdRuntimeRole = false;
  let runtimeEnvironmentSnapshot;
  let runtimeMigrationCommitted = false;
  let runtimeConnectionString;

  try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);
    lockAcquired = true;

    await client.query(
      "CREATE TABLE IF NOT EXISTS public.schema_migrations (migration_name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );

    const migrationNames = (await readdir(migrationsDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const migrationName of migrationNames) {
      const contents = await readFile(path.join(migrationsDirectory, migrationName), "utf8");
      const checksum = createHash("sha256").update(contents).digest("hex");
      const existing = await client.query(
        "SELECT checksum FROM public.schema_migrations WHERE migration_name = $1",
        [migrationName],
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(
            "A migration aplicada " + migrationName + " foi alterada. Crie uma nova migration.",
          );
        }
        continue;
      }

      if (migrationName === runtimeMigrationName) {
        const runtimeRole = await ensureRestrictedRuntimeRole(
          client,
          adminUrl.toString(),
          configuredRuntimeUrl,
        );
        createdRuntimeRole = runtimeRole.created;
        runtimeConnectionString = runtimeRole.connectionString;
        runtimeEnvironmentSnapshot = await writeRuntimeConnectionString(
          runtimeRole.connectionString,
        );
      }

      await client.query("BEGIN");
      try {
        await client.query(contents);
        await client.query(
          "INSERT INTO public.schema_migrations (migration_name, checksum) VALUES ($1, $2)",
          [migrationName, checksum],
        );
        await client.query("COMMIT");
        if (migrationName === runtimeMigrationName) runtimeMigrationCommitted = true;
        console.info("Migration aplicada: " + migrationName);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    if (runtimeEnvironmentSnapshot) {
      console.info("DATABASE_URL local atualizado para a role de runtime restrita.");
    }
    if (process.env.TORQUE_ROTATE_RUNTIME_CREDENTIALS === "1") {
      const rotatedRuntime = await rotateRestrictedRuntimeCredential(
        client,
        adminUrl.toString(),
        await readEnvironmentValue("DATABASE_URL"),
      );
      runtimeConnectionString = rotatedRuntime.connectionString;
      runtimeMigrationCommitted = true;
      console.info("Credencial da role de runtime rotacionada e salva somente em .env.local.");
    }
    await verifyRuntimeConnection(
      runtimeConnectionString || (await readEnvironmentValue("DATABASE_URL")),
    );
    console.info("Role de runtime e permissões mínimas verificadas.");
    console.info("Banco atualizado.");
  } catch (error) {
    if (!runtimeMigrationCommitted) {
      if (runtimeEnvironmentSnapshot)
        await restoreLocalEnv(runtimeEnvironmentSnapshot).catch(() => {});
      if (createdRuntimeRole) await removeCreatedRuntimeRole(client);
    }
    throw error;
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]).catch(() => {});
    }
    await client.end().catch(() => {});
  }
}

runMigrations().catch((error) => {
  console.error("Não foi possível aplicar as migrations.", {
    code: typeof error?.code === "string" ? error.code : "UNKNOWN",
    name: typeof error?.name === "string" ? error.name : "Error",
    message: sanitizeErrorMessage(error),
  });
  process.exitCode = 1;
});
