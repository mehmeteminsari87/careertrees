import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const counts = await pool.query(`
    select
      (select count(*) from occupations) as occupations,
      (select count(*) from jobs where closed_at is null) as active_jobs,
      (select count(*) from jobs where closed_at is null and occupation_id is not null) as jobs_with_occupation,
      (select count(*) from jobs where closed_at is null and role_id is not null) as jobs_with_role
  `);
  console.log("Counts:", counts.rows[0]);

  const topOccupations = await pool.query(`
    select o.name, o.category, count(j.id)::int as n
    from occupations o
    join jobs j on j.occupation_id = o.id and j.closed_at is null
    group by o.id, o.name, o.category
    order by n desc
    limit 10
  `);
  console.log("\nTop matched occupations:");
  topOccupations.rows.forEach((r) => console.log(`  ${(r.name as string).padEnd(50)} ${r.n}  (${r.category})`));

  const byCategory = await pool.query(`
    select category, count(*)::int as n
    from occupations
    group by category
    order by n desc
    limit 8
  `);
  console.log("\nTop categories:");
  byCategory.rows.forEach((r) => console.log(`  ${r.category.padEnd(50)} ${r.n}`));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
