import "dotenv/config";
import { pool } from "./client.js";

async function main() {
  try {
    const result = await pool.query("select now() as now, version() as version");
    console.log("Connexion Supabase OK");
    console.log(result.rows[0]);
  } catch (err) {
    console.error("Connexion Supabase KO");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
