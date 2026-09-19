import type { FastifyInstance } from "fastify";
import { getExtractionsSummary, listExtractions } from "../db/repositories/extractions.repository.js";

export async function extractionsRoutes(app: FastifyInstance) {
  app.get("/api/extractions", async () => {
    return listExtractions();
  });

  app.get("/api/extractions/summary", async () => {
    return getExtractionsSummary();
  });
}
