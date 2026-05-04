export interface NormalizedJob {
  externalId: string;
  title: string;
  descriptionHtml: string;
  descriptionText: string;
  locationText: string | null;
  isRemote: boolean;
  remotePolicy: "remote" | "hybrid" | "onsite" | null;
  countryCode: string | null;
  city: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "year" | "month" | "day" | "hour" | null;
  employmentType: "full_time" | "part_time" | "contract" | "temporary" | "internship" | null;
  department: string | null;
  applyUrl: string;
  postedAt: Date;
  validThrough: Date | null;
  rawPayload: unknown;
}

export interface ScrapeTarget {
  companyName: string;
  companySlug: string;
  countryCode: string;
  ats: "greenhouse" | "lever" | "workday" | "smartrecruiters" | "ashby" | "personio" | "recruitee" | "teamtailor" | "pinpoint" | "occupop";
  token: string;                  // ATS company identifier (boards.greenhouse.io/{token}, jobs.lever.co/{token}, etc.)
  workdayHost?: string;           // for Workday: e.g., "wd5.myworkdayjobs.com"
  workdaySite?: string;           // for Workday: e.g., "External"
  website?: string;
}

export interface ScrapeResult {
  target: ScrapeTarget;
  jobs: NormalizedJob[];
  errors: string[];
}
