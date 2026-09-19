import { readdir } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRawText } from "./extract.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const FACTURES_DIR = join(currentDir, "..", "..", "..", "data", "factures");

async function main() {
  const entries = await readdir(FACTURES_DIR);
  const files = entries.filter((name) => extname(name) !== "").sort();

  let ok = 0;
  let failed = 0;

  for (const name of files) {
    const filePath = join(FACTURES_DIR, name);
    const fileType = extname(name).slice(1);
    const result = await extractRawText(filePath, fileType);

    if (result.error) {
      failed += 1;
      console.log(`[ECHEC] ${name} (${result.method}) — ${result.error}`);
    } else {
      ok += 1;
      const preview = (result.text ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
      const confidence = result.confidence !== null ? ` conf=${result.confidence.toFixed(1)}%` : "";
      console.log(`[OK] ${name} (${result.method}${confidence}) — ${preview}...`);
    }
  }

  console.log(`\n${ok} extraction(s) reussie(s), ${failed} echec(s), sur ${files.length} fichiers.`);
}

main();
