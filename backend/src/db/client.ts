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

// Le pooler Supabase recycle les connexions idle ; pg emet alors un evenement
// "error" sur le pool. Sans listener, cette erreur devient une exception non
// interceptee qui fait planter tout le process (meme au milieu d'un batch
// qui n'utilisait pas la connexion en question). On la journalise et on
// laisse le pool remplacer la connexion en interne, comme documente par pg.
pool.on("error", (err) => {
  console.error("Erreur pool pg (connexion recyclee par le serveur) :", err.message);
});
