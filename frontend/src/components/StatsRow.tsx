import { ANOMALY_FAMILY_LABELS, type StatsData } from "../types";
import styles from "./StatsRow.module.css";

interface StatsRowProps {
  stats: StatsData;
}

function StatsRow({ stats }: StatsRowProps) {
  const totalAnomalies = Object.values(stats.anomaliesByFamily).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Rapprochement bancaire</span>
        <span className={styles.metricValue}>
          {stats.reconciliationRate}%
        </span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Documents traités</span>
        <span className={styles.metricValue}>
          {stats.documentsProcessed}/{stats.documentsTotal}
        </span>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricLabel}>Anomalies détectées</span>
        <span className={styles.metricValue}>{totalAnomalies}</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.families}>
        {(Object.entries(stats.anomaliesByFamily) as [
          keyof typeof ANOMALY_FAMILY_LABELS,
          number,
        ][]).map(([family, count]) => (
          <div className={styles.family} key={family}>
            <span className={styles.familyLabel}>
              {ANOMALY_FAMILY_LABELS[family]}
            </span>
            <span className={styles.familyValue}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatsRow;
