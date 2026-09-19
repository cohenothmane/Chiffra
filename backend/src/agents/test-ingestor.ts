import "dotenv/config";
import { readdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawText } from "../ocr/extract.js";
import { structureExtraction } from "./ingestor.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const FACTURES_DIR = join(currentDir, "..", "..", "..", "data", "factures");

async function main() {
  const entries = await readdir(FACTURES_DIR);
  const files = entries.filter((name) => extname(name) !== "").sort();

  let structured = 0;
  let failed = 0;

  for (const name of files) {
    const filePath = join(FACTURES_DIR, name);
    const fileType = extname(name).slice(1);

    const extraction = await extractRawText(filePath, fileType);

    if (extraction.error || extraction.text === null) {
      failed += 1;
      console.log(`[ECHEC] ${name} — extraction_texte_echouee (${extraction.error ?? "texte vide"})`);
      continue;
    }

    // Tesseract exprime sa confiance sur 0-100, structureExtraction attend 0-1.
    const ocrConfidence = extraction.confidence !== null ? extraction.confidence / 100 : null;
    const result = await structureExtraction(extraction.text, ocrConfidence);

    if ("failed" in result) {
      failed += 1;
      console.log(`[ECHEC] ${name} — ${result.reason}`);
      continue;
    }

    structured += 1;
    console.log(`[OK] ${name}`);
    console.log(
      `      tiers=${result.tiers} | numero=${result.numero_piece} | date=${result.date_facture} | type=${result.type_document}`,
    );
    console.log(
      `      HT=${result.montant_ht} | TVA(${result.taux_tva}%)=${result.montant_tva} | TTC=${result.montant_ttc} | confiance=${result.confiance_extraction}`,
    );
  }

  console.log(`\n${structured} structuration(s) reussie(s), ${failed} echec(s), sur ${files.length} fichiers.`);
}

main();
