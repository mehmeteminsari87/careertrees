import { headers } from "next/headers";
import { COUNTRIES, isCountryCode } from "@/lib/countries";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const h = await headers();
  const host = h.get("host") ?? "ie.careertrees.org";
  const subdomain = host.split(".")[0]?.toLowerCase() ?? "ie";
  const code = isCountryCode(subdomain) ? subdomain : "ie";
  const country = COUNTRIES[code];
  const siteUrl = `https://${code}.careertrees.org`;

  // llms.txt — AI crawler index
  // Spec: https://llmstxt.org
  const body = `# CareerTrees ${country.name}

> Verified, active job listings in ${country.name}, sourced directly from company applicant tracking systems. Each listing includes salary data when available, visa sponsorship status, tech stack, and a direct apply link to the company's site (no intermediary).

## Core pages

- [All open roles](${siteUrl}/jobs): Every active position in ${country.name}, refreshed multiple times daily.
- [Visa-sponsored roles](${siteUrl}/jobs/visa-sponsorship): Positions at employers with verified permit-sponsoring history.
- [Companies](${siteUrl}/companies): Profiles with funding, headcount, tech stack, and visa sponsorship history.
- [Salary data](${siteUrl}/salaries): Actual advertised salaries by role and city.

## Data sources

- Greenhouse, Lever, Workday, SmartRecruiters, Ashby and other public ATS APIs
- Government employer permit registers (e.g. Ireland DETE Trusted Partner List)
- Numbeo (cost of living)
- Public corporate filings

## How we differ

- No paid placements; ranking is purely by relevance and recency.
- We do not host the application form. Every "Apply" button goes directly to the employer's site.
- Listings are removed within 24 hours of disappearing from the source ATS.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
