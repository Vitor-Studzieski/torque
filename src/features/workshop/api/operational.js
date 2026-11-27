import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  WorkshopAccessError,
  withAuthorizedWorkshopTransaction,
} from "@/lib/server/workshop-access";
import { writeAuditEvent } from "@/lib/server/database";
import {
  applyOperationalCommand,
  loadOperationalSnapshot,
  validateOperationalCommand,
} from "@/lib/server/operational-data";

export const getWorkshopOperationalData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await withAuthorizedWorkshopTransaction(
      getRequest(),
      {
        permission: "work-orders:read",
        rateLimit: { scope: "operational-snapshot-read", maximum: 120, windowSeconds: 60 },
      },
      loadOperationalSnapshot,
    );
  } catch (error) {
    if (error instanceof WorkshopAccessError) throw error;
    console.error("Falha ao carregar os dados operacionais.", {
      code: typeof error?.code === "string" ? error.code : "UNKNOWN",
    });
    throw new Error("Não foi possível carregar os dados da oficina.");
  }
});

export const runWorkshopOperationalCommand = createServerFn({ method: "POST" })
  .validator(
    z.object({
      action: z.string().min(1).max(80),
      payload: z.unknown(),
    }),
  )
  .handler(async ({ data }) => {
    validateOperationalCommand(data.action, data.payload);
    try {
      return await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "work-orders:read",
          rateLimit: { scope: "operational-command", maximum: 60, windowSeconds: 60 },
        },
        async (client, membership) => {
          await applyOperationalCommand(client, membership, data.action, data.payload);
          const entityTypes = {
            customer: "customer",
            vehicle: "vehicle",
            part: "inventory_item",
            finance: "financial_entry",
            "work-order": "work_order",
            workshop: "workshop",
          };
          const payload = data.payload;
          const candidateIds = [
            payload.id,
            payload.record?.id,
            payload.workOrderId,
            payload.work_order_id,
          ];
          const entityId =
            candidateIds.find(
              (value) =>
                typeof value === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  value,
                ),
            ) ?? membership.workshopId;
          const entityType = entityTypes[data.action.split(".")[0]] ?? "workshop";
          await writeAuditEvent(client, membership, {
            action: data.action,
            entityType,
            entityId,
            details: { source: "operational-command", version: 1 },
          });
          return loadOperationalSnapshot(client, membership);
        },
      );
    } catch (error) {
      if (error instanceof WorkshopAccessError || !error?.code) throw error;
      console.error("Falha ao executar operação da oficina.", { code: error.code });
      throw new Error("Não foi possível salvar a alteração no banco.");
    }
  });
