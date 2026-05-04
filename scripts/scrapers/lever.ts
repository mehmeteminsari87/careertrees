import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { NormalizedJob, ScrapeResult, ScrapeTarget } from "./types";
import { detectCity, detectCountry, detectRemote, htmlToText, safeFetch, sleep, withRetry } from "./utils";
import { targetsByAts } from "./targets";

interface LeverPosting {
  id: string;
  text: string;                              // job title
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;                         // ms timestamp
  categories: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
    level?: string;
    allLocations?: string[];
  };
  description: string;                       // HTML
  descriptionPlain: string;
  lists: Array<{ text: string; content: string }>;
  workplaceType?: "on-site" | "remote" | "hybrid" | "unspecified";
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  };
}

const BASE = "https://api.lever.co/v0/postings";

export async function scrapeLever(target: ScrapeTarget): Promise<ScrapeResult> {
  const errors: string[] = [];
  const jobs: NormalizedJob[] = [];

  try {
    const url = `${BASE}/${target.token}?mode=json`;
    const res = await withRetry(() => safeFetch(url));

    if (!res.ok) {
      errors.push(`HTTP ${res.status} on ${url}`);
      return { target, jobs, errors };
    }

    const postings = (await res.json()) as LeverPosting[];

    for (const p of postings) {
      try {
        const html = p.description ?? "";
        const text = p.descriptionPlain ?? htmlToText(html);
        const locText = p.categories.location ?? p.categories.allLocations?.[0] ?? null;
        const country = detectCountry(locText);
        const city = detectCity(locText, country);

        let isRemote = false;
        let policy: NormalizedJob["remotePolicy"] = null;
        if (p.workplaceType === "remote") { isRemote = true; policy = "remote"; }
        else if (p.workplaceType === "hybrid") { policy = "hybrid"; }
        else if (p.workplaceType === "on-site") { policy = "onsite"; }
        else {
          const detected = detectRemote(locText, p.text, text);
          isRemote = detected.isRemote;
          policy = detected.policy;
        }

        let employmentType: NormalizedJob["employmentType"] = null;
        const commitment = p.categories.commitment?.toLowerCase() ?? "";
        if (commitment.includes("full")) employmentType = "full_time";
        else if (commitment.includes("part")) employmentType = "part_time";
        else if (commitment.includes("contract")) employmentType = "contract";
        else if (commitment.includes("intern")) employmentType = "internship";

        let salaryMin: number | null = null;
        let salaryMax: number | null = null;
        let salaryCurrency: string | null = null;
        let salaryPeriod: NormalizedJob["salaryPeriod"] = null;
        if (p.salaryRange) {
          salaryMin = p.salaryRange.min ?? null;
          salaryMax = p.salaryRange.max ?? null;
          salaryCurrency = p.salaryRange.currency ?? null;
          const interval = p.salaryRange.interval?.toLowerCase() ?? "";
          if (interval.includes("year")) salaryPeriod = "year";
          else if (interval.includes("month")) salaryPeriod = "month";
          else if (interval.includes("hour")) salaryPeriod = "hour";
          else if (interval.includes("day")) salaryPeriod = "day";
        }

        jobs.push({
          externalId: p.id,
          title: p.text.trim(),
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
          employmentType,
          department: p.categories.department ?? p.categories.team ?? null,
          applyUrl: p.applyUrl ?? p.hostedUrl,
          postedAt: new Date(p.createdAt),
          validThrough: null,
          rawPayload: p,
        });
      } catch (err) {
        errors.push(`Failed to parse posting ${p.id}: ${(err as Error).message}`);
      }
    }

    await sleep(500);
  } catch (err) {
    errors.push(`Fatal: ${(err as Error).message}`);
  }

  return { target, jobs, errors };
}

export async function scrapeAllLever(): Promise<ScrapeResult[]> {
  const targets = targetsByAts("lever");
  const results: ScrapeResult[] = [];

  console.log(`[lever] Scraping ${targets.length} companies...`);

  for (const t of targets) {
    const startedAt = Date.now();
    const result = await scrapeLever(t);
    const ms = Date.now() - startedAt;
    console.log(
      `[lever] ${t.companyName.padEnd(20)} → ${result.jobs.length} jobs, ${result.errors.length} errors (${ms}ms)`,
    );
    results.push(result);
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeAllLever()
    .then((results) => {
      const totalJobs = results.reduce((sum, r) => sum + r.jobs.length, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      console.log(`\nDone. ${totalJobs} jobs, ${totalErrors} errors.`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
