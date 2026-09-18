import AgentTimeline from "../components/AgentTimeline";
import AnomalyPreviewList from "../components/AnomalyPreviewList";
import ExposureCounter from "../components/ExposureCounter";
import StatsRow from "../components/StatsRow";
import UploadZone from "../components/UploadZone";
import type {
  Anomaly,
  AgentStep,
  ExposureData,
  LotStatus,
  StatsData,
} from "../types";
import styles from "./Dashboard.module.css";

// Données mockées — à remplacer par les réponses API/WebSocket réelles.
// Les valeurs restent cohérentes entre elles (total exposition, décompte
// d'anomalies par famille, documents traités).

const MOCK_LOT: LotStatus = {
  lotId: "0847",
  processedAgo: "12 min",
  stepsCompleted: 3,
  stepsTotal: 5,
};

const MOCK_EXPOSURE: ExposureData = {
  totalDH: 127400,
  documentsReconciled: 38,
  documentsTotal: 42,
};

const MOCK_STATS: StatsData = {
  reconciliationRate: 87,
  documentsProcessed: 38,
  documentsTotal: 42,
  anomaliesByFamily: {
    duplicate: 4,
    vat_error: 5,
    out_of_period: 2,
    unknown_party: 2,
    abnormal_amount: 1,
  },
};

const MOCK_AGENT_STEPS: AgentStep[] = [
  { id: "ingestor", name: "Ingestor", status: "done" },
  { id: "reconciler", name: "Reconciler", status: "done" },
  { id: "auditor", name: "Auditor", status: "done" },
  { id: "explainer", name: "Explainer", status: "in_progress" },
  { id: "orchestrator", name: "Orchestrator", status: "pending" },
];

const MOCK_ANOMALIES: Anomaly[] = [
  { id: "a1", amountDH: 38200, family: "vat_error", confidence: 92 },
  { id: "a2", amountDH: 24750, family: "duplicate", confidence: 88 },
  { id: "a3", amountDH: 19300, family: "out_of_period", confidence: 76 },
  { id: "a4", amountDH: 12100, family: "unknown_party", confidence: 81 },
  { id: "a5", amountDH: 8900, family: "abnormal_amount", confidence: 64 },
  { id: "a6", amountDH: 6400, family: "vat_error", confidence: 71 },
  { id: "a7", amountDH: 5300, family: "duplicate", confidence: 69 },
  { id: "a8", amountDH: 4600, family: "vat_error", confidence: 58 },
  { id: "a9", amountDH: 3950, family: "duplicate", confidence: 55 },
  { id: "a10", amountDH: 3900, family: "vat_error", confidence: 52 },
];

function Dashboard() {
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
        <ExposureCounter data={MOCK_EXPOSURE} />
        <StatsRow stats={MOCK_STATS} />
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
          <AnomalyPreviewList anomalies={MOCK_ANOMALIES} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
