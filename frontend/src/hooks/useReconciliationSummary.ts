import { useEffect, useState } from "react";
import { fetchReconciliationSummary, type ReconciliationSummary } from "../api/extractions";

interface UseReconciliationSummaryResult {
  summary: ReconciliationSummary | null;
  error: string | null;
}

// Charge le taux de rapprochement reel (table reconciliations) depuis l'API
// backend. `summary` reste `null` tant que la requete n'a pas abouti ;
// l'appelant retombe alors sur un etat de chargement.
export function useReconciliationSummary(): UseReconciliationSummaryResult {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchReconciliationSummary()
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
