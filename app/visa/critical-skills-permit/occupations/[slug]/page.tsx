import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOccupationBySlug, getJobsByOccupation } from "@/lib/queries";
import { JsonLd } from "@/components/json-ld";
import { JobCard } from "@/components/job-card";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const o = await getOccupationBySlug(slug);
  if (!o) return { title: "Occupation not found" };
  return {
    title: `${o.name} — Critical Skills Permit eligible (Ireland) | CareerTrees`,
    description: `${o.name} is on Ireland's Critical Skills Occupations List. Salary threshold €${o.ie_salary_threshold_eur.toLocaleString()}. ${o.specialisation_notes ?? ""}`.slice(0, 160),
    alternates: {
      canonical: `https://ie.careertrees.org/visa/critical-skills-permit/occupations/${o.slug}`,
    },
  };
}

export default async function OccupationPage({ params }: PageProps) {
  const { slug } = await params;
  const o = await getOccupationBySlug(slug);
  if (!o) notFound();

  const jobs = await getJobsByOccupation(o.id, "ie", 25);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ie.careertrees.org/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Critical Skills Permit",
        item: "https://ie.careertrees.org/visa/critical-skills-permit",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Occupations",
        item: "https://ie.careertrees.org/visa/critical-skills-permit/occupations",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: o.name,
        item: `https://ie.careertrees.org/visa/critical-skills-permit/occupations/${o.slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={breadcrumbs} />

      <nav className="mb-6 text-sm text-[color:var(--color-muted)]">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/visa/critical-skills-permit" className="hover:underline">Critical Skills Permit</Link>
        {" / "}
        <Link href="/visa/critical-skills-permit/occupations" className="hover:underline">Occupations</Link>
        {" / "}
        <span>{o.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{o.name}</h1>
        <p className="mt-3 text-[color:var(--color-muted)]">
          Eligible for Ireland's Critical Skills Employment Permit. Category: {o.category}
          {o.soc_code ? ` · SOC ${o.soc_code}` : ""}.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Min. salary" value={`€${o.ie_salary_threshold_eur.toLocaleString()}`} sub="per year" />
        <Stat label="SOC code" value={o.soc_code ?? "—"} sub="ONS classification" />
        <Stat label="Status" value="Eligible ✓" sub="Critical Skills" />
      </section>

      {o.specialisation_notes && (
        <section className="mb-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950">
          <div className="mb-1 font-medium">Specialisation requirement</div>
          <p>{o.specialisation_notes}</p>
          <p className="mt-2 text-xs text-[color:var(--color-muted)]">
            Roles outside this specialisation may not qualify even if the title matches. Confirm with
            the employer or an immigration solicitor.
          </p>
        </section>
      )}

      <section className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">What this occupation covers</h2>
        <p>
          {o.name} sits within the broader {o.category} group on Ireland's Critical Skills
          Occupations List (SI 444 of 2024). The list is the legal definition of which roles can be
          filled by non-EEA workers under the streamlined Critical Skills route, and it is reviewed
          periodically by DETE in consultation with the Expert Group on Future Skills Needs.
        </p>
        <p>
          To use this occupation as the basis for a Critical Skills Permit application, the job title
          on the offer letter does not need to match exactly — but the role's actual duties must fall
          within the occupation as defined in the SOC classification.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">
          Open roles{" "}
          <span className="text-sm font-normal text-[color:var(--color-muted)]">
            ({jobs.length} active in Ireland)
          </span>
        </h2>

        {jobs.length === 0 ? (
          <div className="rounded-md border border-[color:var(--color-border)] p-5">
            <p className="text-sm text-[color:var(--color-muted)]">
              No active {o.name} roles right now in our index. We re-scan public ATS feeds three
              times a day — bookmark this page or check the{" "}
              <Link href="/jobs" className="underline">all open roles</Link> page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/visa/critical-skills-permit"
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm hover:border-[color:var(--color-accent)]"
          >
            ← Permit overview
          </Link>
          <Link
            href="/visa/critical-skills-permit/occupations"
            className="rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm hover:border-[color:var(--color-accent)]"
          >
            All occupations
          </Link>
        </div>
      </section>

      <footer className="border-t border-[color:var(--color-border)] pt-6 text-sm text-[color:var(--color-muted)]">
        <p>
          Source:{" "}
          <a
            href="https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/employment-permit-eligibility/highly-skilled-eligible-occupations-list/"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            DETE Critical Skills Occupations List
          </a>
          {o.source_effective_date
            ? ` · Effective ${new Date(o.source_effective_date).toISOString().slice(0, 10)}`
            : ""}
        </p>
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] p-3">
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-[color:var(--color-muted)]">{sub}</div>
    </div>
  );
}
