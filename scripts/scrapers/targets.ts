import type { ScrapeTarget } from "./types";

// Initial Ireland target list — to be expanded to 50+
// Detection method: visit each company's careers page; URL pattern reveals ATS
//   boards.greenhouse.io/{token}        → greenhouse
//   jobs.lever.co/{token}               → lever
//   {tenant}.{region}.myworkdayjobs.com → workday
//   jobs.smartrecruiters.com/{token}    → smartrecruiters
//   jobs.ashbyhq.com/{token}            → ashby
//
// IMPORTANT: The tokens below are placeholders / educated guesses based on common patterns.
// Verify each one by visiting boards-api.greenhouse.io/v1/boards/{token}/jobs
// before relying on it. Use scripts/scrapers/verify-targets.ts to batch-check.

export const TARGETS: ScrapeTarget[] = [
  // ========== Greenhouse (most common for tech) ==========
  { companyName: "Stripe", companySlug: "stripe", countryCode: "ie", ats: "greenhouse", token: "stripe", website: "https://stripe.com" },
  { companyName: "HubSpot", companySlug: "hubspot", countryCode: "ie", ats: "greenhouse", token: "hubspot", website: "https://www.hubspot.com" },
  { companyName: "Intercom", companySlug: "intercom", countryCode: "ie", ats: "greenhouse", token: "intercom", website: "https://www.intercom.com" },
  { companyName: "Workday", companySlug: "workday", countryCode: "ie", ats: "greenhouse", token: "workday", website: "https://www.workday.com" },
  { companyName: "Datadog", companySlug: "datadog", countryCode: "ie", ats: "greenhouse", token: "datadog", website: "https://www.datadoghq.com" },
  { companyName: "Wayflyer", companySlug: "wayflyer", countryCode: "ie", ats: "greenhouse", token: "wayflyer", website: "https://wayflyer.com" },
  { companyName: "Tines", companySlug: "tines", countryCode: "ie", ats: "greenhouse", token: "tines", website: "https://www.tines.com" },
  { companyName: "Flipdish", companySlug: "flipdish", countryCode: "ie", ats: "greenhouse", token: "flipdish", website: "https://www.flipdish.com" },
  { companyName: "LetsGetChecked", companySlug: "letsgetchecked", countryCode: "ie", ats: "greenhouse", token: "letsgetchecked", website: "https://www.letsgetchecked.com" },
  { companyName: "Manna", companySlug: "manna", countryCode: "ie", ats: "greenhouse", token: "manna", website: "https://www.manna.aero" },
  { companyName: "Mastercard", companySlug: "mastercard", countryCode: "ie", ats: "greenhouse", token: "mastercard", website: "https://www.mastercard.com" },
  { companyName: "Cloudflare", companySlug: "cloudflare", countryCode: "ie", ats: "greenhouse", token: "cloudflare", website: "https://www.cloudflare.com" },
  { companyName: "Pinterest", companySlug: "pinterest", countryCode: "ie", ats: "greenhouse", token: "pinterest", website: "https://www.pinterest.com" },
  { companyName: "Squarespace", companySlug: "squarespace", countryCode: "ie", ats: "greenhouse", token: "squarespace", website: "https://www.squarespace.com" },
  { companyName: "Etsy", companySlug: "etsy", countryCode: "ie", ats: "greenhouse", token: "etsy", website: "https://www.etsy.com" },

  // ========== Lever ==========
  { companyName: "Workhuman", companySlug: "workhuman", countryCode: "ie", ats: "lever", token: "workhuman", website: "https://www.workhuman.com" },

  // ========== Ashby ==========
  // (add as discovered)

  // ========== Workday (host varies per tenant) ==========
  // Google: careers.google.com (not Workday). Meta uses internal. Skipping for now.
  // Most Workday tenants: {tenant}.{region}.myworkdayjobs.com — needs verification per company.

  // ========== SmartRecruiters ==========
  // (add as discovered)
];

export function targetsByAts(ats: ScrapeTarget["ats"]): ScrapeTarget[] {
  return TARGETS.filter((t) => t.ats === ats);
}
