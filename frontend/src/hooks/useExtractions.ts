import { useEffect, useState } from "react";
import { fetchExtractions, type ExtractionListItem } from "../api/extractions";

interface UseExtractionsResult {
  extractions: ExtractionListItem[];
  loading: boolean;
  error: string | null;
}

// Charge la liste reelle des documents traites par l'Ingestor (GPT-4.1),
// telle que persistee dans documents/extractions.
export function useExtractions(): UseExtractionsResult {
  const [extractions, setExtractions] = useState<ExtractionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchExtractions()
      .then((result) => {
        if (!cancelled) setExtractions(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { extractions, loading, error };
}
