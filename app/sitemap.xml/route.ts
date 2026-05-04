import { headers } from "next/headers";
import { isCountryCode } from "@/lib/countries";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const h = await headers();
  const host = h.get("host") ?? "ie.careertrees.org";
  const subdomain = host.split(".")[0]?.toLowerCase() ?? "ie";
  const country = isCountryCode(subdomain) ? subdomain : "ie";
  const siteUrl = `https://${country}.careertrees.org`;

  const urls: Array<{ loc: string; lastmod?: string; priority?: number }> = [
    { loc: `${siteUrl}/`, priority: 1.0 },
    { loc: `${siteUrl}/jobs`, priority: 0.9 },
    { loc: `${siteUrl}/companies`, priority: 0.8 },
    { loc: `${siteUrl}/jobs/visa-sponsorship`, priority: 0.8 },
    { loc: `${siteUrl}/jobs/remote`, priority: 0.7 },
  ];

  // Active jobs
  try {
    const jobs = await query<{ id: number; title: string; updated: Date }>(
      `select j.id, j.title, greatest(j.posted_at, j.last_seen_at) as updated
       from jobs j
       where j.country_code = $1 and j.closed_at is null
       order by updated desc
       limit 10000`,
      [country],
    );
    for (const j of jobs) {
      const slug = j.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
      urls.push({
        loc: `${siteUrl}/job/${j.id}/${slug}`,
        lastmod: new Date(j.updated).toISOString(),
        priority: 0.6,
      });
    }

    const companies = await query<{ slug: string; updated_at: Date }>(
      `select slug, updated_at from companies where active = true and hq_country_code = $1`,
      [country],
    );
    for (const c of companies) {
      urls.push({
        loc: `${siteUrl}/companies/${c.slug}`,
        lastmod: new Date(c.updated_at).toISOString(),
        priority: 0.7,
      });
    }

    const roles = await query<{ slug: string }>(`select slug from roles`);
    for (const r of roles) {
      urls.push({ loc: `${siteUrl}/jobs/${r.slug}`, priority: 0.7 });
    }

    const cities = await query<{ city_slug: string }>(
      `select city_slug from locations where country_code = $1`,
      [country],
    );
    for (const c of cities) {
      urls.push({ loc: `${siteUrl}/jobs/in/${c.city_slug}`, priority: 0.6 });
    }
  } catch {
    // DB not configured yet — return basic sitemap
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}${u.priority != null ? `\n    <priority>${u.priority.toFixed(1)}</priority>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
