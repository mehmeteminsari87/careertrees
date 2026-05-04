import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { NormalizedJob, ScrapeResult, ScrapeTarget } from "./types";
import { detectCity, detectCountry, detectRemote, htmlToText, safeFetch, sleep, withRetry } from "./utils";
import { targetsByAts } from "./targets";

// Workday public CXS endpoint:
//   POST https://{workdayHost}/wday/cxs/{tenant}/{site}/jobs
//   body: { "appliedFacets": {}, "limit": 20, "offset": 0, "searchText": "" }
//
// Response includes a list with externalPath like /job/Dublin/Software-Engineer_JR-12345.
// To get description: GET https://{workdayHost}/wday/cxs/{tenant}/{site}/job{externalPath}

interface WorkdayListResponse {
  jobPostings: Array<{
    title: string;
    externalPath: string;
    locationsText: string;
    postedOn: string;
    bulletFields?: string[];
  }>;
  total: number;
}

interface WorkdayJobDetail {
  jobPostingInfo?: {
    id: string;
    title: string;
    jobDescription: string;        // HTML
    location?: string;
    postedOn?: string;
    endDate?: string;
    timeType?: string;
    externalUrl?: string;
  };
}

const PAGE_SIZE = 20;

export async function scrapeWorkday(target: ScrapeTarget): Promise<ScrapeResult> {
  const errors: string[] = [];
  const jobs: NormalizedJob[] = [];

  if (!target.workdayHost || !target.workdaySite) {
    errors.push("Missing workdayHost or workdaySite for Workday target");
    return { target, jobs, errors };
  }

  const baseList = `https://${target.workdayHost}/wday/cxs/${target.token}/${target.workdaySite}/jobs`;
  const baseDetail = `https://${target.workdayHost}/wday/cxs/${target.token}/${target.workdaySite}/job`;

  try {
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const res = await withRetry(() =>
        safeFetch(baseList, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliedFacets: {},
            limit: PAGE_SIZE,
            offset,
            searchText: "",
          }),
        }),
      );

      if (!res.ok) {
        errors.push(`HTTP ${res.status} on ${baseList} offset=${offset}`);
        break;
      }

      const data = (await res.json()) as WorkdayListResponse;
      total = data.total;

      for (const posting of data.jobPostings) {
        try {
          // Fetch detail to get description and externalUrl
          const detailUrl = `${baseDetail}${posting.externalPath}`;
          const detailRes = await withRetry(() => safeFetch(detailUrl));

          if (!detailRes.ok) {
            errors.push(`Detail HTTP ${detailRes.status} on ${detailUrl}`);
            continue;
          }

          const detail = (await detailRes.json()) as WorkdayJobDetail;
          const info = detail.jobPostingInfo;
          if (!info) continue;

          const html = info.jobDescription ?? "";
          const text = htmlToText(html);
          const locText = info.location ?? posting.locationsText ?? null;
          const country = detectCountry(locText);
          const city = detectCity(locText, country);
          const { isRemote, policy } = detectRemote(locText, info.title, text);

          let employmentType: NormalizedJob["employmentType"] = null;
          const tt = info.timeType?.toLowerCase() ?? "";
          if (tt.includes("full")) employmentType = "full_time";
          else if (tt.includes("part")) employmentType = "part_time";
          else if (tt.includes("contract")) employmentType = "contract";
          else if (tt.includes("intern")) employmentType = "internship";

          jobs.push({
            externalId: info.id,
            title: info.title.trim(),
            descriptionHtml: html,
            descriptionText: text,
            locationText: locText,
            isRemote,
            remotePolicy: policy,
            countryCode: country,
            city,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryPeriod: null,
            employmentType,
            department: null,
            applyUrl: info.externalUrl ?? `https://${target.workdayHost}${posting.externalPath}`,
            postedAt: info.postedOn ? new Date(info.postedOn) : new Date(posting.postedOn),
            validThrough: info.endDate ? new Date(info.endDate) : null,
            rawPayload: { posting, detail },
          });

          // Politeness: detail calls are heavier, longer delay
          await sleep(800);
        } catch (err) {
          errors.push(`Failed posting ${posting.externalPath}: ${(err as Error).message}`);
        }
      }

      offset += PAGE_SIZE;
      await sleep(1500);
    }
  } catch (err) {
    errors.push(`Fatal: ${(err as Error).message}`);
  }

  return { target, jobs, errors };
}

export async function scrapeAllWorkday(): Promise<ScrapeResult[]> {
  const targets = targetsByAts("workday");
  const results: ScrapeResult[] = [];

  console.log(`[workday] Scraping ${targets.length} companies...`);

  for (const t of targets) {
    const startedAt = Date.now();
    const result = await scrapeWorkday(t);
    const ms = Date.now() - startedAt;
    console.log(
      `[workday] ${t.companyName.padEnd(20)} → ${result.jobs.length} jobs, ${result.errors.length} errors (${ms}ms)`,
    );
    results.push(result);
  }

  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeAllWorkday()
    .then((results) => {
      const totalJobs = results.reduce((sum, r) => sum + r.jobs.length, 0);
      console.log(`\nDone. ${totalJobs} jobs.`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
