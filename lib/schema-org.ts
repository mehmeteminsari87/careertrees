// Schema.org JSON-LD generators
// Reference: https://developers.google.com/search/docs/appearance/structured-data/job-posting
// Reference: https://schema.org/JobPosting

import { addDays } from "date-fns";

export interface JobPostingInput {
  id: number | string;
  title: string;
  descriptionHtml: string;
  postedAt: Date;
  validThrough: Date | null;
  closedAt: Date | null;
  applyUrl: string;
  employmentType: string | null;
  isRemote: boolean;
  remotePolicy: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "year" | "month" | "day" | "hour" | null;
  locationText: string | null;
  cityName: string | null;
  countryCode: string | null;
  company: {
    name: string;
    slug: string;
    website: string | null;
    logoUrl: string | null;
  };
  pageUrl: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  ie: "Ireland",
  nl: "Netherlands",
  pt: "Portugal",
  it: "Italy",
  de: "Germany",
};

export function jobPostingJsonLd(input: JobPostingInput): Record<string, unknown> {
  const validThrough = input.validThrough ?? addDays(input.postedAt, 60);
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    temporary: "TEMPORARY",
    internship: "INTERN",
  };

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: input.title,
    description: input.descriptionHtml,
    datePosted: input.postedAt.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: input.employmentType ? employmentTypeMap[input.employmentType] ?? "FULL_TIME" : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: input.company.name,
      sameAs: input.company.website,
      logo: input.company.logoUrl,
    },
    directApply: false,
    url: input.pageUrl,
    identifier: {
      "@type": "PropertyValue",
      name: input.company.name,
      value: String(input.id),
    },
  };

  // Location: either onsite (jobLocation) or remote (applicantLocationRequirements + jobLocationType)
  if (input.isRemote) {
    ld.jobLocationType = "TELECOMMUTE";
    if (input.countryCode) {
      ld.applicantLocationRequirements = {
        "@type": "Country",
        name: COUNTRY_NAMES[input.countryCode] ?? input.countryCode.toUpperCase(),
      };
    }
  } else if (input.cityName && input.countryCode) {
    ld.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: input.cityName,
        addressCountry: input.countryCode.toUpperCase(),
      },
    };
  } else if (input.locationText) {
    ld.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: input.locationText,
        addressCountry: input.countryCode?.toUpperCase() ?? null,
      },
    };
  }

  // Salary
  if (input.salaryMin != null && input.salaryCurrency) {
    const unitText = input.salaryPeriod ? input.salaryPeriod.toUpperCase() : "YEAR";
    ld.baseSalary = {
      "@type": "MonetaryAmount",
      currency: input.salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: input.salaryMin,
        maxValue: input.salaryMax ?? input.salaryMin,
        unitText,
      },
    };
  }

  // Closed status
  if (input.closedAt) {
    ld.eventStatus = "JobPostingClosed";
  }

  return ld;
}

export interface OrganizationInput {
  name: string;
  slug: string;
  url: string | null;
  logoUrl: string | null;
  description: string | null;
  foundingDate: number | null;
  numberOfEmployees: number | null;
  linkedinUrl: string | null;
  crunchbaseUrl: string | null;
  pageUrl: string;
}

export function organizationJsonLd(input: OrganizationInput): Record<string, unknown> {
  const sameAs = [input.linkedinUrl, input.crunchbaseUrl, input.url].filter(Boolean);
  return {
    "@context": "https://schema.org/",
    "@type": "Organization",
    name: input.name,
    url: input.pageUrl,
    logo: input.logoUrl,
    description: input.description,
    foundingDate: input.foundingDate ? `${input.foundingDate}` : null,
    numberOfEmployees: input.numberOfEmployees
      ? { "@type": "QuantitativeValue", value: input.numberOfEmployees }
      : null,
    sameAs,
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function itemListJsonLd(items: Array<{ url: string; name: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      name: item.name,
    })),
  };
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org/",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function websiteJsonLd(siteUrl: string, siteName: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/jobs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdString(
  data: Record<string, unknown> | Array<Record<string, unknown>>,
): string {
  return JSON.stringify(data);
}
