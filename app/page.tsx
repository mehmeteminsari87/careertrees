import Link from "next/link";
import { getCurrentCountry } from "@/lib/country-context";

export const revalidate = 3600;

export default async function HomePage() {
  const country = await getCurrentCountry();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Jobs in {country.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[color:var(--color-muted)]">
          Verified, active listings pulled directly from company career pages.
          Filter by visa sponsorship, salary, remote policy, and what tools
          you'll actually use.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/jobs"
          className="rounded-lg border border-[color:var(--color-border)] p-6 hover:border-[color:var(--color-accent)]"
        >
          <h2 className="text-xl font-semibold">All open roles</h2>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            Browse every active position across {country.name}.
          </p>
        </Link>

        <Link
          href="/jobs/visa-sponsorship"
          className="rounded-lg border border-[color:var(--color-border)] p-6 hover:border-[color:var(--color-accent)]"
        >
          <h2 className="text-xl font-semibold">Visa sponsorship</h2>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            Roles at employers with active permit-sponsoring history.
          </p>
        </Link>

        <Link
          href="/companies"
          className="rounded-lg border border-[color:var(--color-border)] p-6 hover:border-[color:var(--color-accent)]"
        >
          <h2 className="text-xl font-semibold">Companies</h2>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            Profiles with funding, headcount, and tech stack.
          </p>
        </Link>
      </section>
    </main>
  );
}
