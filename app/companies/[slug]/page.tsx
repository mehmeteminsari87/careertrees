import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompanyBySlug, getJobsByCompany } from "@/lib/queries";
import { getCurrentCountry } from "@/lib/country-context";
import { JobCard } from "@/components/job-card";
import { JsonLd } from "@/components/json-ld";
import { organizationJsonLd, breadcrumbJsonLd } from "@/lib/schema-org";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.name} — open roles, salaries, and visa info`,
    description: `${company.name} is currently hiring. See open positions, tech stack, and visa sponsorship history.`,
  };
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const jobs = await getJobsByCompany(slug, 100);
  const country = await getCurrentCountry();
  const siteUrl = `https://${country.code}.careertrees.org`;
  const pageUrl = `${siteUrl}/companies/${slug}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Companies", url: `${siteUrl}/companies` },
            { name: company.name, url: pageUrl },
          ]),
          organizationJsonLd({
            name: company.name,
            slug: company.slug,
            url: company.website,
            logoUrl: company.logo_url,
            description: company.description,
            foundingDate: company.founded_year,
            numberOfEmployees: company.employee_count_estimate,
            linkedinUrl: company.linkedin_url,
            crunchbaseUrl: company.crunchbase_url,
            pageUrl,
          }),
        ]}
      />

      <header className="mb-8 flex items-center gap-4">
        {company.logo_url && (
          <img
            src={company.logo_url}
            alt=""
            width={64}
            height={64}
            className="rounded-md"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            {company.hq_city ? `${company.hq_city} · ` : ""}
            {company.employee_count_estimate
              ? `~${company.employee_count_estimate.toLocaleString()} employees`
              : ""}
          </p>
        </div>
      </header>

      {company.is_visa_sponsor && (
        <div className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Verified visa sponsor — listed on the official permit holder register.
        </div>
      )}

      {company.description && (
        <section className="mb-8">
          <p className="leading-relaxed">{company.description}</p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Open roles ({jobs.length})
        </h2>
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <p className="text-[color:var(--color-muted)]">No active roles right now.</p>
          ) : (
            jobs.map((j) => <JobCard key={j.id} job={j} />)
          )}
        </div>
      </section>
    </main>
  );
}
