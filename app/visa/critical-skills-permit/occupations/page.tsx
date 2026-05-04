import type { Metadata } from "next";
import Link from "next/link";
import { getOccupationsByCategory, getOccupationJobCounts } from "@/lib/queries";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Critical Skills Eligible Occupations — Ireland | CareerTrees",
  description:
    "All 82 occupations eligible for Ireland's Critical Skills Employment Permit. Each links to current open roles, salary context, and what to expect for that occupation.",
  alternates: {
    canonical: "https://ie.careertrees.org/visa/critical-skills-permit/occupations",
  },
};

export default async function OccupationsListPage() {
  const grouped = await getOccupationsByCategory();
  const jobCounts = await getOccupationJobCounts();
  const categoryOrder = Object.keys(grouped).sort();
  const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);
  const totalActiveJobs = Object.values(jobCounts).reduce((s, n) => s + n, 0);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <nav className="mb-6 text-sm text-[color:var(--color-muted)]">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/visa/critical-skills-permit" className="hover:underline">Critical Skills Permit</Link>
        {" / "}
        <span>Occupations</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Eligible occupations — Critical Skills Permit
        </h1>
        <p className="mt-3 text-[color:var(--color-muted)]">
          {total} occupations across {categoryOrder.length} categories ·{" "}
          <strong className="text-[color:var(--color-accent)]">{totalActiveJobs} active roles</strong>{" "}
          across these occupations right now in Ireland. Source: DETE SI 444 of 2024.
        </p>
      </header>

      <div className="space-y-8">
        {categoryOrder.map((category) => (
          <section key={category}>
            <h2 className="mb-3 text-lg font-semibold">
              {category} <span className="text-sm font-normal text-[color:var(--color-muted)]">({grouped[category].length})</span>
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {grouped[category].map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/visa/critical-skills-permit/occupations/${o.slug}`}
                    className="block rounded-md border border-[color:var(--color-border)] px-3 py-2 text-sm hover:border-[color:var(--color-accent)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{o.name}</div>
                        {o.soc_code && (
                          <div className="text-xs text-[color:var(--color-muted)]">SOC {o.soc_code}</div>
                        )}
                      </div>
                      {jobCounts[o.id] ? (
                        <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                          {jobCounts[o.id]} open
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
