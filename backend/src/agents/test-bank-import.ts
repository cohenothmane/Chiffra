import "dotenv/config";
import { importBankStatements } from "./bank-import.js";
import { pool } from "../db/client.js";

async function main() {
  const results = await importBankStatements();

  let totalLines = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const r of results) {
    console.log(
      `${r.filename} — ${r.linesImported} ligne(s), debit=${r.totalDebit.toFixed(2)} MAD, credit=${r.totalCredit.toFixed(2)} MAD`,
    );
    totalLines += r.linesImported;
    totalDebit += r.totalDebit;
    totalCredit += r.totalCredit;
  }

  console.log(
    `\n${totalLines} ligne(s) importee(s) au total, debit=${totalDebit.toFixed(2)} MAD, credit=${totalCredit.toFixed(2)} MAD`,
  );

  await pool.end();
}

main();
