import AgentTimeline from "../components/AgentTimeline";
import AnomalyPreviewList from "../components/AnomalyPreviewList";
import ChatPanel from "../components/ChatPanel";
import ExposureCounter from "../components/ExposureCounter";
import ExtractedDocumentsList from "../components/ExtractedDocumentsList";
import StatsRow from "../components/StatsRow";
import UploadZone from "../components/UploadZone";
import { useAnomaliesSummary } from "../hooks/useAnomaliesSummary";
import { useExtractions } from "../hooks/useExtractions";
import { useExtractionsSummary } from "../hooks/useExtractionsSummary";
import { useReconciliationSummary } from "../hooks/useReconciliationSummary";
import type {
  Anomaly,
  AgentStep,
  ExposureData,
  LotStatus,
  StatsData,
} from "../types";
import styles from "./Dashboard.module.css";

// Données mockées restantes — à remplacer par les réponses API/WebSocket
// réelles. "Documents traités" est branché sur l'Ingestor réel (table
// documents/extractions), l'exposition financière et le rapprochement sur
// Reconciler, les doublons sur un résumé SQL direct. Les 4 autres familles
// d'anomalies dépendent de l'Auditor, pas encore implémenté — affichées "—"
// plutôt qu'un faux zéro (cf. StatsRow).

const MOCK_LOT: LotStatus = {
  lotId: "0847",
  processedAgo: "12 min",
  stepsCompleted: 3,
  stepsTotal: 5,
};

const MOCK_AGENT_STEPS: AgentStep[] = [
  { id: "ingestor", name: "Ingestor", status: "done" },
  { id: "reconciler", name: "Reconciler", status: "done" },
  { id: "auditor", name: "Auditor", status: "done" },
  { id: "explainer", name: "Explainer", status: "in_progress" },
  { id: "orchestrator", name: "Orchestrator", status: "pending" },
];

function Dashboard() {
  const { summary } = useExtractionsSummary();
  const { extractions, loading: extractionsLoading, error: extractionsError } = useExtractions();
  const { summary: reconciliation } = useReconciliationSummary();
  const { summary: anomaliesSummary } = useAnomaliesSummary();

  const exposure: ExposureData | null =
    reconciliation && anomaliesSummary
      ? {
          totalDH: anomaliesSummary.totalExpositionDh,
          documentsReconciled: reconciliation.matched,
          documentsTotal: reconciliation.total,
        }
      : null;

  const stats: StatsData | null =
    summary && reconciliation
      ? {
          reconciliationRate: reconciliation.rate,
          documentsProcessed: summary.succes,
          documentsTotal: summary.total,
          anomaliesByFamily: {
            duplicate: anomaliesSummary?.totalAnomalies ?? null,
            vat_error: null,
            out_of_period: null,
            unknown_party: null,
            abnormal_amount: null,
          },
        }
      : null;

  // Anomalie "doublon" = correspondance exacte de clé (tiers + montant +
  // date), donc confiance pleine (100), pas une estimation probabiliste.
  const anomalies: Anomaly[] | null = anomaliesSummary
    ? anomaliesSummary.anomalies.map((a, index) => ({
        id: `doublon-${index}`,
        amountDH: a.expositionDh,
        family: "duplicate" as const,
        confidence: 100,
      }))
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.brand}>Chiffra</span>
        <span className={styles.lotStatus}>
          Dernier lot : <span className="num">#{MOCK_LOT.lotId}</span> ·
          traité il y a {MOCK_LOT.processedAgo} ·{" "}
          <span className="num">
            {MOCK_LOT.stepsCompleted}/{MOCK_LOT.stepsTotal}
          </span>{" "}
          étapes
        </span>
      </header>

      <section className={styles.hero}>
        <ExposureCounter data={exposure} />
        <StatsRow stats={stats} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Pipeline agentique</div>
        <AgentTimeline steps={MOCK_AGENT_STEPS} />
      </section>

      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.sectionTitle}>Déposer des documents</div>
          <UploadZone />
        </div>
        <div className={styles.panel}>
          <div className={styles.sectionTitle}>
            Anomalies les plus coûteuses
          </div>
          <AnomalyPreviewList anomalies={anomalies} />
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Assistant (Explainer)</div>
        <ChatPanel />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Pièces extraites par l'Ingestor (GPT-4.1)</div>
        <ExtractedDocumentsList
          extractions={extractions}
          loading={extractionsLoading}
          error={extractionsError}
        />
      </section>
    </div>
  );
}

export default Dashboard;
