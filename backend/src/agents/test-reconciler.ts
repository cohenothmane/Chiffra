import "dotenv/config";
import { reconcileSimple } from "./reconciler.js";
import { pool } from "../db/client.js";

async function main() {
  const { matched, unmatched } = await reconcileSimple();

  const total = matched.length + unmatched.length;
  const rate = total > 0 ? (matched.length / total) * 100 : 0;

  console.log(`Factures rapprochees : ${matched.length}`);
  console.log(`Factures non rapprochees : ${unmatched.length}`);
  console.log(`Taux de rapprochement : ${rate.toFixed(1)}%`);

  if (unmatched.length > 0) {
    console.log(`\nFactures non rapprochees :`);
    for (const u of unmatched) {
      console.log(`  - ${u.tiers} | ${u.montant_ttc} MAD | ${u.date_facture}`);
    }
  }

  await pool.end();
}

main();
