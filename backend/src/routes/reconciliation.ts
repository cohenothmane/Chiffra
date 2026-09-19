import type { FastifyInstance } from "fastify";
import { pool } from "../db/client.js";

export interface ReconciliationSummary {
  matched: number;
  total: number;
  rate: number;
}

// Compte les factures rapprochees (presentes dans reconciliations) parmi les
// extractions de type facture issues d'un document traite. Pas de calcul
// metier sur des montants ici, juste un pourcentage d'affichage.
export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const result = await pool.query<{ matched: string; total: string }>(
    `SELECT
       count(*) FILTER (WHERE r.id IS NOT NULL) AS matched,
       count(*) AS total
     FROM extractions e
     JOIN documents d ON d.id = e.document_id
     LEFT JOIN reconciliations r ON r.extraction_id = e.id
     WHERE e.type_document = 'facture' AND d.status = 'traité'`,
  );
  const row = result.rows[0];
  const matched = Number(row?.matched ?? 0);
  const total = Number(row?.total ?? 0);
  const rate = total > 0 ? Math.round((matched / total) * 100) : 0;
  return { matched, total, rate };
}

export async function reconciliationRoutes(app: FastifyInstance) {
  app.get("/api/reconciliation/summary", async () => {
    return getReconciliationSummary();
  });
}
