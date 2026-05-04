import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJobById } from "@/lib/queries";
import { jobUrl } from "@/lib/slug";
import { jobPostingJsonLd, breadcrumbJsonLd } from "@/lib/schema-org";
import { JsonLd } from "@/components/json-ld";
import { getCurrentCountry } from "@/lib/country-context";

export const revalidate = 3600; // 1 hour ISR

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(Number(id));
  if (!job) return { title: "Job not found" };

  const location = job.city_name ?? job.location_text ?? "";
  return {
    title: `${job.title} at ${job.company_name}${location ? ` — ${location}` : ""}`,
    description: job.description_text.slice(0, 160),
    alternates: { canonical: jobUrl(job.id, job.title) },
  };
}

export default async function JobPage({ params }: PageProps) {
  const { id, slug } = await params;
  const job = await getJobById(Number(id));
  if (!job) notFound();

  // Canonicalize slug — if the URL slug doesn't match, the canonical metadata fixes it
  const country = await getCurrentCountry();
  const siteUrl = `https://${country.code}.careertrees.org`;
  const fullUrl = `${siteUrl}${jobUrl(job.id, job.title)}`;

  const jsonLd = jobPostingJsonLd({
    id: job.id,
    title: job.title,
    descriptionHtml: job.description_html,
    postedAt: new Date(job.posted_at),
    validThrough: job.valid_through ? new Date(job.valid_through) : null,
    closedAt: job.closed_at ? new Date(job.closed_at) : null,
    applyUrl: job.apply_url,
    employmentType: job.employment_type,
    isRemote: job.is_remote,
    remotePolicy: job.remote_policy,
    salaryMin: job.salary_min ? Number(job.salary_min) : null,
    salaryMax: job.salary_max ? Number(job.salary_max) : null,
    salaryCurrency: job.salary_currency,
    salaryPeriod: (job.salary_period as "year" | "month" | "day" | "hour" | null) ?? null,
    locationText: job.location_text,
    cityName: job.city_name,
    countryCode: job.country_code,
    company: {
      name: job.company_name,
      slug: job.company_slug,
      website: job.company_website,
      logoUrl: job.company_logo_url,
    },
    pageUrl: fullUrl,
  });

  const crumbs = breadcrumbJsonLd([
    { name: "Jobs", url: `${siteUrl}/jobs` },
    { name: job.company_name, url: `${siteUrl}/companies/${job.company_slug}` },
    { name: job.title, url: fullUrl },
  ]);

  const isStale = job.closed_at != null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={[jsonLd, crumbs]} />

      <nav className="mb-6 text-sm text-[color:var(--color-muted)]">
        <Link href="/jobs" className="hover:underline">Jobs</Link>
        {" / "}
        <Link href={`/companies/${job.company_slug}`} className="hover:underline">
          {job.company_name}
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
        <p className="mt-2 text-lg text-[color:var(--color-muted)]">
          {job.company_name}
          {job.location_text ? ` · ${job.location_text}` : ""}
          {job.is_remote ? " · Remote" : ""}
        </p>
      </header>

      {isStale && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          This role is no longer listed on the company's career page.
        </div>
      )}

      <section aria-label="Quick facts" className="mb-6 grid gap-3 sm:grid-cols-2">
        {job.salary_min && job.salary_currency && (
          <FactCard
            label="Salary"
            value={formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period)}
          />
        )}
        {job.employment_type && (
          <FactCard label="Type" value={formatEmploymentType(job.employment_type)} />
        )}
        {job.remote_policy && (
          <FactCard label="Work" value={capitalize(job.remote_policy)} />
        )}
        {job.visa_sponsorship_offered && (
          <FactCard label="Visa" value="Sponsorship available" />
        )}
        {job.tech_stack.length > 0 && (
          <div className="rounded-md border border-[color:var(--color-border)] p-4 sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">Tech</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.tech_stack.map((t) => (
                <span key={t} className="rounded bg-[color:var(--color-border)] px-2 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <a
        href={job.apply_url}
        target="_blank"
        rel="noopener nofollow"
        className="mb-8 inline-block rounded-md bg-[color:var(--color-accent)] px-6 py-3 font-semibold text-[color:var(--color-accent-fg)]"
      >
        Apply on {job.company_name}'s site →
      </a>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: job.description_html }}
      />
    </main>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] p-4">
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function formatSalary(
  min: string,
  max: string | null,
  currency: string,
  period: string | null,
): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : `${currency} `;
  const fmt = (n: string) => `${symbol}${Math.round(Number(n) / 1000)}k`;
  const range = max && max !== min ? `${fmt(min)}–${fmt(max)}` : fmt(min);
  const suffix = period && period !== "year" ? ` / ${period}` : "";
  return `${range}${suffix}`;
}

function formatEmploymentType(type: string): string {
  return type.replace("_", " ").replace(/^./, (c) => c.toUpperCase());
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
