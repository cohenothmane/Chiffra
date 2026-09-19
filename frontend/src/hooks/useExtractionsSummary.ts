import { useEffect, useState } from "react";
import { fetchExtractionsSummary, type ExtractionsSummary } from "../api/extractions";

interface UseExtractionsSummaryResult {
  summary: ExtractionsSummary | null;
  error: string | null;
}

// Charge le resume reel des documents traites par l'Ingestor (succes/echec,
// montant TTC total) depuis l'API backend. `summary` reste `null` tant que
// la requete n'a pas abouti ; l'appelant retombe alors sur des valeurs
// mockees le temps du chargement ou en cas d'echec.
export function useExtractionsSummary(): UseExtractionsSummaryResult {
  const [summary, setSummary] = useState<ExtractionsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchExtractionsSummary()
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
