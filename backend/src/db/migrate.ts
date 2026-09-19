import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(join(currentDir, "schema.sql"), "utf-8");
  try {
    await pool.query(sql);
    console.log("Schema applique avec succes.");
  } catch (err) {
    console.error("Echec de l'application du schema.");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
