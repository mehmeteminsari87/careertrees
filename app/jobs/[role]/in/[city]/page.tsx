import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJobsByRoleAndCity, getRoleStatsByCity } from "@/lib/queries";
import { getCurrentCountry } from "@/lib/country-context";
import { JobCard } from "@/components/job-card";
import { JsonLd } from "@/components/json-ld";
import { itemListJsonLd, breadcrumbJsonLd } from "@/lib/schema-org";
import { jobUrl } from "@/lib/slug";
import { query, queryOne } from "@/lib/db";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ role: string; city: string }>;
}

async function loadMeta(roleSlug: string, citySlug: string) {
  const [role, city] = await Promise.all([
    queryOne<{ name: string }>(`select name from roles where slug = $1`, [roleSlug]),
    queryOne<{ city_name: string; country_code: string }>(
      `select city_name, country_code from locations where city_slug = $1`,
      [citySlug],
    ),
  ]);
  return { roleName: role?.name ?? null, cityName: city?.city_name ?? null, cityCountry: city?.country_code ?? null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { role, city } = await params;
  const { roleName, cityName } = await loadMeta(role, city);
  if (!roleName || !cityName) return { title: "Not found" };
  return {
    title: `${roleName} jobs in ${cityName}`,
    description: `Active ${roleName} positions in ${cityName}. Salary, visa sponsorship, and tech stack info on every listing.`,
  };
}

export default async function RoleCityPage({ params }: PageProps) {
  const { role, city } = await params;
  const country = await getCurrentCountry();
  const { roleName, cityName } = await loadMeta(role, city);
  if (!roleName || !cityName) notFound();

  const [jobs, stats] = await Promise.all([
    getJobsByRoleAndCity(role, city, country.code, 50),
    getRoleStatsByCity(role, city, country.code),
  ]);

  // Don't index pages with too few jobs (low quality signal)
  const tooThin = jobs.length < 3;
  const siteUrl = `https://${country.code}.careertrees.org`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {tooThin && (
        <meta name="robots" content="noindex,follow" />
      )}
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Jobs", url: `${siteUrl}/jobs` },
            { name: roleName, url: `${siteUrl}/jobs/${role}` },
            { name: cityName, url: `${siteUrl}/jobs/${role}/in/${city}` },
          ]),
          itemListJsonLd(
            jobs.map((j) => ({ url: `${siteUrl}${jobUrl(j.id, j.title)}`, name: j.title })),
          ),
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {roleName} jobs in {cityName}
        </h1>
        <p className="mt-2 text-[color:var(--color-muted)]">
          {jobs.length} active position{jobs.length === 1 ? "" : "s"}
          {stats?.company_count ? ` across ${stats.company_count} companies` : ""}.
        </p>
      </header>

      {stats?.median_salary_min && (
        <section className="mb-6 rounded-md border border-[color:var(--color-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">
            Median advertised salary
          </div>
          <div className="mt-1 text-lg font-semibold">
            €{Math.round(Number(stats.median_salary_min) / 1000)}k
            {stats.median_salary_max && stats.median_salary_max !== stats.median_salary_min
              ? `–€${Math.round(Number(stats.median_salary_max) / 1000)}k`
              : ""}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-[color:var(--color-muted)]">No active roles match right now.</p>
        ) : (
          jobs.map((j) => <JobCard key={j.id} job={j} />)
        )}
      </div>
    </main>
  );
}
