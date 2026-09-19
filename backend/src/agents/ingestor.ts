import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { extractionSchema, type StructuredExtraction } from "./schemas/extraction.schema.js";
import { getAzureChatModel } from "./llm-client.js";

// Seuil de confiance OCR en dessous duquel on ne tente meme pas la
// structuration : c'est le meme seuil (30%) que celui utilise dans
// ocr/extract.ts pour juger l'OCR "peu fiable", exprime ici sur l'echelle
// 0-1 (l'appelant doit normaliser une confiance Tesseract 0-100 en 0-1).
const MIN_OCR_CONFIDENCE = 0.3;

export interface ExtractionFailure {
  failed: true;
  reason: string;
}

export type StructureResult = StructuredExtraction | ExtractionFailure;

const SYSTEM_PROMPT = `Tu extrais des champs d'une facture ou d'un avoir marocain a partir d'un texte brut (lecture native de PDF ou OCR).

Regles strictes :
- Tu ne calcules jamais un montant. Tu lis uniquement ce qui est ecrit tel quel dans le texte.
- Si un champ est absent, illisible, ou que tu devrais le deduire/calculer pour le remplir, mets-le a null plutot que de deviner.
- "tiers" est l'entreprise EMETTRICE de la piece (celle qui est payee), generalement en en-tete du document. Ce n'est JAMAIS le destinataire introduit par un champ "Client" : si le texte contient un intitule "Client X", "tiers" doit etre l'autre entreprise, pas X.
- "confiance_extraction" reflete TA confiance dans la lecture de ce texte (0 = illisible, 1 = certain).
- Un avoir porte des montants negatifs : ne les rends pas positifs.
- Reponds uniquement avec un objet JSON respectant exactement ce schema, sans aucun texte autour :

{
  "tiers": string,
  "date_facture": string au format YYYY-MM-DD,
  "montant_ht": number,
  "taux_tva": number,
  "montant_tva": number,
  "montant_ttc": number,
  "numero_piece": string,
  "ice_fournisseur": string ou null,
  "ice_client": string ou null,
  "type_document": "facture" ou "avoir",
  "confiance_extraction": number entre 0 et 1
}`;

/**
 * Structure le texte brut d'une piece comptable en champs exploitables.
 *
 * @param rawText texte extrait par ocr/extract.ts (pdf-text, ocr ou excel)
 * @param ocrConfidence confiance OCR normalisee sur 0-1, ou null si la
 *   methode d'extraction n'en produit pas (pdf-text, excel). Une confiance
 *   Tesseract (0-100) doit etre divisee par 100 avant l'appel.
 */
export async function structureExtraction(
  rawText: string,
  ocrConfidence: number | null,
): Promise<StructureResult> {
  if (ocrConfidence !== null && ocrConfidence < MIN_OCR_CONFIDENCE) {
    return { failed: true, reason: "confiance_ocr_insuffisante" };
  }

  if (rawText.trim().length === 0) {
    return { failed: true, reason: "texte_vide" };
  }

  const model = getAzureChatModel();

  let responseText: string;
  try {
    const response = await model.bind({ response_format: { type: "json_object" } }).invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(`Texte brut extrait de la piece :\n\n${rawText}`),
    ]);
    responseText = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  } catch (err) {
    return { failed: true, reason: `appel_llm_echoue: ${errorMessage(err)}` };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(responseText);
  } catch {
    return { failed: true, reason: "json_invalide" };
  }

  const result = extractionSchema.safeParse(parsedJson);
  if (!result.success) {
    return { failed: true, reason: "validation_schema_echouee" };
  }

  if (!isAmountConsistent(result.data)) {
    return { failed: true, reason: "incoherence_montants" };
  }

  return result.data;
}

// Garde-fou independant du LLM : HT + TVA doit egaler TTC. Une erreur d'OCR
// (chiffre perdu, decalage de virgule) sur un seul des trois montants brise
// cette egalite meme quand le LLM a fidelement retranscrit le texte source
// et s'est declare confiant. Tolerance large pour absorber les arrondis
// legitimes (TVA calculee ligne par ligne, centimes).
const ABSOLUTE_TOLERANCE_MAD = 0.05;
const RELATIVE_TOLERANCE = 0.001;

function isAmountConsistent(data: StructuredExtraction): boolean {
  const expectedTtc = data.montant_ht + data.montant_tva;
  const tolerance = Math.max(ABSOLUTE_TOLERANCE_MAD, Math.abs(expectedTtc) * RELATIVE_TOLERANCE);
  return Math.abs(expectedTtc - data.montant_ttc) <= tolerance;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
