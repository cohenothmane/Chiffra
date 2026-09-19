import "dotenv/config";
import { Decimal } from "decimal.js";
import { pool } from "../db/client.js";
import {
  reconcileSimple,
  normalize,
  isExcludedLabel,
  addDays,
  type UnreconciledExtraction,
  type CandidateBankLine,
} from "./reconciler.js";

// Periode couverte par les releves charges (data/releves/releve-2026-01.csv
// a releve-2026-06.csv).
const RELEVES_PERIOD_START = "2026-01-01";
const RELEVES_PERIOD_END = "2026-06-30";
const MAX_DAYS_AFTER_INVOICE = 60;

interface GroupeProbable {
  extraction: UnreconciledExtraction;
  bankMontant: string;
  bankLibelle: string;
  ecart: string;
}

async function main() {
  // reconcileSimple() ecarte deja les doublons de donnees (meme facture
  // reelle representee par plusieurs extractions) avant le matching : les
  // non-rapprochees ci-dessous n'en contiennent plus.
  const { matched, unmatched, excludedDuplicates } = await reconcileSimple();

  const bankLinesResult = await pool.query<CandidateBankLine>(
    `SELECT id, date_operation, montant, libelle FROM bank_lines`,
  );
  const bankLines = bankLinesResult.rows.filter((line) => !isExcludedLabel(line.libelle));

  const horsFenetre: UnreconciledExtraction[] = [];
  const groupeProbable: GroupeProbable[] = [];
  const introuvable: UnreconciledExtraction[] = [];

  for (const u of unmatched) {
    const windowEnd = addDays(u.date_facture, MAX_DAYS_AFTER_INVOICE);

    if (u.date_facture < RELEVES_PERIOD_START || windowEnd > RELEVES_PERIOD_END) {
      horsFenetre.push(u);
      continue;
    }

    const tiersNormalized = normalize(u.tiers);
    const candidates = bankLines.filter((line) => {
      if (line.date_operation < u.date_facture || line.date_operation > windowEnd) return false;
      return normalize(line.libelle).includes(tiersNormalized);
    });

    if (candidates.length === 0) {
      introuvable.push(u);
      continue;
    }

    const montantFacture = new Decimal(u.montant_ttc).abs();
    let closest = candidates[0]!;
    let closestDiff = new Decimal(closest.montant).abs().minus(montantFacture).abs();
    for (const candidate of candidates.slice(1)) {
      const diff = new Decimal(candidate.montant).abs().minus(montantFacture).abs();
      if (diff.lessThan(closestDiff)) {
        closest = candidate;
        closestDiff = diff;
      }
    }

    groupeProbable.push({
      extraction: u,
      bankMontant: closest.montant,
      bankLibelle: closest.libelle,
      ecart: new Decimal(closest.montant).abs().minus(montantFacture).toString(),
    });
  }

  // Taux "reel" : total rapproche en base (matches de cet appel + ceux deja
  // persistes lors de runs precedents, exclus du retour de reconcileSimple)
  // sur le total de factures reelles distinctes considerees dans cet appel
  // (candidats matches/non-matches ; les doublons ecartes ne comptent ni au
  // numerateur ni au denominateur, exactement comme demande).
  const totalReconciliesResult = await pool.query<{ count: string }>(`SELECT count(*) FROM reconciliations`);
  const totalReconcilies = Number(totalReconciliesResult.rows[0]!.count);
  const totalFacturesDistinctes = totalReconcilies + unmatched.length;
  const taux = totalFacturesDistinctes > 0 ? (totalReconcilies / totalFacturesDistinctes) * 100 : 0;

  console.log(`Doublons de donnees ecartes avant matching : ${excludedDuplicates.length}`);
  console.log(`Factures reelles distinctes considerees dans cet appel : ${matched.length + unmatched.length}`);
  console.log(`  - non rapprochees : ${unmatched.length}`);
  console.log(`      - hors fenetre releves : ${horsFenetre.length}`);
  console.log(`      - paiement groupe probable : ${groupeProbable.length}`);
  console.log(`      - vraiment introuvable : ${introuvable.length}`);
  console.log(
    `\nTaux de rapprochement (total rapproche en base / factures reelles distinctes) : ` +
      `${totalReconcilies}/${totalFacturesDistinctes} = ${taux.toFixed(1)}%`,
  );

  if (groupeProbable.length > 0) {
    console.log(`\n--- Paiement groupe probable (${groupeProbable.length}) ---`);
    for (const g of groupeProbable) {
      console.log(
        `  ${g.extraction.tiers} | facture=${g.extraction.montant_ttc} MAD le ${g.extraction.date_facture} ` +
          `| banque la plus proche=${g.bankMontant} MAD ("${g.bankLibelle}") | ecart=${g.ecart} MAD`,
      );
    }
  }

  if (horsFenetre.length > 0) {
    console.log(`\n--- Hors fenetre releves (${horsFenetre.length}) ---`);
    for (const u of horsFenetre) {
      console.log(`  ${u.tiers} | ${u.montant_ttc} MAD | ${u.date_facture}`);
    }
  }

  if (introuvable.length > 0) {
    console.log(`\n--- Vraiment introuvable (${introuvable.length}) ---`);
    for (const u of introuvable) {
      console.log(`  ${u.tiers} | ${u.montant_ttc} MAD | ${u.date_facture}`);
    }
  }

  await pool.end();
}

main();
