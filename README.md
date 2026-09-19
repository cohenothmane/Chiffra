# Chiffra

## Problème

Les cabinets comptables marocains contrôlent encore à la main des centaines de factures fournisseurs et de lignes de relevé bancaire par dossier client : ressaisie, vérification de la TVA, pointage facture/paiement. La généralisation prochaine de la facturation électronique obligatoire va démultiplier ce volume, sans que les cabinets disposent d'un outil pour l'absorber autrement qu'en ajoutant des heures de saisie.

Chiffra automatise une partie de ce contrôle : lire les pièces, les structurer, les rapprocher des relevés bancaires, et remonter les anomalies.

## Architecture agentique

**Ingestor et Reconciler sont pleinement fonctionnels, testés sur les 108 documents réels du corpus.** Auditor, Explainer et Orchestrator (au sens d'une orchestration LangGraph complète) ne sont pas terminés.

- **Ingestor** — lit une pièce (PDF texte, PDF/photo scanné via OCR Tesseract + `pdfjs-dist`, export Excel) et en extrait des champs structurés via GPT-4.1, avec validation stricte par schéma Zod (rejet si incohérence HT+TVA≠TTC, rejet si confiance OCR insuffisante). [backend/src/agents/ingestor.ts](backend/src/agents/ingestor.ts)
- **Reconciler** — rapproche chaque facture avec une ligne de relevé bancaire : matching déterministe sur tiers normalisé + fenêtre de 60 jours + montant identique à 0,01 MAD près, calculé exclusivement en `decimal.js` (jamais de flottant). [backend/src/agents/reconciler.ts](backend/src/agents/reconciler.ts)
- **Auditor** — pas complet. Une seule des 5 familles d'anomalies attendues tourne en production aujourd'hui : la détection de doublons (même tiers + même montant TTC + même date, sur des documents traités), en SQL pur, exposée par `GET /api/anomalies/summary`. [backend/src/routes/anomalies.ts](backend/src/routes/anomalies.ts)
- **Explainer** — route `/api/chat` existante mais non connectée aux données réelles d'extraction/rapprochement (pas de récupération en base, pas de citation de pièce).
- **Orchestrator** — pas de graphe LangGraph. Ingestor et Reconciler s'exécutent via des scripts indépendants (`test-ingestor.ts`, `test-reconciler.ts`), pas via un pipeline automatique déclenché à l'upload.

## Stack technique

- **Frontend** : React / Vite, TypeScript.
- **Backend** : Fastify (Node.js / TypeScript).
- **Base de données** : Supabase (Postgres managé) — choix assumé pour la vélocité en solo, voir ci-dessous.
- **Calculs** : `decimal.js` pour tous les montants (HT/TVA/TTC, écarts de rapprochement, exposition des doublons) — jamais de comparaison flottante directe sur de l'argent.
- **Extraction/structuration** : GPT-4.1 (Azure OpenAI), sortie JSON contrainte + validation Zod.

### Choix Supabase

`DATABASE_URL` pointe vers un Postgres managé Supabase plutôt que sur le service `postgres` local de `docker-compose.yml`. Choix de vélocité pour un développement solo sous contrainte de temps : pas d'infra à maintenir localement. Le client DB ([backend/src/db/client.ts](backend/src/db/client.ts)) n'utilise qu'une connection string Postgres standard, sans dépendance propriétaire Supabase — basculer sur le Postgres local du `docker-compose.yml` est un simple changement de `DATABASE_URL`.

## Résultats mesurés

Sur le corpus réel (108 documents + 14 lignes issues d'un export Excel = 121 lignes source) :
- **110 extractions structurées** sur 121 lignes traitées.
- **97/108 documents** traités avec succès par l'Ingestor.
- **54 % de rapprochement bancaire réel** (factures effectivement matchées par le Reconciler).
- **13 groupes de doublons** détectés, pour **813 719,89 DH** d'exposition cumulée.

## Comment lancer le projet

1. **Backend** — copier `backend/.env.example` en `backend/.env` et renseigner :
   - `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT_NAME` (GPT-4.1) — ou `LLM_URL` / `LLM_API_KEY` / `LLM_MODEL` selon le fournisseur réellement lu par [backend/src/agents/llm-client.ts](backend/src/agents/llm-client.ts).
   - `DATABASE_URL` (connection string Supabase, ou Postgres local).
   - `REDIS_URL` (`redis://localhost:6379` en local).
   - Appliquer [backend/src/db/schema.sql](backend/src/db/schema.sql) sur l'instance Postgres ciblée.

2. **Lancement manuel** (recommandé à ce stade — voir état de Docker ci-dessous) :
   ```bash
   cd backend && npm install && npm run dev   # API Fastify sur :3000
   cd frontend && npm install && npm run dev  # Vite sur :5173
   ```
   Pour exécuter le pipeline sur le corpus :
   ```bash
   cd backend
   npx tsx src/agents/test-ingestor.ts      # structure les pièces
   npx tsx src/agents/test-reconciler.ts    # rapproche avec les relevés
   ```

3. **Docker Compose** — `docker-compose.yml` est présent (services `web`, `api`, `worker`, `postgres`, `redis`) mais son état actuel n'a pas été validé de bout en bout pour cette version : le service `worker` ne traite aucun job réel (boucle vide), l'ingestion/le rapprochement ne sont pas encore déclenchés automatiquement par l'API. Privilégier le lancement manuel ci-dessus pour une démo fiable.

## Ce qui reste à faire

- **Auditor complet** : TVA erronée, facture hors période, tiers inconnu du référentiel, montant aberrant — seule la détection de doublons est en production.
- **Explainer** : connecter `/api/chat` aux données réelles (extractions, rapprochements, anomalies) avec citation de pièce.
- **Orchestration LangGraph** : chaîner Ingestor → Reconciler → Auditor → Explainer dans un vrai graphe d'agents, déclenché à l'upload plutôt que par scripts manuels.
- **Boucle de revue humaine (EX-06)** : validation/correction manuelle d'une extraction ou d'un rapprochement par le comptable.
- **Tests unitaires `domain/`** : le domaine métier n'a pas de suite de tests dédiée à ce stade.
