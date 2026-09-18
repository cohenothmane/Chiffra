// Types partagés pour le Dashboard. Les données réelles remplaceront les
// mocks une fois l'API branchée, sans changer la forme de ces interfaces.

export interface LotStatus {
  lotId: string;
  processedAgo: string;
  stepsCompleted: number;
  stepsTotal: number;
}

export interface ExposureData {
  totalDH: number;
  documentsReconciled: number;
  documentsTotal: number;
}

export type AnomalyFamily =
  | "duplicate"
  | "vat_error"
  | "out_of_period"
  | "unknown_party"
  | "abnormal_amount";

export const ANOMALY_FAMILY_LABELS: Record<AnomalyFamily, string> = {
  duplicate: "Doublon",
  vat_error: "TVA erronée",
  out_of_period: "Hors période",
  unknown_party: "Tiers inconnu",
  abnormal_amount: "Montant aberrant",
};

export interface StatsData {
  reconciliationRate: number;
  documentsProcessed: number;
  documentsTotal: number;
  anomaliesByFamily: Record<AnomalyFamily, number>;
}

export type AgentStepStatus = "pending" | "in_progress" | "done";

export type AgentName =
  | "Ingestor"
  | "Reconciler"
  | "Auditor"
  | "Explainer"
  | "Orchestrator";

export interface AgentStep {
  id: string;
  name: AgentName;
  status: AgentStepStatus;
}

export interface Anomaly {
  id: string;
  amountDH: number;
  family: AnomalyFamily;
  confidence: number;
}
