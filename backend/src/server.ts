import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { pool } from "./db/client.js";
import { extractionsRoutes, chatRoutes, reconciliationRoutes, anomaliesRoutes } from "./routes/index.js";

const server = Fastify({ logger: true });

await server.register(cors, { origin: true });
await server.register(extractionsRoutes);
await server.register(chatRoutes);
await server.register(reconciliationRoutes);
await server.register(anomaliesRoutes);

server.get("/health", async (request, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok", db: "connected" };
  } catch (err) {
    reply.code(503);
    return {
      status: "degraded",
      db: "error",
      message: err instanceof Error ? err.message : "unknown error",
    };
  }
});

const port = Number(process.env.PORT ?? 3000);

server
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
