const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface ExtractionsSummary {
  total: number;
  succes: number;
  echec: number;
  montantTtcTotal: number;
}

export async function fetchExtractionsSummary(): Promise<ExtractionsSummary> {
  const response = await fetch(`${API_BASE_URL}/api/extractions/summary`);
  if (!response.ok) {
    throw new Error(`Echec du chargement du resume des extractions (${response.status})`);
  }
  return response.json();
}

// Forme brute renvoyee par GET /api/extractions : une ligne par document,
// les montants et la confiance arrivant en string (type `numeric` cote
// Postgres). `tiers`/`montant_ttc`/... sont `null` quand le document a
// echoue (pas de ligne extractions correspondante).
export interface ExtractionListItem {
  document_id: string;
  filename: string;
  status: "processed" | "failed";
  failure_reason: string | null;
  tiers: string | null;
  date_facture: string | null;
  montant_ht: string | null;
  taux_tva: string | null;
  montant_tva: string | null;
  montant_ttc: string | null;
  numero_piece: string | null;
  confiance: string | null;
  type_document: "facture" | "avoir" | null;
}

export async function fetchExtractions(): Promise<ExtractionListItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/extractions`);
  if (!response.ok) {
    throw new Error(`Echec du chargement des extractions (${response.status})`);
  }
  return response.json();
}

export interface ReconciliationSummary {
  matched: number;
  total: number;
  rate: number;
}

export async function fetchReconciliationSummary(): Promise<ReconciliationSummary> {
  const response = await fetch(`${API_BASE_URL}/api/reconciliation/summary`);
  if (!response.ok) {
    throw new Error(`Echec du chargement du resume de rapprochement (${response.status})`);
  }
  return response.json();
}

export interface AnomalySummaryItem {
  type: "doublon";
  tiers: string;
  montantTtc: number;
  occurrences: number;
  expositionDh: number;
}

export interface AnomaliesSummary {
  totalExpositionDh: number;
  anomalies: AnomalySummaryItem[];
  totalAnomalies: number;
}

export async function fetchAnomaliesSummary(): Promise<AnomaliesSummary> {
  const response = await fetch(`${API_BASE_URL}/api/anomalies/summary`);
  if (!response.ok) {
    throw new Error(`Echec du chargement du resume des anomalies (${response.status})`);
  }
  return response.json();
}
