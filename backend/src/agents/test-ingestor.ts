import "dotenv/config";
import { readdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawText } from "../ocr/extract.js";
import { structureExtraction, extractExcelRows, type StructureResult } from "./ingestor.js";
import { persistIngestionResult } from "./persist.js";
import { pool } from "../db/client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const FACTURES_DIR = join(currentDir, "..", "..", "..", "data", "factures");
const STORAGE_PREFIX = "data/factures";

function printResult(label: string, result: StructureResult): boolean {
  if ("failed" in result) {
    console.log(`[ECHEC] ${label} — ${result.reason}`);
    return false;
  }

  console.log(`[OK] ${label}`);
  console.log(
    `      tiers=${result.tiers} | numero=${result.numero_piece} | date=${result.date_facture} | type=${result.type_document}`,
  );
  console.log(
    `      HT=${result.montant_ht} | TVA(${result.taux_tva}%)=${result.montant_tva} | TTC=${result.montant_ttc} | confiance=${result.confiance_extraction}`,
  );
  return true;
}

async function main() {
  const entries = await readdir(FACTURES_DIR);
  const files = entries.filter((name) => extname(name) !== "").sort();

  let structured = 0;
  let failed = 0;

  for (const name of files) {
    const filePath = join(FACTURES_DIR, name);
    const fileType = extname(name).slice(1);
    const documentInput = { filename: name, fileType, storagePath: `${STORAGE_PREFIX}/${name}` };

    // Tableau structure (colonnes deja nommees) : mapping direct, pas de LLM.
    // Un seul fichier physique -> un seul document, mais une extraction par
    // ligne (source_row_id = l'id de la ligne, ex: "DOC-094").
    if (fileType === "xlsx" || fileType === "xls") {
      const rowResults = extractExcelRows(filePath);
      for (const { rowId, result } of rowResults) {
        const ok = printResult(`${name} [${rowId}]`, result);
        if (ok) structured += 1;
        else failed += 1;
      }
      await persistIngestionResult(
        documentInput,
        rowResults.map(({ rowId, result }) => ({ result, sourceRowId: rowId })),
      );
      continue;
    }

    const extraction = await extractRawText(filePath, fileType);

    if (extraction.error || extraction.text === null) {
      failed += 1;
      const result: StructureResult = { failed: true, reason: "extraction_texte_echouee" };
      printResult(name, result);
      await persistIngestionResult(documentInput, [{ result, sourceRowId: null }]);
      continue;
    }

    // Tesseract exprime sa confiance sur 0-100, structureExtraction attend 0-1.
    const ocrConfidence = extraction.confidence !== null ? extraction.confidence / 100 : null;
    const result = await structureExtraction(extraction.text, ocrConfidence);

    const ok = printResult(name, result);
    if (ok) structured += 1;
    else failed += 1;

    await persistIngestionResult(documentInput, [{ result, sourceRowId: null }], extraction.text);
  }

  console.log(`\n${structured} structuration(s) reussie(s), ${failed} echec(s), sur ${files.length} fichiers.`);
  await pool.end();
}

main();
