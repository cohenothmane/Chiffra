import { useCountUp } from "../hooks/useCountUp";
import type { ExposureData } from "../types";
import styles from "./ExposureCounter.module.css";

interface ExposureCounterProps {
  data: ExposureData;
}

function ExposureCounter({ data }: ExposureCounterProps) {
  const animatedTotal = useCountUp(data.totalDH);

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Exposition financière totale</span>
      <div className={styles.amountRow}>
        <span className={styles.amount}>
          {animatedTotal.toLocaleString("fr-FR")}
        </span>
        <span className={styles.currency}>DH</span>
      </div>
      <span className={styles.sub}>
        sur{" "}
        <span className="num">
          {data.documentsReconciled}/{data.documentsTotal}
        </span>{" "}
        documents rapprochés
      </span>
    </div>
  );
}

export default ExposureCounter;
