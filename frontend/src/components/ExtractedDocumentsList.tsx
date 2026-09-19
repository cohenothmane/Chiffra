import type { ExtractionListItem } from "../api/extractions";
import styles from "./ExtractedDocumentsList.module.css";

interface ExtractedDocumentsListProps {
  extractions: ExtractionListItem[];
  loading: boolean;
  error: string | null;
  limit?: number;
}

function formatAmount(value: string | null): string {
  if (value === null) return "—";
  return Number(value).toLocaleString("fr-FR");
}

function ExtractedDocumentsList({ extractions, loading, error, limit = 8 }: ExtractedDocumentsListProps) {
  if (loading) {
    return <p className={styles.footer}>Chargement des pièces extraites…</p>;
  }

  if (error) {
    return <p className={styles.footer}>API indisponible ({error}) — vérifie que le backend tourne.</p>;
  }

  const visible = extractions.slice(0, limit);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th>Fichier</th>
            <th>Tiers</th>
            <th className={styles.amountCol}>Montant TTC</th>
            <th>Date</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => (
            <tr className={styles.row} data-status={item.status} key={item.document_id}>
              <td className={styles.filename}>{item.filename}</td>
              <td className={styles.tiers}>{item.tiers ?? "—"}</td>
              <td className={styles.amount}>{formatAmount(item.montant_ttc)}</td>
              <td className={styles.date}>{item.date_facture ?? "—"}</td>
              <td>
                <span className={styles.status} data-status={item.status}>
                  {item.status === "processed" ? "Traité" : (item.failure_reason ?? "Échec")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className={styles.footer}>
        <span className="num">{visible.length}</span> sur <span className="num">{extractions.length}</span> documents
        (issus de l'Ingestor, GPT-4.1)
      </span>
    </div>
  );
}

export default ExtractedDocumentsList;
