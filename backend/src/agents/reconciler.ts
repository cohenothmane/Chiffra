import { Decimal } from "decimal.js";
import { pool } from "../db/client.js";

const MAX_DAYS_AFTER_INVOICE = 60;
const AMOUNT_TOLERANCE = new Decimal("0.01");

// Regle 12 de regles-fiscales.md : salaires, frais bancaires et reglements
// clients ne se rapprochent d'aucune facture d'achat, jamais proposes comme
// match. "FRAIS" (pas seulement "FRAIS BANCAIRE") couvre le libelle reel du
// jeu de donnees, "FRAIS DE TENUE DE COMPTE".
const EXCLUDED_LABEL_PATTERNS = ["SALAIRE", "FRAIS", "REGLEMENT CLIENT"];

export interface UnreconciledExtraction {
  id: string;
  tiers: string;
  date_facture: string;
  montant_ttc: string;
}

export interface CandidateBankLine {
  id: string;
  date_operation: string;
  montant: string;
  libelle: string;
}

export interface ReconciliationMatch {
  extractionId: string;
  bankLineId: string;
  tiers: string;
  montantTtc: string;
  dateFacture: string;
  ecart: string;
}

export interface ReconcileSimpleResult {
  matched: ReconciliationMatch[];
  unmatched: UnreconciledExtraction[];
  // Extractions ecartees du calcul (ni matched, ni unmatched) parce qu'une
  // autre extraction du meme groupe (tiers normalise + montant_ttc +
  // date_facture) represente deja la meme facture reelle. La table
  // extractions n'est pas touchee — l'Auditor s'appuiera dessus pour EX-04.
  excludedDuplicates: UnreconciledExtraction[];
}

// Exportes pour reutilisation par analyze-unmatched.ts, qui doit appliquer
// exactement la meme normalisation/exclusion/fenetre que le matching reel —
// sinon son diagnostic sur les non-rapprochees serait incoherent avec ce que
// reconcileSimple() a effectivement teste.
export function normalize(label: string): string {
  return label.toUpperCase().replace(/\s+/g, " ").trim();
}

export function isExcludedLabel(libelle: string): boolean {
  const normalized = normalize(libelle);
  return EXCLUDED_LABEL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

// date_facture/date_operation sont des chaines "YYYY-MM-DD" (cf. le parseur
// de type DATE force en db/client.ts) : la comparaison lexicographique suffit
// pour l'ordre chronologique, pas besoin de reconstruire des objets Date
// pour la fenetre, seulement pour ajouter les 60 jours.
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface ExtractionCandidateRow extends UnreconciledExtraction {
  created_at: Date;
}

// Cle de regroupement "meme facture reelle" : tiers normalise + montant_ttc
// + date_facture. Deux extractions partageant cette cle representent le
// meme paiement attendu (typiquement un PDF et sa ligne jumelle dans
// export-achats-T2.xlsx), donc un seul et meme paiement bancaire possible.
function duplicateGroupKey(extraction: UnreconciledExtraction): string {
  return `${normalize(extraction.tiers)}|${new Decimal(extraction.montant_ttc).toFixed(2)}|${extraction.date_facture}`;
}

/**
 * Rapprochement simple, un-a-un : pour chaque facture non encore rapprochee,
 * cherche UNE ligne bancaire correspondante (nom du tiers dans le libelle,
 * fenetre de 60 jours, montant identique a 0.01 MAD pres). Ne gere pas les
 * paiements groupes/partiels ni les avoirs a ce stade — une ligne bancaire
 * n'est utilisee que pour au plus une facture par appel.
 *
 * Avant le matching, les extractions candidates sont regroupees par facture
 * reelle (duplicateGroupKey) : un seul representant par groupe (le plus
 * ancien par created_at) participe au matching, les autres sont ecartes du
 * resultat (excludedDuplicates) sans jamais toucher a la table extractions.
 *
 * Aucun calcul metier (EX-07) au-dela de l'ecart de rapprochement lui-meme,
 * calcule via decimal.js (jamais de comparaison flottante directe).
 */
export async function reconcileSimple(): Promise<ReconcileSimpleResult> {
  const extractionsResult = await pool.query<ExtractionCandidateRow>(
    `SELECT e.id, e.tiers, e.date_facture, e.montant_ttc, e.created_at
     FROM extractions e
     JOIN documents d ON d.id = e.document_id
     WHERE e.type_document = 'facture'
       AND d.status = 'traité'
       AND NOT EXISTS (SELECT 1 FROM reconciliations r WHERE r.extraction_id = e.id)
     ORDER BY e.date_facture ASC`,
  );

  const groups = new Map<string, ExtractionCandidateRow[]>();
  for (const extraction of extractionsResult.rows) {
    const key = duplicateGroupKey(extraction);
    const group = groups.get(key);
    if (group) group.push(extraction);
    else groups.set(key, [extraction]);
  }

  const candidateExtractions: UnreconciledExtraction[] = [];
  const excludedDuplicates: UnreconciledExtraction[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      candidateExtractions.push(group[0]!);
      continue;
    }
    const [representative, ...rest] = [...group].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    candidateExtractions.push(representative!);
    excludedDuplicates.push(...rest);
  }

  const bankLinesResult = await pool.query<CandidateBankLine>(
    `SELECT b.id, b.date_operation, b.montant, b.libelle
     FROM bank_lines b
     WHERE NOT EXISTS (SELECT 1 FROM reconciliations r WHERE r.bank_line_id = b.id)`,
  );

  const availableBankLines = bankLinesResult.rows.filter((line) => !isExcludedLabel(line.libelle));
  const usedBankLineIds = new Set<string>();

  const matched: ReconciliationMatch[] = [];
  const unmatched: UnreconciledExtraction[] = [];

  for (const extraction of candidateExtractions) {
    const tiersNormalized = normalize(extraction.tiers);
    const windowEnd = addDays(extraction.date_facture, MAX_DAYS_AFTER_INVOICE);
    const montantTtc = new Decimal(extraction.montant_ttc).abs();

    const candidate = availableBankLines.find((line) => {
      if (usedBankLineIds.has(line.id)) return false;
      if (line.date_operation < extraction.date_facture || line.date_operation > windowEnd) return false;
      if (!normalize(line.libelle).includes(tiersNormalized)) return false;

      const diff = new Decimal(line.montant).abs().minus(montantTtc).abs();
      return diff.lessThan(AMOUNT_TOLERANCE);
    });

    if (!candidate) {
      unmatched.push(extraction);
      continue;
    }

    const ecart = new Decimal(candidate.montant).abs().minus(montantTtc);

    await pool.query(
      `INSERT INTO reconciliations (extraction_id, bank_line_id, ecart, methode, created_at)
       VALUES ($1, $2, $3, 'exact', now())`,
      [extraction.id, candidate.id, ecart.toNumber()],
    );

    usedBankLineIds.add(candidate.id);
    matched.push({
      extractionId: extraction.id,
      bankLineId: candidate.id,
      tiers: extraction.tiers,
      montantTtc: extraction.montant_ttc,
      dateFacture: extraction.date_facture,
      ecart: ecart.toString(),
    });
  }

  return { matched, unmatched, excludedDuplicates };
}
