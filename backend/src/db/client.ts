import { Pool, types } from "pg";

// Par defaut, pg parse les colonnes DATE en objets Date JS a minuit heure
// locale, ce qui les decale d'un jour une fois serialises en UTC (ex: DATE
// '2026-01-05' -> "2026-01-04T23:00:00.000Z" en UTC+1). On garde la chaine
// "YYYY-MM-DD" brute telle que stockee, sans conversion de fuseau.
const PG_TYPE_DATE = 1082;
types.setTypeParser(PG_TYPE_DATE, (value: string) => value);

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
