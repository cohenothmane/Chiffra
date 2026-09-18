import { ANOMALY_FAMILY_LABELS, type Anomaly } from "../types";
import styles from "./AnomalyPreviewList.module.css";

interface AnomalyPreviewListProps {
  anomalies: Anomaly[];
}

function AnomalyPreviewList({ anomalies }: AnomalyPreviewListProps) {
  const topFive = [...anomalies]
    .sort((a, b) => b.amountDH - a.amountDH)
    .slice(0, 5);

  return (
    <table className={styles.table}>
      <thead>
        <tr className={styles.headRow}>
          <th className={styles.amountCol}>Montant DH</th>
          <th>Type</th>
          <th>Confiance</th>
        </tr>
      </thead>
      <tbody>
        {topFive.map((anomaly) => (
          <tr className={styles.row} key={anomaly.id}>
            <td className={styles.amount}>
              {anomaly.amountDH.toLocaleString("fr-FR")}
            </td>
            <td className={styles.family}>
              {ANOMALY_FAMILY_LABELS[anomaly.family]}
            </td>
            <td>
              <div className={styles.confidence}>
                <div className={styles.confidenceBar}>
                  <div
                    className={styles.confidenceFill}
                    style={{ width: `${anomaly.confidence}%` }}
                  />
                </div>
                <span className={styles.confidenceValue}>
                  {anomaly.confidence}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default AnomalyPreviewList;
