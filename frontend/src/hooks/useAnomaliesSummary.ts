import { useEffect, useState } from "react";
import { fetchAnomaliesSummary, type AnomaliesSummary } from "../api/extractions";

interface UseAnomaliesSummaryResult {
  summary: AnomaliesSummary | null;
  error: string | null;
}

// Charge le resume reel des anomalies (doublons uniquement pour l'instant)
// depuis l'API backend. `summary` reste `null` tant que la requete n'a pas
// abouti ; l'appelant retombe alors sur un etat de chargement.
export function useAnomaliesSummary(): UseAnomaliesSummaryResult {
  const [summary, setSummary] = useState<AnomaliesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAnomaliesSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { summary, error };
}
