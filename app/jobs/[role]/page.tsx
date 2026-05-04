import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getJobsByRole } from "@/lib/queries";
import { getCurrentCountry } from "@/lib/country-context";
import { JobCard } from "@/components/job-card";
import { JsonLd } from "@/components/json-ld";
import { itemListJsonLd, breadcrumbJsonLd } from "@/lib/schema-org";
import { jobUrl, roleInCityUrl } from "@/lib/slug";
import { query } from "@/lib/db";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ role: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { role } = await params;
  const country = await getCurrentCountry();
  const roleName = await getRoleName(role);
  if (!roleName) return { title: "Role not found" };
  return {
    title: `${roleName} jobs in ${country.name}`,
    description: `Active ${roleName} positions across ${country.name}. Filter by city, salary, and visa sponsorship.`,
  };
}

async function getRoleName(slug: string): Promise<string | null> {
  const rows = await query<{ name: string }>(
    `select name from roles where slug = $1`,
    [slug],
  );
  return rows[0]?.name ?? null;
}

export default async function RoleHubPage({ params }: PageProps) {
  const { role } = await params;
  const country = await getCurrentCountry();
  const roleName = await getRoleName(role);
  if (!roleName) notFound();

  const jobs = await getJobsByRole(role, country.code, 50);
  const cities = await getCitiesForRole(role, country.code);
  const siteUrl = `https://${country.code}.careertrees.org`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Jobs", url: `${siteUrl}/jobs` },
            { name: roleName, url: `${siteUrl}/jobs/${role}` },
          ]),
          itemListJsonLd(
            jobs.map((j) => ({ url: `${siteUrl}${jobUrl(j.id, j.title)}`, name: j.title })),
          ),
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {roleName} jobs in {country.name}
        </h1>
        <p className="mt-2 text-[color:var(--color-muted)]">
          {jobs.length} active position{jobs.length === 1 ? "" : "s"}.
        </p>
      </header>

      {cities.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            By city
          </h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.city_slug}
                href={roleInCityUrl(role, c.city_slug)}
                className="rounded border border-[color:var(--color-border)] px-3 py-1.5 text-sm hover:border-[color:var(--color-accent)]"
              >
                {c.city_name} <span className="text-[color:var(--color-muted)]">({c.count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
      </div>
    </main>
  );
}

async function getCitiesForRole(roleSlug: string, countryCode: string) {
  return query<{ city_slug: string; city_name: string; count: number }>(
    `select l.city_slug, l.city_name, count(*)::int as count
     from jobs j
     join roles r on r.id = j.role_id
     join locations l on l.id = j.location_id
     where r.slug = $1 and j.country_code = $2 and j.closed_at is null
     group by l.city_slug, l.city_name
     having count(*) >= 1
     order by count desc`,
    [roleSlug, countryCode],
  );
}
