import type { AgentStep, AgentStepStatus } from "../types";
import styles from "./AgentTimeline.module.css";

interface AgentTimelineProps {
  steps: AgentStep[];
}

const STATUS_LABEL: Record<AgentStepStatus, string> = {
  done: "Terminé",
  in_progress: "En cours",
  pending: "En attente",
};

function StepMarker({ status, index }: { status: AgentStepStatus; index: number }) {
  if (status === "done") return <>✓</>;
  if (status === "in_progress") return <span className={styles.pulseDot} />;
  return <>{index}</>;
}

function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <div className={styles.wrap}>
      {steps.map((step, i) => (
        <div key={step.id} style={{ display: "contents" }}>
          <div className={styles.step} data-status={step.status}>
            <div className={styles.marker}>
              <StepMarker status={step.status} index={i + 1} />
            </div>
            <div className={styles.stepText}>
              <span className={styles.name}>{step.name}</span>
              <span className={styles.statusLabel}>
                {STATUS_LABEL[step.status]}
              </span>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              className={styles.connector}
              data-filled={step.status === "done"}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default AgentTimeline;
