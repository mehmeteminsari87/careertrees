import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { NormalizedJob, ScrapeResult, ScrapeTarget } from "./types";
import { detectCity, detectCountry, detectRemote, htmlToText, safeFetch, sleep, withRetry } from "./utils";
import { targetsByAts } from "./targets";

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  location: { name: string };
  absolute_url: string;
  metadata?: Array<{ name: string; value: unknown }>;
  content?: string;          // HTML
  departments?: Array<{ id: number; name: string }>;
  offices?: Array<{ id: number; name: string; location?: string }>;
  pay_input_ranges?: Array<{
    min_cents?: number;
    max_cents?: number;
    currency_type?: string;
    interval?: string;
    description?: string;
  }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: { total: number };
}

const BASE = "https://boards-api.greenhouse.io/v1/boards";

export async function scrapeGreenhouse(target: ScrapeTarget): Promise<ScrapeResult> {
  const errors: string[] = [];
  const jobs: NormalizedJob[] = [];

  try {
    // First call: list of all jobs (lightweight)
    const listUrl = `${BASE}/${target.token}/jobs?content=true`;
    const listRes = await withRetry(() => safeFetch(listUrl));

    if (!listRes.ok) {
      errors.push(`HTTP ${listRes.status} on ${listUrl}`);
      return { target, jobs, errors };
    }

    const data = (await listRes.json()) as GreenhouseResponse;
    const ghJobs = data.jobs ?? [];

    for (const j of ghJobs) {
      try {
        const html = j.content ?? "";
        const text = htmlToText(html);
        const locText = j.location?.name ?? null;
        const country = detectCountry(locText);
        const city = detectCity(locText, country);
        const { isRemote, policy } = detectRemote(locText, j.title, text);

        // Greenhouse pay ranges (when employer fills them in — common in CA/CO due to law)
        let salaryMin: number | null = null;
        let salaryMax: number | null = null;
        let salaryCurrency: string | null = null;
        let salaryPeriod: NormalizedJob["salaryPeriod"] = null;

        const pay = j.pay_input_ranges?.[0];
        if (pay && pay.min_cents != null) {
          salaryMin = pay.min_cents / 100;
          salaryMax = pay.max_cents != null ? pay.max_cents / 100 : null;
          salaryCurrency = pay.currency_type ?? null;
          if (pay.interval === "year" || pay.interval === "yearly") salaryPeriod = "year";
          else if (pay.interval === "month" || pay.interval === "monthly") salaryPeriod = "month";
          else if (pay.interval === "hour" || pay.interval === "hourly") salaryPeriod = "hour";
          else if (pay.interval === "day" || pay.interval === "daily") salaryPeriod = "day";
        }

        const department = j.departments?.[0]?.name ?? null;

        jobs.push({
          externalId: String(j.id),
          title: j.title.trim(),
          descriptionHtml: html,
          descriptionText: text,
          locationText: locText,
          isRemote,
          remotePolicy: policy,
          countryCode: country,
          city,
          salaryMin,
          salaryMax,
          salaryCurrency,
          salaryPeriod,
          employmentType: null,         // Greenhouse doesn't standardize this — extract from text later
          department,
          applyUrl: j.absolute_url,
          postedAt: new Date(j.updated_at),
          validThrough: null,
          rawPayload: j,
        });
      } catch (err) {
        errors.push(`Failed to parse job ${j.id}: ${(err as Error).message}`);
      }
    }

    // Politeness: small pause to not hammer Greenhouse
    await sleep(500);
  } catch (err) {
    errors.push(`Fatal: ${(err as Error).message}`);
  }

  return { target, jobs, errors };
}

export async function scrapeAllGreenhouse(): Promise<ScrapeResult[]> {
  const targets = targetsByAts("greenhouse");
  const results: ScrapeResult[] = [];

  console.log(`[greenhouse] Scraping ${targets.length} companies...`);

  for (const t of targets) {
    const startedAt = Date.now();
    const result = await scrapeGreenhouse(t);
    const ms = Date.now() - startedAt;
    console.log(
      `[greenhouse] ${t.companyName.padEnd(20)} → ${result.jobs.length} jobs, ${result.errors.length} errors (${ms}ms)`,
    );
    results.push(result);
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeAllGreenhouse()
    .then((results) => {
      const totalJobs = results.reduce((sum, r) => sum + r.jobs.length, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      console.log(`\nDone. ${totalJobs} jobs, ${totalErrors} errors across ${results.length} companies.`);
      // TODO: persist to DB once DATABASE_URL is set
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
