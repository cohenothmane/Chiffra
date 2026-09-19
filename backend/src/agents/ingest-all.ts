import "dotenv/config";
import { readdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawText } from "../ocr/extract.js";
import { structureExtraction } from "./ingestor.js";
import { upsertDocument, replaceExtraction, setExtractionRawText } from "../db/repositories/extractions.repository.js";
import { pool } from "../db/client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const FACTURES_DIR = join(currentDir, "..", "..", "..", "data", "factures");
const STORAGE_PREFIX = "data/factures";

// Ingestion reelle : extractRawText -> structureExtraction -> persistance
// dans documents/extractions (schema Supabase existant). Contrairement a
// test-ingestor.ts (lecture seule), ce script ecrit en base et peut etre
// relance sans dupliquer (upsert par nom de fichier).
async function main() {
  const entries = await readdir(FACTURES_DIR);
  const files = entries.filter((name) => extname(name) !== "").sort();

  let succes = 0;
  let echec = 0;

  for (const name of files) {
    const filePath = join(FACTURES_DIR, name);
    const fileType = extname(name).slice(1);
    const documentInput = { filename: name, fileType, storagePath: `${STORAGE_PREFIX}/${name}` };

    const extraction = await extractRawText(filePath, fileType);

    if (extraction.error || extraction.text === null) {
      echec += 1;
      const reason = "extraction_texte_echouee";
      console.log(`[ECHEC] ${name} — ${reason}`);
      await upsertDocument(documentInput, "failed", reason);
      continue;
    }

    const ocrConfidence = extraction.confidence !== null ? extraction.confidence / 100 : null;
    const result = await structureExtraction(extraction.text, ocrConfidence);

    if ("failed" in result) {
      echec += 1;
      console.log(`[ECHEC] ${name} — ${result.reason}`);
      await upsertDocument(documentInput, "failed", result.reason);
      continue;
    }

    succes += 1;
    console.log(`[OK] ${name} — ${result.tiers} — ${result.montant_ttc} MAD`);
    const documentId = await upsertDocument(documentInput, "processed", null);
    await replaceExtraction(documentId, result);
    await setExtractionRawText(documentId, extraction.text);
  }

  console.log(`\n${succes} succes, ${echec} echec(s), sur ${files.length} fichiers persistes en base.`);
  await pool.end();
}

main();
