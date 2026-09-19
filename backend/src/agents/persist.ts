import type { StructureResult } from "./ingestor.js";
import {
  upsertDocument,
  replaceExtractions,
  setExtractionRawText,
  type DocumentInput,
} from "../db/repositories/extractions.repository.js";

export interface IngestionResultRow {
  result: StructureResult;
  sourceRowId: string | null;
}

// Transporte le resultat de l'Ingestor vers documents/extractions, sans
// aucun calcul (EX-07) : les valeurs inserees sont exactement celles deja
// produites par structureExtraction() / extractExcelRows().
//
// - PDF/JPG : un document, au plus une extraction -> results = [{ result,
//   sourceRowId: null }].
// - Excel (export-achats-T2.xlsx) : un seul document physique, mais
//   plusieurs lignes -> results = une entree par ligne, sourceRowId =
//   l'id source de la ligne (ex: "DOC-094"). Un seul document est cree
//   meme si plusieurs lignes echouent ou reussissent.
export async function persistIngestionResult(
  document: DocumentInput,
  results: IngestionResultRow[],
  rawText?: string,
): Promise<void> {
  const successes = results.filter(
    (row): row is { result: Exclude<StructureResult, { failed: true }>; sourceRowId: string | null } =>
      !("failed" in row.result),
  );
  const failures = results.filter(
    (row): row is { result: { failed: true; reason: string }; sourceRowId: string | null } => "failed" in row.result,
  );

  const status = successes.length > 0 ? "traité" : "non_traité";
  const failureReason =
    successes.length > 0
      ? null
      : results.length === 1
        ? (failures[0]?.result.reason ?? null)
        : `${failures.length} ligne(s) en echec`;

  const documentId = await upsertDocument(document, status, failureReason);

  if (successes.length > 0) {
    await replaceExtractions(
      documentId,
      successes.map(({ result, sourceRowId }) => ({ data: result, sourceRowId })),
    );
  }

  if (rawText && successes.length > 0) {
    await setExtractionRawText(documentId, rawText);
  }
}
