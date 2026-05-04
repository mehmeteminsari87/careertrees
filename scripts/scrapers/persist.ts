import { Pool } from "pg";
import type { ScrapeResult, ScrapeTarget } from "./types";

interface PersistStats {
  inserted: number;
  updated: number;
  closed: number;
  errors: string[];
}

export async function persistScrapeResults(
  pool: Pool,
  results: ScrapeResult[],
  scrapeRunId: string,
): Promise<PersistStats> {
  const stats: PersistStats = { inserted: 0, updated: 0, closed: 0, errors: [] };

  // Map ATS slug → ats_source_id (cached)
  const atsMap = await getAtsSourceMap(pool);

  for (const result of results) {
    const atsSourceId = atsMap.get(result.target.ats);
    if (!atsSourceId) {
      stats.errors.push(`Unknown ATS source: ${result.target.ats}`);
      continue;
    }

    // Ensure company exists
    const companyId = await upsertCompany(pool, result.target, atsSourceId);

    // Upsert each job
    const seenExternalIds: string[] = [];

    for (const job of result.jobs) {
      try {
        seenExternalIds.push(job.externalId);

        const locationId = job.city && job.countryCode
          ? await getLocationId(pool, job.countryCode, job.city)
          : null;

        const result = await pool.query(
          `
          insert into jobs (
            external_id, ats_source_id, company_id,
            title, description_html, description_text,
            location_id, location_text, is_remote, remote_policy, country_code,
            salary_min, salary_max, salary_currency, salary_period,
            employment_type, department,
            apply_url, posted_at, valid_through, raw_payload, scrape_run_id,
            last_seen_at
          ) values (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17,
            $18, $19, $20, $21, $22,
            now()
          )
          on conflict (ats_source_id, external_id) do update set
            title = excluded.title,
            description_html = excluded.description_html,
            description_text = excluded.description_text,
            location_id = excluded.location_id,
            location_text = excluded.location_text,
            is_remote = excluded.is_remote,
            remote_policy = excluded.remote_policy,
            country_code = excluded.country_code,
            salary_min = excluded.salary_min,
            salary_max = excluded.salary_max,
            salary_currency = excluded.salary_currency,
            salary_period = excluded.salary_period,
            employment_type = excluded.employment_type,
            department = excluded.department,
            apply_url = excluded.apply_url,
            valid_through = excluded.valid_through,
            raw_payload = excluded.raw_payload,
            scrape_run_id = excluded.scrape_run_id,
            last_seen_at = now(),
            closed_at = null
          returning (xmax = 0) as inserted
          `,
          [
            job.externalId, atsSourceId, companyId,
            job.title, job.descriptionHtml, job.descriptionText,
            locationId, job.locationText, job.isRemote, job.remotePolicy, job.countryCode,
            job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod,
            job.employmentType, job.department,
            job.applyUrl, job.postedAt, job.validThrough, JSON.stringify(job.rawPayload), scrapeRunId,
          ],
        );

        if (result.rows[0]?.inserted) {
          stats.inserted++;
        } else {
          stats.updated++;
        }
      } catch (err) {
        stats.errors.push(`Job ${job.externalId}: ${(err as Error).message}`);
      }
    }

    // Mark jobs not seen this run as closed
    if (seenExternalIds.length > 0) {
      const closeRes = await pool.query(
        `
        update jobs
        set closed_at = now()
        where company_id = $1
          and ats_source_id = $2
          and closed_at is null
          and external_id != all($3::text[])
        returning id
        `,
        [companyId, atsSourceId, seenExternalIds],
      );
      stats.closed += closeRes.rowCount ?? 0;
    }
  }

  return stats;
}

async function getAtsSourceMap(pool: Pool): Promise<Map<string, number>> {
  const res = await pool.query<{ id: number; api_kind: string }>(
    `select id, api_kind from ats_sources`,
  );
  return new Map(res.rows.map((r) => [r.api_kind, r.id]));
}

async function upsertCompany(pool: Pool, target: ScrapeTarget, atsSourceId: number): Promise<number> {
  const res = await pool.query<{ id: number }>(
    `
    insert into companies (slug, name, hq_country_code, ats_source_id, ats_company_token, website)
    values ($1, $2, $3, $4, $5, $6)
    on conflict (slug) do update set
      name = excluded.name,
      ats_source_id = excluded.ats_source_id,
      ats_company_token = excluded.ats_company_token,
      website = coalesce(companies.website, excluded.website)
    returning id
    `,
    [target.companySlug, target.companyName, target.countryCode, atsSourceId, target.token, target.website ?? null],
  );
  return res.rows[0].id;
}

const locationCache = new Map<string, number>();

async function getLocationId(pool: Pool, countryCode: string, citySlug: string): Promise<number | null> {
  const key = `${countryCode}:${citySlug}`;
  if (locationCache.has(key)) return locationCache.get(key)!;

  const res = await pool.query<{ id: number }>(
    `select id from locations where country_code = $1 and city_slug = $2`,
    [countryCode, citySlug],
  );
  if (res.rows.length > 0) {
    locationCache.set(key, res.rows[0].id);
    return res.rows[0].id;
  }
  return null;
}
