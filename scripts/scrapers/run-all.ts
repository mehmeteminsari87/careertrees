import "dotenv/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { scrapeAllGreenhouse } from "./greenhouse";
import { scrapeAllLever } from "./lever";
import { scrapeAllWorkday } from "./workday";
import { persistScrapeResults } from "./persist";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  const scrapeRunId = randomUUID();
  console.log(`\n=== Scrape run ${scrapeRunId} starting ===\n`);
  const startTime = Date.now();

  const allResults = (
    await Promise.all([
      scrapeAllGreenhouse(),
      scrapeAllLever(),
      scrapeAllWorkday(),
    ])
  ).flat();

  console.log(`\n=== Persisting to database ===\n`);

  const stats = await persistScrapeResults(pool, allResults, scrapeRunId);

  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Run complete in ${totalSeconds}s ===`);
  console.log(`  Companies scraped: ${allResults.length}`);
  console.log(`  Jobs inserted:     ${stats.inserted}`);
  console.log(`  Jobs updated:      ${stats.updated}`);
  console.log(`  Jobs closed:       ${stats.closed}`);
  console.log(`  Jobs skipped:      ${stats.skipped} (outside live markets)`);
  console.log(`  Errors:            ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log(`\nFirst 10 errors:`);
    stats.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
