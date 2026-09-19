-- Complements au schema existant (documents, extractions, anomalies,
-- bank_lines, reconciliations, review_decisions deja crees sur Supabase
-- en dehors de ce repo). On ne touche qu'a ce qui manque pour l'Ingestor :
-- les champs ICE et le type facture/avoir necessaires aux regles fiscales,
-- le texte brut pour l'audit, et une contrainte d'unicite sur le nom de
-- fichier pour permettre de relancer l'ingestion sans dupliquer les
-- documents.

ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS ice_fournisseur TEXT,
  ADD COLUMN IF NOT EXISTS ice_client TEXT,
  ADD COLUMN IF NOT EXISTS type_document TEXT CHECK (type_document IN ('facture', 'avoir')),
  ADD COLUMN IF NOT EXISTS texte_brut TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS documents_filename_key ON documents (filename);

-- source_row_id : quand un seul fichier physique (export-achats-T2.xlsx)
-- produit plusieurs extractions (une ligne de tableau = une piece), on garde
-- l'identifiant source de la ligne (ex: "DOC-094") pour tracer d'ou vient
-- chaque extraction. NULL pour les extractions issues d'un PDF/image (un
-- document = au plus une extraction, pas d'ambiguite a lever).
ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS source_row_id TEXT;
