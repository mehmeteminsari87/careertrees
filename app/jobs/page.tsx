import { getActiveJobsByCountry } from "@/lib/queries";
import { getCurrentCountry } from "@/lib/country-context";
import { JobCard } from "@/components/job-card";

export const revalidate = 600; // 10 minutes

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 25;

export default async function JobsPage({ searchParams }: PageProps) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? 1));
  const offset = (pageNum - 1) * PER_PAGE;
  const country = await getCurrentCountry();
  const jobs = await getActiveJobsByCountry(country.code, PER_PAGE, offset);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All open roles in {country.name}</h1>
        <p className="mt-2 text-[color:var(--color-muted)]">
          Verified active listings, pulled directly from company career pages.
        </p>
      </header>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <p className="text-[color:var(--color-muted)]">No active roles right now. Check back tomorrow.</p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {jobs.length === PER_PAGE && (
        <nav className="mt-8 flex justify-between text-sm">
          {pageNum > 1 ? (
            <a href={`/jobs?page=${pageNum - 1}`} className="hover:underline">← Previous</a>
          ) : <span />}
          <a href={`/jobs?page=${pageNum + 1}`} className="hover:underline">Next →</a>
        </nav>
      )}
    </main>
  );
}
