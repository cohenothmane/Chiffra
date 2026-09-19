import type { FastifyInstance } from "fastify";
import { Decimal } from "decimal.js";
import { pool } from "../db/client.js";

export interface AnomalySummaryItem {
  type: "doublon";
  tiers: string;
  montantTtc: number;
  occurrences: number;
  expositionDh: number;
}

export interface AnomaliesSummary {
  totalExpositionDh: number;
  anomalies: AnomalySummaryItem[];
  totalAnomalies: number;
}

interface DuplicateGroupRow {
  tiers: string;
  montant_ttc: string;
  occurrences: string;
}

// Detecte uniquement les doublons (meme tiers normalise + meme montant TTC +
// meme date de facture, sur des documents traites) : ce n'est pas l'Auditor
// complet, seulement un resume rapide pour le dashboard. L'exposition d'un
// groupe est le montant des copies en trop (count - 1), calculee via
// decimal.js car c'est un montant, pas un pourcentage d'affichage.
export async function getAnomaliesSummary(): Promise<AnomaliesSummary> {
  const result = await pool.query<DuplicateGroupRow>(
    `SELECT
       MIN(e.tiers) AS tiers,
       e.montant_ttc,
       count(*) AS occurrences
     FROM extractions e
     JOIN documents d ON d.id = e.document_id
     WHERE d.status = 'traité'
     GROUP BY UPPER(TRIM(e.tiers)), e.montant_ttc, e.date_facture
     HAVING count(*) > 1`,
  );

  const anomalies: AnomalySummaryItem[] = result.rows.map((row) => {
    const montantTtc = new Decimal(row.montant_ttc);
    const occurrences = Number(row.occurrences);
    const exposition = montantTtc.times(occurrences - 1);
    return {
      type: "doublon" as const,
      tiers: row.tiers,
      montantTtc: montantTtc.toNumber(),
      occurrences,
      expositionDh: exposition.toNumber(),
    };
  });

  anomalies.sort((a, b) => b.expositionDh - a.expositionDh);

  const totalExpositionDh = anomalies
    .reduce((sum, a) => sum.plus(a.expositionDh), new Decimal(0))
    .toNumber();

  return { totalExpositionDh, anomalies, totalAnomalies: anomalies.length };
}

export async function anomaliesRoutes(app: FastifyInstance) {
  app.get("/api/anomalies/summary", async () => {
    return getAnomaliesSummary();
  });
}
