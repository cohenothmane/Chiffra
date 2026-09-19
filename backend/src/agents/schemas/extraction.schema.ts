import { z } from "zod";

// Schema de la sortie structuree attendue du LLM pour une piece comptable
// (facture ou avoir). Les montants restent des nombres signes tels que lus
// dans le texte (un avoir porte des montants negatifs) : aucun champ ici
// n'est recalcule, seulement valide.
export const extractionSchema = z.object({
  tiers: z.string().min(1),
  date_facture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu YYYY-MM-DD"),
  montant_ht: z.number(),
  taux_tva: z.number(),
  montant_tva: z.number(),
  montant_ttc: z.number(),
  numero_piece: z.string().min(1),
  ice_fournisseur: z.string().nullable().optional(),
  ice_client: z.string().nullable().optional(),
  type_document: z.enum(["facture", "avoir"]),
  confiance_extraction: z.number().min(0).max(1),
});

export type StructuredExtraction = z.infer<typeof extractionSchema>;
