import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db/client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const RELEVES_DIR = join(currentDir, "..", "..", "..", "data", "releves");

export interface BankImportFileResult {
  filename: string;
  linesImported: number;
  totalDebit: number;
  totalCredit: number;
}

function parseCsvLines(content: string): string[][] {
  return content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
}

/**
 * Importe les 6 releves bancaires de data/releves/ dans bank_lines. Transport
 * direct des valeurs du CSV (EX-07) : le seul rearrangement est de combiner
 * les colonnes debit_mad/credit_mad (mutuellement exclusives sur chaque
 * ligne du CSV) en un montant signe (credit - debit) pour tenir dans
 * l'unique colonne `montant` de bank_lines — ce n'est pas un calcul metier,
 * juste un changement de representation des deux memes valeurs.
 *
 * document_id reste NULL : aucune colonne du CSV ne reference un document
 * precis (le rapprochement avec les extractions se fera plus tard, par le
 * Reconciler, pas ici).
 */
export async function importBankStatements(): Promise<BankImportFileResult[]> {
  const entries = await readdir(RELEVES_DIR);
  const files = entries.filter((name) => name.endsWith(".csv")).sort();

  const results: BankImportFileResult[] = [];

  for (const name of files) {
    const content = await readFile(join(RELEVES_DIR, name), "utf-8");
    const [header, ...rows] = parseCsvLines(content);
    if (!header) {
      results.push({ filename: name, linesImported: 0, totalDebit: 0, totalCredit: 0 });
      continue;
    }

    const dateIdx = header.indexOf("date");
    const libelleIdx = header.indexOf("libelle");
    const debitIdx = header.indexOf("debit_mad");
    const creditIdx = header.indexOf("credit_mad");
    const soldeIdx = header.indexOf("solde_mad");

    let linesImported = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const row of rows) {
      if (row.length < header.length) continue;

      const dateOperation = row[dateIdx]!;
      const libelle = row[libelleIdx]!;
      const debit = Number(row[debitIdx]);
      const credit = Number(row[creditIdx]);
      const soldeCourant = Number(row[soldeIdx]);
      const montant = credit - debit;

      await pool.query(
        `INSERT INTO bank_lines (document_id, date_operation, montant, libelle, solde_courant, created_at)
         VALUES (NULL, $1, $2, $3, $4, now())`,
        [dateOperation, montant, libelle, soldeCourant],
      );

      linesImported += 1;
      totalDebit += debit;
      totalCredit += credit;
    }

    results.push({ filename: name, linesImported, totalDebit, totalCredit });
  }

  return results;
}
