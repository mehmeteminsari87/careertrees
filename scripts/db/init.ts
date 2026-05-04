import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  if (!process.env.DIRECT_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error("Need DIRECT_DATABASE_URL (preferred) or DATABASE_URL set in .env");
    process.exit(1);
  }

  const connStr = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL!;
  const pool = new Pool({
    connectionString: connStr,
    ssl: connStr.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  const sqlPath = join(process.cwd(), "db", "schema.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log(`Applying schema from ${sqlPath}...`);
  await pool.query(sql);
  console.log("Schema applied successfully.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
