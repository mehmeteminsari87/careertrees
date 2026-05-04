import Link from "next/link";
import { jobUrl } from "@/lib/slug";
import type { JobRow } from "@/lib/queries";

export function JobCard({ job }: { job: JobRow }) {
  return (
    <Link
      href={jobUrl(job.id, job.title)}
      className="block rounded-lg border border-[color:var(--color-border)] p-5 transition hover:border-[color:var(--color-accent)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold leading-tight">{job.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
            {job.company_name}
            {job.location_text ? ` · ${job.location_text}` : ""}
            {job.is_remote ? " · Remote" : ""}
          </p>
        </div>
        {job.visa_sponsorship_offered && (
          <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
            Visa
          </span>
        )}
      </div>
      {job.tech_stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {job.tech_stack.slice(0, 6).map((t) => (
            <span key={t} className="rounded bg-[color:var(--color-border)] px-1.5 py-0.5 text-xs">
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
