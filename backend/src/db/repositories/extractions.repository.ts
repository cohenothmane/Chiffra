import { pool } from "../client.js";
import type { StructuredExtraction } from "../../agents/schemas/extraction.schema.js";

export type DocumentStatus = "processed" | "failed";

export interface DocumentInput {
  filename: string;
  fileType: string;
  storagePath: string;
}

// Upsert par nom de fichier (documents.filename est UNIQUE) : relancer
// l'ingestion met a jour le document existant au lieu de le dupliquer.
export async function upsertDocument(
  input: DocumentInput,
  status: DocumentStatus,
  failureReason: string | null,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO documents (filename, file_type, storage_path, status, failure_reason, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (filename) DO UPDATE SET
       file_type = EXCLUDED.file_type,
       storage_path = EXCLUDED.storage_path,
       status = EXCLUDED.status,
       failure_reason = EXCLUDED.failure_reason
     RETURNING id`,
    [input.filename, input.fileType, input.storagePath, status, failureReason],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Echec de l'upsert du document");
  return row.id;
}

// Un document ne produit au plus qu'une extraction : on supprime l'ancienne
// avant d'inserer, pour rester idempotent sur un document deja traite.
export async function replaceExtraction(documentId: string, data: StructuredExtraction): Promise<void> {
  await pool.query(`DELETE FROM extractions WHERE document_id = $1`, [documentId]);
  await pool.query(
    `INSERT INTO extractions (
       document_id, tiers, date_facture, montant_ht, taux_tva, montant_tva, montant_ttc,
       numero_piece, confiance, ice_fournisseur, ice_client, type_document, texte_brut
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      documentId,
      data.tiers,
      data.date_facture,
      data.montant_ht,
      data.taux_tva,
      data.montant_tva,
      data.montant_ttc,
      data.numero_piece,
      data.confiance_extraction,
      data.ice_fournisseur ?? null,
      data.ice_client ?? null,
      data.type_document,
      null,
    ],
  );
}

export async function setExtractionRawText(documentId: string, texteBrut: string): Promise<void> {
  await pool.query(`UPDATE extractions SET texte_brut = $1 WHERE document_id = $2`, [texteBrut, documentId]);
}

export interface ExtractionListRow {
  document_id: string;
  filename: string;
  status: DocumentStatus;
  failure_reason: string | null;
  tiers: string | null;
  date_facture: string | null;
  montant_ht: string | null;
  taux_tva: string | null;
  montant_tva: string | null;
  montant_ttc: string | null;
  numero_piece: string | null;
  confiance: string | null;
  type_document: "facture" | "avoir" | null;
}

export async function listExtractions(): Promise<ExtractionListRow[]> {
  const result = await pool.query<ExtractionListRow>(
    `SELECT
       d.id AS document_id, d.filename, d.status, d.failure_reason,
       e.tiers, e.date_facture, e.montant_ht, e.taux_tva, e.montant_tva, e.montant_ttc,
       e.numero_piece, e.confiance, e.type_document
     FROM documents d
     LEFT JOIN extractions e ON e.document_id = d.id
     ORDER BY d.filename ASC`,
  );
  return result.rows;
}

export interface ExtractionsSummary {
  total: number;
  succes: number;
  echec: number;
  montantTtcTotal: number;
}

export async function getExtractionsSummary(): Promise<ExtractionsSummary> {
  const result = await pool.query<{
    total: string;
    succes: string;
    echec: string;
    montant_ttc_total: string | null;
  }>(
    `SELECT
       count(*) AS total,
       count(*) FILTER (WHERE d.status = 'processed') AS succes,
       count(*) FILTER (WHERE d.status = 'failed') AS echec,
       sum(e.montant_ttc) AS montant_ttc_total
     FROM documents d
     LEFT JOIN extractions e ON e.document_id = d.id`,
  );
  const row = result.rows[0];
  return {
    total: Number(row?.total ?? 0),
    succes: Number(row?.succes ?? 0),
    echec: Number(row?.echec ?? 0),
    montantTtcTotal: Number(row?.montant_ttc_total ?? 0),
  };
}
