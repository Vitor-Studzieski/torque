import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  WorkshopAccessError,
  withAuthorizedWorkshopTransaction,
} from "@/lib/server/workshop-access";
import { writeAuditEvent } from "@/lib/server/database";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_WORKSHOP_PHOTO_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_PHOTOS_PER_WORK_ORDER = 50;
const SIGNED_URL_TTL_SECONDS = 300;
const CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const PHOTO_TITLES = {
  entry: "Entrada do veículo",
  damage: "Avaria identificada",
  part: "Peça substituída",
  work: "Execução do serviço",
  delivery: "Saída do veículo",
};
class PhotoStorageConfigurationError extends Error {
  constructor() {
    super("O armazenamento privado de fotos ainda não está configurado.");
    this.name = "PhotoStorageConfigurationError";
  }
}

let supabaseStorageClient;
function getSupabaseStorageConfig() {
  const endpoint = process.env.SUPABASE_STORAGE_ENDPOINT;
  const region = process.env.SUPABASE_STORAGE_REGION;
  const accessKeyId = process.env.SUPABASE_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new PhotoStorageConfigurationError();
  }

  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new PhotoStorageConfigurationError();
  }
  if (
    parsedEndpoint.protocol !== "https:" ||
    !parsedEndpoint.hostname.endsWith(".storage.supabase.co") ||
    parsedEndpoint.pathname !== "/storage/v1/s3" ||
    parsedEndpoint.username ||
    parsedEndpoint.password ||
    parsedEndpoint.search ||
    parsedEndpoint.hash ||
    !/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(bucket)
  ) {
    throw new PhotoStorageConfigurationError();
  }

  if (!supabaseStorageClient) {
    supabaseStorageClient = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      maxAttempts: 2,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return { client: supabaseStorageClient, bucket };
}

function cleanOriginalName(value) {
  const cleaned = Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join("")
    .replaceAll("/", "_")
    .replaceAll("\\", "_")
    .trim()
    .slice(0, 255);
  return cleaned || "foto";
}

function isHeicContainer(buffer) {
  if (buffer.length < 16 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const boxLength = buffer.readUInt32BE(0);
  if (boxLength < 16 || boxLength > buffer.length) return false;
  const heicBrands = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
  if (heicBrands.has(buffer.toString("ascii", 8, 12))) return true;
  for (let offset = 16; offset + 4 <= boxLength; offset += 4) {
    if (heicBrands.has(buffer.toString("ascii", offset, offset + 4))) return true;
  }
  return false;
}

async function normalizeImage(buffer, expectedContentType) {
  if (expectedContentType === "image/heic") {
    if (!isHeicContainer(buffer)) throw new Error("A foto enviada não é uma imagem HEIC válida.");
    return { buffer, contentType: "image/heic", extension: "heic" };
  }

  const expectedFormats = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const expectedFormat = expectedFormats[expectedContentType];
  if (!expectedFormat) throw new Error("Formato de imagem não permitido.");

  const inputOptions = {
    failOn: "error",
    limitInputPixels: MAX_IMAGE_PIXELS,
    sequentialRead: true,
  };
  const metadata = await sharp(buffer, inputOptions).metadata();
  if (
    metadata.format !== expectedFormat ||
    !Number.isInteger(metadata.width) ||
    !Number.isInteger(metadata.height) ||
    metadata.width < 1 ||
    metadata.height < 1 ||
    metadata.width * metadata.height > MAX_IMAGE_PIXELS ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new Error("A foto enviada não corresponde a uma imagem estática válida.");
  }

  const normalizedBuffer = await sharp(buffer, inputOptions)
    .rotate()
    .resize({ width: 6000, height: 6000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
  if (normalizedBuffer.length < 1 || normalizedBuffer.length > MAX_FILE_SIZE) {
    throw new Error("A foto processada excede o limite de armazenamento.");
  }

  return { buffer: normalizedBuffer, contentType: "image/webp", extension: "webp" };
}

function getSafeError(error, fallback) {
  if (error instanceof WorkshopAccessError) return error;
  if (error instanceof PhotoStorageConfigurationError) return error;
  console.error("Falha no armazenamento privado de fotos.", {
    code: typeof error?.code === "string" ? error.code : "UNKNOWN",
  });
  return new Error(fallback);
}

async function assertWorkOrderAccess(client, membership, workOrderId) {
  const result = await client.query(
    `SELECT id FROM work_orders
     WHERE id = $1
       AND ($2::boolean = false OR assigned_to_user_id = $3)
     LIMIT 1`,
    [workOrderId, membership.role === "mechanic", membership.userId],
  );
  if (result.rowCount !== 1) {
    throw new Error("Ordem de serviço não encontrada ou sem acesso.");
  }
}

const uploadSchema = z.object({
  workOrderId: z.string().uuid(),
  category: z.enum(["entry", "damage", "part", "work", "delivery"]),
  caption: z.string().trim().max(500).default(""),
  originalName: z.string().trim().min(1).max(255),
  contentType: z.string().refine((value) => CONTENT_TYPES.has(value), "Tipo de foto inválido."),
  size: z.number().int().min(1).max(MAX_FILE_SIZE),
});

export const createWorkOrderPhotoUpload = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(async ({ data }) => {
    try {
      return await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "photos:write",
          rateLimit: { scope: "photo-upload-create", maximum: 12, windowSeconds: 600 },
        },
        async (client, membership) => {
          await assertWorkOrderAccess(client, membership, data.workOrderId);
          const {
            rows: [photoCounts],
          } = await client.query(
            `SELECT
               (SELECT count(*) FROM work_order_photos WHERE work_order_id = $1) AS saved_count,
               (SELECT count(*) FROM work_order_photo_uploads WHERE work_order_id = $1 AND expires_at > now()) AS pending_count,
               (SELECT COALESCE(sum(size_bytes), 0) FROM work_order_photos) AS saved_bytes,
               (SELECT COALESCE(sum(expected_size_bytes), 0) FROM work_order_photo_uploads WHERE expires_at > now()) AS pending_bytes`,
            [data.workOrderId],
          );
          if (
            Number(photoCounts.saved_count) + Number(photoCounts.pending_count) >=
            MAX_PHOTOS_PER_WORK_ORDER
          ) {
            throw new Error("Esta ordem de serviço já atingiu o limite de 50 fotos.");
          }
          if (
            Number(photoCounts.saved_bytes) + Number(photoCounts.pending_bytes) + data.size >
            MAX_WORKSHOP_PHOTO_BYTES
          ) {
            throw new Error("A oficina atingiu o limite de armazenamento de fotos do piloto.");
          }
          const { client: storage, bucket } = getSupabaseStorageConfig();
          const id = randomUUID();
          const objectKey = `pending/workshops/${membership.workshopId}/${id}`;
          const originalName = cleanOriginalName(data.originalName);

          const { rows: expiredUploads } = await client.query(
            `SELECT object_key FROM work_order_photo_uploads WHERE expires_at < now() FOR UPDATE`,
          );
          for (const upload of expiredUploads) {
            await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: upload.object_key }));
          }
          await client.query(`DELETE FROM work_order_photo_uploads WHERE expires_at < now()`);
          await client.query(
            `INSERT INTO work_order_photo_uploads
              (workshop_id, id, work_order_id, object_key, category, title, original_name,
               content_type, expected_size_bytes, caption, uploaded_by_user_id, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + interval '10 minutes')`,
            [
              membership.workshopId,
              id,
              data.workOrderId,
              objectKey,
              data.category,
              PHOTO_TITLES[data.category],
              originalName,
              data.contentType,
              data.size,
              data.caption || null,
              membership.userId,
            ],
          );
          await writeAuditEvent(client, membership, {
            action: "photo.upload.authorized",
            entityType: "work_order_photo",
            entityId: id,
            details: {
              workOrderId: data.workOrderId,
              category: data.category,
              expectedSizeBytes: data.size,
            },
          });

          const uploadUrl = await getSignedUrl(
            storage,
            new PutObjectCommand({
              Bucket: bucket,
              Key: objectKey,
              ContentType: data.contentType,
            }),
            { expiresIn: SIGNED_URL_TTL_SECONDS },
          );
          return {
            uploadId: id,
            uploadUrl,
            headers: { "Content-Type": data.contentType },
          };
        },
      );
    } catch (error) {
      throw getSafeError(error, "Não foi possível preparar o envio da foto.");
    }
  });

export const confirmWorkOrderPhotoUpload = createServerFn({ method: "POST" })
  .validator(z.object({ uploadId: z.string().uuid() }))
  .handler(async ({ data }) => {
    let storage;
    let bucket;
    let temporaryObjectKey;
    let finalObjectKey;
    try {
      const result = await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "photos:write",
          rateLimit: { scope: "photo-upload-confirm", maximum: 12, windowSeconds: 600 },
        },
        async (client, membership) => {
          ({ client: storage, bucket } = getSupabaseStorageConfig());
          const { rows } = await client.query(
            `SELECT id, work_order_id, object_key, category, title, original_name,
                    content_type, expected_size_bytes, caption
             FROM work_order_photo_uploads
             WHERE id = $1 AND uploaded_by_user_id = $4 AND expires_at > now()
               AND ($2::boolean = false OR work_order_id IN (
                 SELECT id FROM work_orders WHERE assigned_to_user_id = $3
               ))
             FOR UPDATE`,
            [data.uploadId, membership.role === "mechanic", membership.userId, membership.userId],
          );
          const upload = rows[0];
          if (!upload) throw new Error("O envio expirou ou não está disponível.");
          temporaryObjectKey = upload.object_key;

          const head = await storage.send(
            new HeadObjectCommand({ Bucket: bucket, Key: upload.object_key }),
          );
          if (
            !head.ContentLength ||
            head.ContentLength !== Number(upload.expected_size_bytes) ||
            head.ContentLength > MAX_FILE_SIZE ||
            head.ContentType !== upload.content_type
          ) {
            await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: upload.object_key }));
            throw new Error("A foto enviada não corresponde ao arquivo validado.");
          }

          const response = await storage.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: upload.object_key,
              ...(head.ETag ? { IfMatch: head.ETag } : {}),
            }),
          );
          const downloadedBytes = await response.Body?.transformToByteArray();
          if (!downloadedBytes || downloadedBytes.byteLength !== head.ContentLength) {
            throw new Error("Não foi possível ler a foto enviada por completo.");
          }
          const normalized = await normalizeImage(
            Buffer.from(downloadedBytes),
            upload.content_type,
          );
          const { rows: workshopPhotoBytesRows } = await client.query(
            `SELECT
               (SELECT COALESCE(sum(size_bytes), 0) FROM work_order_photos) AS saved_bytes,
               (SELECT COALESCE(sum(expected_size_bytes), 0)
                FROM work_order_photo_uploads WHERE expires_at > now()) AS pending_bytes`,
          );
          const workshopPhotoBytes = workshopPhotoBytesRows[0];
          const expectedSizeBytes = Number(upload.expected_size_bytes);
          if (
            Number(workshopPhotoBytes.saved_bytes) +
              Number(workshopPhotoBytes.pending_bytes) -
              expectedSizeBytes +
              normalized.buffer.length >
            MAX_WORKSHOP_PHOTO_BYTES
          ) {
            throw new Error("A oficina atingiu o limite de armazenamento de fotos do piloto.");
          }

          finalObjectKey = `workshops/${membership.workshopId}/work-orders/${upload.work_order_id}/${upload.id}.${normalized.extension}`;
          await storage.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: finalObjectKey,
              Body: normalized.buffer,
              ContentLength: normalized.buffer.length,
              ContentType: normalized.contentType,
              CacheControl: "private, no-store",
            }),
          );

          const { rows: photoRows } = await client.query(
            `INSERT INTO work_order_photos
              (workshop_id, id, work_order_id, object_key, category, title, original_name,
               content_type, size_bytes, caption, uploaded_by_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, category, title, original_name, caption, created_at`,
            [
              membership.workshopId,
              upload.id,
              upload.work_order_id,
              finalObjectKey,
              upload.category,
              upload.title,
              upload.original_name,
              normalized.contentType,
              normalized.buffer.length,
              upload.caption,
              membership.userId,
            ],
          );
          await client.query(
            `INSERT INTO work_order_timeline_events
              (workshop_id, work_order_id, actor_user_id, actor_label, title, detail)
             VALUES ($1, $2, $3, $4, 'Evidência adicionada', $5)`,
            [
              membership.workshopId,
              upload.work_order_id,
              membership.userId,
              membership.displayName,
              upload.title,
            ],
          );
          await client.query("UPDATE work_orders SET updated_at = now() WHERE id = $1", [
            upload.work_order_id,
          ]);
          await client.query("DELETE FROM work_order_photo_uploads WHERE id = $1", [upload.id]);
          await writeAuditEvent(client, membership, {
            action: "photo.upload.confirmed",
            entityType: "work_order_photo",
            entityId: upload.id,
            details: {
              workOrderId: upload.work_order_id,
              contentType: normalized.contentType,
              sizeBytes: normalized.buffer.length,
            },
          });
          const row = photoRows[0];
          return {
            evidence: {
              id: row.id,
              photoId: row.id,
              category: row.category,
              title: row.title,
              caption: row.caption ?? row.original_name ?? "",
              originalFileName: row.original_name ?? "",
              createdAt: new Date(row.created_at).toISOString(),
            },
            temporaryObjectKey: upload.object_key,
          };
        },
      );
      await storage
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: result.temporaryObjectKey }))
        .catch((error) => {
          console.error("Não foi possível limpar o objeto temporário de uma foto.", {
            code: typeof error?.code === "string" ? error.code : "UNKNOWN",
          });
        });
      return result.evidence;
    } catch (error) {
      if (temporaryObjectKey && storage && bucket) {
        await storage
          .send(new DeleteObjectCommand({ Bucket: bucket, Key: temporaryObjectKey }))
          .catch(() => {});
      }
      if (finalObjectKey && storage && bucket) {
        await storage
          .send(new DeleteObjectCommand({ Bucket: bucket, Key: finalObjectKey }))
          .catch(() => {});
      }
      if (temporaryObjectKey) {
        await withAuthorizedWorkshopTransaction(
          getRequest(),
          { permission: "photos:write" },
          async (client, membership) => {
            const { rows } = await client.query(
              `DELETE FROM work_order_photo_uploads
               WHERE id = $1 AND uploaded_by_user_id = $2
               RETURNING id, work_order_id`,
              [data.uploadId, membership.userId],
            );
            if (rows.length) {
              await writeAuditEvent(client, membership, {
                action: "photo.upload.rejected",
                entityType: "work_order_photo",
                entityId: data.uploadId,
                details: { workOrderId: rows[0].work_order_id },
              });
            }
          },
        ).catch(() => {});
      }
      throw getSafeError(error, "Não foi possível confirmar a foto enviada.");
    }
  });

export const cancelWorkOrderPhotoUpload = createServerFn({ method: "POST" })
  .validator(z.object({ uploadId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      return await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "photos:write",
          rateLimit: { scope: "photo-upload-cancel", maximum: 30, windowSeconds: 600 },
        },
        async (client, membership) => {
          const { rows } = await client.query(
            `SELECT object_key FROM work_order_photo_uploads
             WHERE id = $1 AND uploaded_by_user_id = $2 FOR UPDATE`,
            [data.uploadId, membership.userId],
          );
          if (!rows.length) return { cancelled: false };
          const { client: storage, bucket } = getSupabaseStorageConfig();
          await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: rows[0].object_key }));
          await client.query("DELETE FROM work_order_photo_uploads WHERE id = $1", [data.uploadId]);
          await writeAuditEvent(client, membership, {
            action: "photo.upload.cancelled",
            entityType: "work_order_photo",
            entityId: data.uploadId,
            details: {},
          });
          return { cancelled: true };
        },
      );
    } catch (error) {
      throw getSafeError(error, "Não foi possível cancelar o envio da foto.");
    }
  });

export const getWorkOrderPhotoUrl = createServerFn({ method: "GET" })
  .validator(z.object({ photoId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      return await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "photos:read",
          rateLimit: { scope: "photo-url-issue", maximum: 120, windowSeconds: 60 },
        },
        async (client, membership) => {
          const { rows } = await client.query(
            `SELECT photo.object_key, photo.content_type
             FROM work_order_photos AS photo
             JOIN work_orders AS work_order
               ON work_order.workshop_id = photo.workshop_id
              AND work_order.id = photo.work_order_id
             WHERE photo.id = $1
               AND ($2::boolean = false OR work_order.assigned_to_user_id = $3)
             LIMIT 1`,
            [data.photoId, membership.role === "mechanic", membership.userId],
          );
          if (!rows.length) throw new Error("Foto não encontrada ou sem acesso.");
          await writeAuditEvent(client, membership, {
            action: "photo.url.issued",
            entityType: "work_order_photo",
            entityId: data.photoId,
            details: {},
          });
          const { client: storage, bucket } = getSupabaseStorageConfig();
          const url = await getSignedUrl(
            storage,
            new GetObjectCommand({
              Bucket: bucket,
              Key: rows[0].object_key,
              ResponseContentType: rows[0].content_type,
              ResponseContentDisposition: "inline",
              ResponseCacheControl: "private, no-store",
            }),
            { expiresIn: SIGNED_URL_TTL_SECONDS },
          );
          return { url };
        },
      );
    } catch (error) {
      throw getSafeError(error, "Não foi possível acessar esta foto privada.");
    }
  });

export const deleteWorkOrderPhoto = createServerFn({ method: "POST" })
  .validator(z.object({ photoId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      return await withAuthorizedWorkshopTransaction(
        getRequest(),
        {
          permission: "photos:delete",
          rateLimit: { scope: "photo-delete", maximum: 30, windowSeconds: 3600 },
        },
        async (client, membership) => {
          const { rows } = await client.query(
            `SELECT photo.object_key, photo.work_order_id, photo.title
             FROM work_order_photos AS photo
             JOIN work_orders AS work_order
               ON work_order.workshop_id = photo.workshop_id
              AND work_order.id = photo.work_order_id
             WHERE photo.id = $1
               AND ($2::boolean = false OR work_order.assigned_to_user_id = $3)
             FOR UPDATE OF photo`,
            [data.photoId, membership.role === "mechanic", membership.userId],
          );
          if (!rows.length) throw new Error("Foto não encontrada ou sem acesso.");
          const { client: storage, bucket } = getSupabaseStorageConfig();
          await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: rows[0].object_key }));
          await client.query("DELETE FROM work_order_photos WHERE id = $1", [data.photoId]);
          await client.query(
            `INSERT INTO work_order_timeline_events
              (workshop_id, work_order_id, actor_user_id, actor_label, title, detail)
             VALUES ($1, $2, $3, $4, 'Evidência removida', $5)`,
            [
              membership.workshopId,
              rows[0].work_order_id,
              membership.userId,
              membership.displayName,
              `${rows[0].title} foi excluída.`,
            ],
          );
          await writeAuditEvent(client, membership, {
            action: "photo.deleted",
            entityType: "work_order_photo",
            entityId: data.photoId,
            details: { workOrderId: rows[0].work_order_id },
          });
          await client.query("UPDATE work_orders SET updated_at = now() WHERE id = $1", [
            rows[0].work_order_id,
          ]);
          return { photoId: data.photoId };
        },
      );
    } catch (error) {
      throw getSafeError(error, "Não foi possível remover esta foto privada.");
    }
  });
