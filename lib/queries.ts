import { query, queryOne } from "./db";

export interface JobRow {
  id: number;
  title: string;
  description_html: string;
  description_text: string;
  apply_url: string;
  posted_at: Date;
  valid_through: Date | null;
  closed_at: Date | null;
  is_remote: boolean;
  remote_policy: string | null;
  location_text: string | null;
  city_name: string | null;
  city_slug: string | null;
  country_code: string | null;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string | null;
  salary_period: string | null;
  employment_type: string | null;
  department: string | null;
  tech_stack: string[];
  perks: string[];
  visa_sponsorship_offered: boolean | null;
  english_language_role: boolean | null;
  company_id: number;
  company_name: string;
  company_slug: string;
  company_website: string | null;
  company_logo_url: string | null;
  company_is_visa_sponsor: boolean;
  role_slug: string | null;
  role_name: string | null;
}

const JOB_SELECT = `
  select
    j.id, j.title, j.description_html, j.description_text, j.apply_url,
    j.posted_at, j.valid_through, j.closed_at,
    j.is_remote, j.remote_policy, j.location_text, j.country_code,
    j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
    j.employment_type, j.department,
    j.tech_stack, j.perks, j.visa_sponsorship_offered, j.english_language_role,
    c.id as company_id, c.name as company_name, c.slug as company_slug,
    c.website as company_website, c.logo_url as company_logo_url,
    c.is_visa_sponsor as company_is_visa_sponsor,
    r.slug as role_slug, r.name as role_name,
    l.city_name, l.city_slug
  from jobs j
  join companies c on c.id = j.company_id
  left join roles r on r.id = j.role_id
  left join locations l on l.id = j.location_id
`;

export async function getJobById(id: number): Promise<JobRow | null> {
  return queryOne<JobRow>(`${JOB_SELECT} where j.id = $1`, [id]);
}

export async function getActiveJobsByCountry(
  countryCode: string,
  limit = 50,
  offset = 0,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where j.country_code = $1 and j.closed_at is null
     order by j.posted_at desc
     limit $2 offset $3`,
    [countryCode, limit, offset],
  );
}

export async function getJobsByRoleAndCity(
  roleSlug: string,
  citySlug: string,
  countryCode: string,
  limit = 50,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where r.slug = $1 and l.city_slug = $2 and j.country_code = $3 and j.closed_at is null
     order by j.posted_at desc
     limit $4`,
    [roleSlug, citySlug, countryCode, limit],
  );
}

export async function getJobsByRole(
  roleSlug: string,
  countryCode: string,
  limit = 50,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where r.slug = $1 and j.country_code = $2 and j.closed_at is null
     order by j.posted_at desc
     limit $3`,
    [roleSlug, countryCode, limit],
  );
}

export async function getJobsByCity(
  citySlug: string,
  countryCode: string,
  limit = 50,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where l.city_slug = $1 and j.country_code = $2 and j.closed_at is null
     order by j.posted_at desc
     limit $3`,
    [citySlug, countryCode, limit],
  );
}

export async function getJobsByCompany(
  companySlug: string,
  limit = 100,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where c.slug = $1 and j.closed_at is null
     order by j.posted_at desc
     limit $2`,
    [companySlug, limit],
  );
}

export async function getCompanyBySlug(slug: string) {
  return queryOne<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    hq_city: string | null;
    hq_country_code: string | null;
    founded_year: number | null;
    employee_count_estimate: number | null;
    linkedin_url: string | null;
    crunchbase_url: string | null;
    is_visa_sponsor: boolean;
  }>(
    `select id, slug, name, description, website, logo_url, hq_city, hq_country_code,
            founded_year, employee_count_estimate, linkedin_url, crunchbase_url, is_visa_sponsor
     from companies where slug = $1 and active = true`,
    [slug],
  );
}

export interface OccupationRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  soc_code: string | null;
  specialisation_notes: string | null;
  is_ie_critical_skills_eligible: boolean;
  ie_salary_threshold_eur: number;
  source_effective_date: Date | null;
}

export async function getAllOccupations(): Promise<OccupationRow[]> {
  return query<OccupationRow>(
    `select id, slug, name, category, soc_code, specialisation_notes,
            is_ie_critical_skills_eligible, ie_salary_threshold_eur, source_effective_date
     from occupations
     where is_ie_critical_skills_eligible = true
     order by category, name`,
  );
}

export async function getOccupationBySlug(slug: string): Promise<OccupationRow | null> {
  return queryOne<OccupationRow>(
    `select id, slug, name, category, soc_code, specialisation_notes,
            is_ie_critical_skills_eligible, ie_salary_threshold_eur, source_effective_date
     from occupations where slug = $1`,
    [slug],
  );
}

export async function getOccupationsByCategory(): Promise<Record<string, OccupationRow[]>> {
  const rows = await getAllOccupations();
  const grouped: Record<string, OccupationRow[]> = {};
  for (const o of rows) {
    if (!grouped[o.category]) grouped[o.category] = [];
    grouped[o.category].push(o);
  }
  return grouped;
}

export async function getJobsByOccupation(
  occupationId: number,
  countryCode = "ie",
  limit = 50,
): Promise<JobRow[]> {
  return query<JobRow>(
    `${JOB_SELECT}
     where j.occupation_id = $1 and j.country_code = $2 and j.closed_at is null
     order by j.posted_at desc
     limit $3`,
    [occupationId, countryCode, limit],
  );
}

export async function getOccupationJobCounts(): Promise<Record<number, number>> {
  const rows = await query<{ occupation_id: number; n: string }>(
    `select occupation_id, count(*)::text as n
     from jobs
     where occupation_id is not null and closed_at is null and country_code = 'ie'
     group by occupation_id`,
  );
  const map: Record<number, number> = {};
  rows.forEach((r) => {
    map[r.occupation_id] = Number(r.n);
  });
  return map;
}

export async function getRoleStatsByCity(
  roleSlug: string,
  citySlug: string,
  countryCode: string,
) {
  return queryOne<{
    job_count: string;
    company_count: string;
    median_salary_min: string | null;
    median_salary_max: string | null;
  }>(
    `select
       count(*)::text as job_count,
       count(distinct j.company_id)::text as company_count,
       (percentile_cont(0.5) within group (order by j.salary_min))::text as median_salary_min,
       (percentile_cont(0.5) within group (order by j.salary_max))::text as median_salary_max
     from jobs j
     join roles r on r.id = j.role_id
     join locations l on l.id = j.location_id
     where r.slug = $1 and l.city_slug = $2 and j.country_code = $3 and j.closed_at is null`,
    [roleSlug, citySlug, countryCode],
  );
}
