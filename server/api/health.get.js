import { defineHandler } from "nitro";
import { verifyDatabaseReadiness } from "../../src/lib/server/database.js";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default defineHandler(async () => {
  try {
    await verifyDatabaseReadiness();
    return jsonResponse(200, { status: "ok", database: "available" });
  } catch {
    const database = process.env.DATABASE_URL ? "unavailable" : "not_configured";
    console.error("Verificação do banco de dados falhou.");
    return jsonResponse(503, { status: "unavailable", database });
  }
});
