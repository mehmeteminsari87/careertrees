import type { Metadata } from "next";
import Link from "next/link";
import { getAllOccupations } from "@/lib/queries";
import { JsonLd } from "@/components/json-ld";

export const revalidate = 86400; // 24 hours — government data, slow-changing

export const metadata: Metadata = {
  title: "Critical Skills Employment Permit Ireland — 2026 Guide | CareerTrees",
  description:
    "Ireland's Critical Skills Employment Permit explained: €40,904 minimum salary, 82 eligible occupations, Trusted Partner employers, and current open roles you can apply to.",
  alternates: { canonical: "https://ie.careertrees.org/visa/critical-skills-permit" },
};

export default async function CriticalSkillsPermitPage() {
  const occupations = await getAllOccupations();
  const categoryCount = new Set(occupations.map((o) => o.category)).size;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the minimum salary for a Critical Skills Permit in Ireland?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "€40,904 per year as of March 2026, up from €38,000 previously. The threshold is set by the Department of Enterprise, Trade and Employment (DETE).",
        },
      },
      {
        "@type": "Question",
        name: "How many occupations are eligible for the Critical Skills Permit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `${occupations.length} occupations across ${categoryCount} categories, set out in SI 444 of 2024 (effective 2 September 2024). The list covers ICT, engineering, healthcare, pharmacy, accounting, and several other specialised fields.`,
        },
      },
      {
        "@type": "Question",
        name: "Do I need a job offer before applying for a Critical Skills Permit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Either you or your employer can apply, but a confirmed job offer of at least 2 years duration is required. The role must be on the Critical Skills Occupations list and the salary must meet the €40,904 threshold (or €32,000 if you hold a degree relevant to the role).",
        },
      },
      {
        "@type": "Question",
        name: "What is the Trusted Partner programme?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trusted Partner status lets approved employers submit permit applications on behalf of employees with reduced paperwork. Employers apply once and reuse the registration for subsequent hires. Most established multinationals in Ireland (Stripe, Intel, Pfizer, Microsoft) are Trusted Partners.",
        },
      },
      {
        "@type": "Question",
        name: "Can my family come with me on a Critical Skills Permit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Critical Skills holders can bring spouses/partners and dependent children immediately upon arrival without a separate work permit application for the spouse — they receive automatic permission to work.",
        },
      },
      {
        "@type": "Question",
        name: "How long is the Critical Skills Permit valid?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Two years initially. After 21 months you can apply for a Stamp 4 immigration permission, which removes the employer-tied restriction and lets you change employers freely. After 5 years you may apply for long-term residence.",
        },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={faqJsonLd} />

      <nav className="mb-6 text-sm text-[color:var(--color-muted)]">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <span>Critical Skills Permit</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Critical Skills Employment Permit — Ireland 2026 Guide
        </h1>
        <p className="mt-3 text-lg text-[color:var(--color-muted)]">
          What you need to qualify, who's hiring, and how the €40,904 threshold changes things.
        </p>
        <p className="mt-2 text-xs text-[color:var(--color-muted)]">
          Last updated 4 May 2026 · Source:{" "}
          <a
            href="https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/employment-permit-eligibility/highly-skilled-eligible-occupations-list/"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            DETE — SI 444 of 2024
          </a>
        </p>
      </header>

      <section className="mb-10 grid gap-3 sm:grid-cols-2">
        <Stat label="Min. salary (€)" value="40,904" sub="per year (March 2026 onward)" />
        <Stat label="Reduced threshold" value="32,000" sub="if degree matches role" />
        <Stat label="Eligible occupations" value={occupations.length.toString()} sub={`${categoryCount} categories`} />
        <Stat label="Initial validity" value="2 years" sub="renewable, Stamp 4 after 21 months" />
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Who qualifies</h2>
        <p>
          The Critical Skills Permit is Ireland's primary route for non-EEA workers in occupations the
          state considers undersupplied. The eligible list is set in regulation (SI 444 of 2024) and
          covers {occupations.length} specific occupations grouped under {categoryCount} categories,
          including ICT roles, engineering disciplines, regulated healthcare professions, industrial
          pharmacists, and a defined set of finance/accounting roles with specialist requirements.
        </p>
        <p>
          You qualify if all four hold:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Your job title matches an occupation on the eligible list</li>
          <li>The annual salary is at least €40,904 (or €32,000 with a degree matching the role)</li>
          <li>The job offer is for two years or longer</li>
          <li>The employer is registered with Revenue and complies with the Pay Transparency Directive</li>
        </ul>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">What changed in 2025–2026</h2>
        <p>
          The minimum salary moved from €38,000 to €40,904 in March 2026, tracking the rise in median
          full-time earnings. The Standard Employment Permit minimum sits at €34,000 — distinct from
          and lower than the Critical Skills threshold.
        </p>
        <p>
          The eligible occupations list itself has been stable since SI 444 came into force on 2
          September 2024. No occupations have been added or removed in 2025–2026.
        </p>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Application path</h2>
        <p>
          Either you or the employer can submit the application via the DETE Employment Permits Online
          System (EPOS). Trusted Partner employers — most established multinationals in Ireland — file
          a streamlined version. Typical processing time: 4–8 weeks for Trusted Partner submissions,
          8–13 weeks otherwise.
        </p>
        <p>
          After 21 months on the permit you can apply for Stamp 4, which lifts the employer-tie
          restriction and lets you change jobs without a new permit application. After 5 years total
          residence you may apply for long-term residence.
        </p>
      </section>

      <section className="mb-10 rounded-md border border-[color:var(--color-border)] p-5">
        <h2 className="mb-3 text-xl font-semibold">Find roles eligible right now</h2>
        <p className="mb-4 text-sm text-[color:var(--color-muted)]">
          We track jobs from companies that post directly to public ATS feeds (Greenhouse, Lever,
          Workday). Filter by occupation and salary threshold below.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/visa/critical-skills-permit/occupations"
            className="rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-fg)]"
          >
            Browse {occupations.length} eligible occupations →
          </Link>
          <Link
            href="/jobs"
            className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium hover:border-[color:var(--color-accent)]"
          >
            All open roles in Ireland
          </Link>
        </div>
      </section>

      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Frequently asked</h2>
        <FaqItem q="What is the minimum salary for a Critical Skills Permit in Ireland?">
          €40,904 per year as of March 2026, up from €38,000. Set by DETE.
        </FaqItem>
        <FaqItem q="How many occupations are eligible?">
          {occupations.length} occupations across {categoryCount} categories. SI 444 of 2024.
        </FaqItem>
        <FaqItem q="Do I need a job offer first?">
          Yes. Two-year minimum offer, salary at threshold, role on the eligible list.
        </FaqItem>
        <FaqItem q="What is the Trusted Partner programme?">
          A streamlined path for approved employers to file permit applications with reduced
          paperwork. Most established multinationals in Ireland qualify.
        </FaqItem>
        <FaqItem q="Can my family come with me?">
          Yes. Spouses and dependent children join you on arrival. Spouses receive automatic
          permission to work — no separate permit needed.
        </FaqItem>
        <FaqItem q="How long is the permit valid?">
          Two years initially. Stamp 4 (no employer tie) is available after 21 months. Long-term
          residence option after 5 years.
        </FaqItem>
      </section>

      <footer className="border-t border-[color:var(--color-border)] pt-6 text-sm text-[color:var(--color-muted)]">
        <p>
          This guide is independent reporting based on the official DETE eligibility list and the
          March 2026 salary review. We are not a law firm and not an immigration agent — for
          individual legal advice consult a qualified immigration solicitor. For the canonical source
          documents see{" "}
          <a
            href="https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            enterprise.gov.ie
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] p-4">
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-[color:var(--color-muted)]">{sub}</div>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-[color:var(--color-border)] p-4">
      <summary className="cursor-pointer font-medium">{q}</summary>
      <div className="mt-2 text-sm text-[color:var(--color-muted)]">{children}</div>
    </details>
  );
}
