-- CareerTrees database schema
-- Run this on a fresh Supabase Postgres database (SQL Editor → New Query → paste → Run)
-- Designed for: multi-country job aggregator with ATS-sourced listings

create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- =========================================================================
-- countries (seeded constants — kept in DB for FK + reporting joins)
-- =========================================================================
create table if not exists countries (
  code char(2) primary key,
  name text not null,
  currency char(3) not null default 'EUR',
  primary_language char(2) not null,
  status text not null default 'planned' check (status in ('live', 'planned', 'paused'))
);

insert into countries (code, name, primary_language, status) values
  ('ie', 'Ireland', 'en', 'live'),
  ('nl', 'Netherlands', 'nl', 'planned'),
  ('pt', 'Portugal', 'pt', 'planned'),
  ('it', 'Italy', 'it', 'planned'),
  ('de', 'Germany', 'de', 'planned')
on conflict (code) do nothing;

-- =========================================================================
-- ats_sources (which ATS platforms we pull from)
-- =========================================================================
create table if not exists ats_sources (
  id serial primary key,
  slug text not null unique,
  name text not null,
  api_kind text not null check (api_kind in ('greenhouse', 'lever', 'workday', 'smartrecruiters', 'ashby', 'personio', 'recruitee', 'teamtailor', 'pinpoint', 'occupop', 'manual'))
);

insert into ats_sources (slug, name, api_kind) values
  ('greenhouse', 'Greenhouse', 'greenhouse'),
  ('lever', 'Lever', 'lever'),
  ('workday', 'Workday', 'workday'),
  ('smartrecruiters', 'SmartRecruiters', 'smartrecruiters'),
  ('ashby', 'Ashby', 'ashby'),
  ('personio', 'Personio', 'personio'),
  ('recruitee', 'Recruitee', 'recruitee'),
  ('teamtailor', 'Teamtailor', 'teamtailor'),
  ('pinpoint', 'Pinpoint', 'pinpoint'),
  ('occupop', 'Occupop', 'occupop')
on conflict (slug) do nothing;

-- =========================================================================
-- companies
-- =========================================================================
create table if not exists companies (
  id serial primary key,
  slug text not null unique,
  name text not null,
  legal_name text,
  website text,
  description text,
  logo_url text,
  hq_country_code char(2) references countries(code),
  hq_city text,
  founded_year int,
  employee_count_estimate int,
  linkedin_url text,
  crunchbase_url text,
  github_org text,

  -- ATS connection (where we pull jobs from)
  ats_source_id int references ats_sources(id),
  ats_company_token text,
  ats_company_url text,

  -- Sponsorship signal (manually populated from DETE Trusted Partner list etc.)
  is_visa_sponsor boolean default false,
  visa_sponsor_source text,
  visa_sponsor_verified_at timestamptz,

  -- Health signals (Faz 2)
  last_funding_round text,
  last_funding_date date,
  last_funding_amount_usd bigint,
  layoff_event_count int default 0,
  last_layoff_date date,

  -- Internal
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ats_source_id, ats_company_token)
);

create index if not exists companies_country_idx on companies(hq_country_code);
create index if not exists companies_visa_sponsor_idx on companies(is_visa_sponsor) where is_visa_sponsor = true;
create index if not exists companies_active_idx on companies(active) where active = true;
create index if not exists companies_name_trgm_idx on companies using gin (name gin_trgm_ops);

-- =========================================================================
-- locations (cities — normalized so we can FK from jobs)
-- =========================================================================
create table if not exists locations (
  id serial primary key,
  country_code char(2) not null references countries(code),
  city_slug text not null,
  city_name text not null,
  region text,
  lat numeric(9, 6),
  lon numeric(9, 6),
  population int,
  unique (country_code, city_slug)
);

create index if not exists locations_country_idx on locations(country_code);

-- Seed major Irish cities
insert into locations (country_code, city_slug, city_name, region, lat, lon, population) values
  ('ie', 'dublin', 'Dublin', 'Leinster', 53.349805, -6.260310, 1450000),
  ('ie', 'cork', 'Cork', 'Munster', 51.898514, -8.475603, 220000),
  ('ie', 'galway', 'Galway', 'Connacht', 53.270668, -9.056791, 85000),
  ('ie', 'limerick', 'Limerick', 'Munster', 52.668018, -8.630498, 95000),
  ('ie', 'waterford', 'Waterford', 'Munster', 52.259319, -7.110070, 60000)
on conflict (country_code, city_slug) do nothing;

-- =========================================================================
-- roles (canonical role taxonomy — for grouping job titles)
-- =========================================================================
create table if not exists roles (
  id serial primary key,
  slug text not null unique,
  name text not null,
  category text not null,
  synonyms text[] not null default '{}',
  description text
);

-- Seed core tech roles
insert into roles (slug, name, category, synonyms) values
  ('software-engineer', 'Software Engineer', 'engineering', array['developer','programmer','swe','software developer']),
  ('frontend-engineer', 'Frontend Engineer', 'engineering', array['front-end developer','ui engineer','frontend developer']),
  ('backend-engineer', 'Backend Engineer', 'engineering', array['backend developer','server engineer']),
  ('full-stack-engineer', 'Full Stack Engineer', 'engineering', array['fullstack developer','full-stack developer']),
  ('data-engineer', 'Data Engineer', 'data', array['data infra engineer','etl engineer']),
  ('data-scientist', 'Data Scientist', 'data', array['ml scientist','research scientist']),
  ('machine-learning-engineer', 'Machine Learning Engineer', 'data', array['ml engineer','ai engineer']),
  ('devops-engineer', 'DevOps Engineer', 'engineering', array['platform engineer','sre','site reliability engineer']),
  ('product-manager', 'Product Manager', 'product', array['pm','technical product manager','tpm']),
  ('designer', 'Designer', 'design', array['ux designer','ui designer','product designer'])
on conflict (slug) do nothing;

-- Map roles to DETE occupations (1:1 — each role lands on its closest Critical Skills occupation)
alter table roles add column if not exists occupation_slug text;

update roles set occupation_slug = 'programmers-software-developers' where slug = 'software-engineer';
update roles set occupation_slug = 'web-design-development' where slug = 'frontend-engineer';
update roles set occupation_slug = 'programmers-software-developers' where slug = 'backend-engineer';
update roles set occupation_slug = 'programmers-software-developers' where slug = 'full-stack-engineer';
update roles set occupation_slug = 'all-other-ict-professionals' where slug = 'data-engineer';
update roles set occupation_slug = 'management-consultants-business-analysts' where slug = 'data-scientist';
update roles set occupation_slug = 'all-other-ict-professionals' where slug = 'machine-learning-engineer';
update roles set occupation_slug = 'all-other-ict-professionals' where slug = 'devops-engineer';
update roles set occupation_slug = 'it-project-programme-managers' where slug = 'product-manager';
update roles set occupation_slug = 'web-design-development' where slug = 'designer';

-- =========================================================================
-- jobs (the core table)
-- =========================================================================
create table if not exists jobs (
  id bigserial primary key,
  external_id text not null,                          -- ATS-provided ID
  ats_source_id int not null references ats_sources(id),
  company_id int not null references companies(id) on delete cascade,

  title text not null,
  title_normalized text generated always as (lower(title)) stored,
  role_id int references roles(id),
  description_html text,
  description_text text,

  -- Location
  location_id int references locations(id),
  location_text text,                                 -- raw location string from ATS
  is_remote boolean default false,
  remote_policy text check (remote_policy in ('remote', 'hybrid', 'onsite', null)),
  country_code char(2) references countries(code),

  -- Compensation
  salary_min numeric(10, 2),
  salary_max numeric(10, 2),
  salary_currency char(3),
  salary_period text check (salary_period in ('year', 'month', 'day', 'hour', null)),

  -- Employment
  employment_type text check (employment_type in ('full_time', 'part_time', 'contract', 'temporary', 'internship', null)),
  experience_level text check (experience_level in ('entry', 'mid', 'senior', 'lead', 'executive', null)),
  department text,

  -- Tags (extracted via structured AI extraction from description, not prose)
  tech_stack text[] not null default '{}',
  benefits text[] not null default '{}',
  perks text[] not null default '{}',                 -- e.g., '4-day-week', 'no-on-call', 'no-leetcode'

  -- Sponsorship
  visa_sponsorship_offered boolean,                   -- true/false/null (null = unknown)
  english_language_role boolean,                      -- for non-EN countries

  -- Apply
  apply_url text not null,                            -- direct link to company ATS

  -- Metadata
  posted_at timestamptz not null,
  valid_through timestamptz,                          -- soft expiry; if null, default to posted_at + 60 days
  closed_at timestamptz,                              -- set when ATS no longer returns this job
  raw_payload jsonb,                                  -- original ATS response for debugging
  scrape_run_id text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  unique (ats_source_id, external_id)
);

create index if not exists jobs_company_idx on jobs(company_id);
create index if not exists jobs_role_idx on jobs(role_id);
create index if not exists jobs_location_idx on jobs(location_id);
create index if not exists jobs_country_idx on jobs(country_code);
create index if not exists jobs_active_idx on jobs(closed_at) where closed_at is null;
create index if not exists jobs_posted_idx on jobs(posted_at desc);
create index if not exists jobs_visa_idx on jobs(visa_sponsorship_offered) where visa_sponsorship_offered = true;
create index if not exists jobs_remote_idx on jobs(is_remote) where is_remote = true;
create index if not exists jobs_title_trgm_idx on jobs using gin (title_normalized gin_trgm_ops);
create index if not exists jobs_tech_stack_idx on jobs using gin (tech_stack);
create index if not exists jobs_perks_idx on jobs using gin (perks);

-- =========================================================================
-- scrape_runs (audit log of every scraper invocation)
-- =========================================================================
create table if not exists scrape_runs (
  id bigserial primary key,
  ats_source_id int references ats_sources(id),
  company_id int references companies(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  jobs_seen int default 0,
  jobs_inserted int default 0,
  jobs_updated int default 0,
  jobs_closed int default 0,
  error_message text
);

create index if not exists scrape_runs_started_idx on scrape_runs(started_at desc);

-- =========================================================================
-- updated_at trigger
-- =========================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists companies_updated_at on companies;
create trigger companies_updated_at before update on companies
  for each row execute function set_updated_at();

-- =========================================================================
-- occupations (DETE Critical Skills Occupations List — IE)
-- Source: enterprise.gov.ie SI 444 of 2024, effective 2024-09-02
-- IE Critical Skills Permit minimum salary threshold: €40,904 (March 2026)
-- =========================================================================
create table if not exists occupations (
  id serial primary key,
  slug text not null unique,
  name text not null,
  category text not null,
  soc_code char(4),
  specialisation_notes text,
  is_ie_critical_skills_eligible boolean not null default true,
  ie_salary_threshold_eur int not null default 40904,
  source_url text,
  source_effective_date date,
  created_at timestamptz not null default now()
);

create index if not exists occupations_soc_idx on occupations(soc_code);
create index if not exists occupations_category_idx on occupations(category);
create index if not exists occupations_eligible_idx on occupations(is_ie_critical_skills_eligible) where is_ie_critical_skills_eligible = true;

-- Add FK from jobs to occupations (for cross-join queries)
alter table jobs add column if not exists occupation_id int references occupations(id);
create index if not exists jobs_occupation_idx on jobs(occupation_id);

-- Seed Critical Skills occupations (DETE list, 2024-09-02 effective)
-- Source: https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/employment-permit-eligibility/highly-skilled-eligible-occupations-list/
insert into occupations (slug, name, category, soc_code, specialisation_notes, source_effective_date) values
  ('site-manager', 'Site Manager', 'Production Managers and Directors', '1122', null, '2024-09-02'),
  ('it-telecom-directors', 'Information Technology and Telecommunications Directors', 'ICT Professionals', '1136', null, '2024-09-02'),
  ('senior-health-managers', 'Senior Health Services and Public Health Managers', 'Health and Social Services Managers', '1181', null, '2024-09-02'),
  ('professional-forester', 'Professional Forester', 'Agriculture Related Services', '1213', null, '2024-09-02'),
  ('resource-modelling-analyst', 'Resource Modelling, Earth Observation and Data Analyst', 'Agriculture Related Services', '1213', null, '2024-09-02'),
  ('chemical-scientists', 'Chemical Scientists', 'Natural and Social Science Professionals', '2111', 'Manufacturing, product/analytical development, biotechnology', '2024-09-02'),
  ('medical-laboratory-scientists', 'Medical Laboratory Scientists', 'Natural and Social Science Professionals', '2112', null, '2024-09-02'),
  ('biological-scientists-biochemists', 'Biological Scientists and Biochemists', 'Natural and Social Science Professionals', '2112', 'Manufacturing, product development, biotechnology focus', '2024-09-02'),
  ('physical-scientists', 'Physical Scientists', 'Natural and Social Science Professionals', '2113', 'Manufacturing, product development focus', '2024-09-02'),
  ('meteorologist', 'Meteorologist', 'Natural and Social Science Professionals', '2113', null, '2024-09-02'),
  ('operational-forecaster', 'Operational Forecaster', 'Natural and Social Science Professionals', '2113', null, '2024-09-02'),
  ('civil-engineers', 'Civil Engineers', 'Engineering Professionals', '2121', null, '2024-09-02'),
  ('structural-site-engineers', 'Structural Engineers and Site Engineers', 'Engineering Professionals', '2121', null, '2024-09-02'),
  ('mechanical-engineers', 'Mechanical Engineers', 'Engineering Professionals', '2122', null, '2024-09-02'),
  ('electrical-engineers', 'Electrical Engineers', 'Engineering Professionals', '2123', null, '2024-09-02'),
  ('electronics-engineers', 'Electronics Engineers', 'Engineering Professionals', '2124', 'Chip design, test/application engineering, process automation, power generation', '2024-09-02'),
  ('design-development-engineers', 'Design and Development Engineers', 'Engineering Professionals', '2126', 'Quality control, validation/regulation engineering, chip design, process automation', '2024-09-02'),
  ('production-process-engineers', 'Production and Process Engineers', 'Engineering Professionals', '2127', 'Quality control, validation/regulation, chemical process, automation, power generation', '2024-09-02'),
  ('chemical-engineer', 'Chemical Engineer', 'Engineering Professionals', '2129', null, '2024-09-02'),
  ('material-scientists', 'Material Scientists', 'Engineering Professionals', '2129', null, '2024-09-02'),
  ('setting-out-engineer', 'Setting Out Engineer', 'Engineering Professionals', '2129', null, '2024-09-02'),
  ('facade-designer', 'Façade Designer', 'Engineering Professionals', '2129', null, '2024-09-02'),
  ('project-engineer', 'Project Engineer', 'Engineering Professionals', '2129', null, '2024-09-02'),
  ('it-specialist-managers', 'IT Specialist Managers', 'ICT Professionals', '2133', null, '2024-09-02'),
  ('bim-manager', 'BIM Manager', 'ICT Professionals', '2133', null, '2024-09-02'),
  ('it-project-programme-managers', 'IT Project and Programme Managers', 'ICT Professionals', '2134', null, '2024-09-02'),
  ('it-business-analysts-architects', 'IT Business Analysts, Architects and Systems Designers', 'ICT Professionals', '2135', null, '2024-09-02'),
  ('programmers-software-developers', 'Programmers and Software Development Professionals', 'ICT Professionals', '2136', null, '2024-09-02'),
  ('web-design-development', 'Web Design and Development Professionals', 'ICT Professionals', '2137', null, '2024-09-02'),
  ('all-other-ict-professionals', 'All Other ICT Professionals', 'ICT Professionals', '2139', 'Not elsewhere classified', '2024-09-02'),
  ('medical-practitioners', 'Medical Practitioners', 'Health Professionals', '2211', null, '2024-09-02'),
  ('psychologist', 'Psychologist', 'Health Professionals', '2212', null, '2024-09-02'),
  ('industrial-pharmacists', 'Industrial Pharmacists/Pharmacist', 'Health Professionals', '2213', null, '2024-09-02'),
  ('radiographers', 'Radiographers', 'Health Professionals', '2217', null, '2024-09-02'),
  ('radiation-therapists', 'Radiation Therapists', 'Health Professionals', '2217', null, '2024-09-02'),
  ('vascular-technologists', 'Vascular Technologists/Physiologists', 'Health Professionals', '2217', null, '2024-09-02'),
  ('gastro-intestinal-technologists', 'Gastro Intestinal Technologists/Physiologists', 'Health Professionals', '2217', null, '2024-09-02'),
  ('podiatrist-chiropodist', 'Podiatrist/Chiropodist', 'Health Professionals', '2218', null, '2024-09-02'),
  ('audiologists', 'Audiologists', 'Health Professionals', '2219', null, '2024-09-02'),
  ('perfusionists', 'Perfusionists', 'Health Professionals', '2219', null, '2024-09-02'),
  ('dietician', 'Dietician', 'Health Professionals', '2219', null, '2024-09-02'),
  ('cardiac-physiologist', 'Cardiac Physiologist', 'Health Professionals', '2219', null, '2024-09-02'),
  ('medical-scientist', 'Medical Scientist', 'Health Professionals', '2219', null, '2024-09-02'),
  ('physiotherapist', 'Physiotherapist', 'Therapy Professionals', '2221', null, '2024-09-02'),
  ('occupational-therapist', 'Occupational Therapist', 'Therapy Professionals', '2222', null, '2024-09-02'),
  ('speech-language-therapist', 'Speech and Language Therapist', 'Therapy Professionals', '2223', null, '2024-09-02'),
  ('orthoptists', 'Orthoptists', 'Therapy Professionals', '2229', null, '2024-09-02'),
  ('registered-nurses', 'Registered Nurses', 'Nursing and Midwifery Professionals', '2231', null, '2024-09-02'),
  ('registered-midwives', 'Registered Midwives', 'Nursing and Midwifery Professionals', '2232', null, '2024-09-02'),
  ('academics', 'Academics', 'Teaching and Educational Professionals', '2311', 'Level 10 NFQ qualification, minimum 1 year teaching experience, third-level institution or ICT programme (QQI L8/L9)', '2024-09-02'),
  ('chartered-certified-accountants', 'Chartered and Certified Accountants', 'Business, Research and Administrative Professionals', '2421', 'Tax/compliance/regulation/financial management specialisation', '2024-09-02'),
  ('qualified-accountants-aicpa', 'Qualified Accountants (AICPA/PICPA/ICAP)', 'Business, Research and Administrative Professionals', '2421', 'Minimum 3 years audit experience, US GAAP/Global Audit Services focus', '2024-09-02'),
  ('tax-consultant', 'Tax Consultant', 'Business, Research and Administrative Professionals', '2421', 'Non-EEA tax specialisation, professional qualification, minimum 3 years experience', '2024-09-02'),
  ('management-consultants-business-analysts', 'Management Consultants and Business Analysts', 'Business, Research and Administrative Professionals', '2423', 'Big data analytics, IT, data mining, advanced maths', '2024-09-02'),
  ('business-financial-project-managers', 'Business and Financial Project Management Professionals', 'Business, Research and Administrative Professionals', '2424', 'Finance/investment analytics, risk analytics, fraud analytics', '2024-09-02'),
  ('actuaries-economists-statisticians', 'Actuaries, Economists and Statisticians', 'Business, Research and Administrative Professionals', '2425', 'Big data analytics, IT, data mining, advanced maths', '2024-09-02'),
  ('architect', 'Architect', 'Architects, Town Planners and Surveyors', '2431', null, '2024-09-02'),
  ('town-planning-officer', 'Town Planning Officer', 'Architects, Town Planners and Surveyors', '2432', null, '2024-09-02'),
  ('quantity-surveyors', 'Quantity Surveyors', 'Architects, Town Planners and Surveyors', '2433', null, '2024-09-02'),
  ('architectural-technologist', 'Architectural Technologist', 'Architects, Town Planners and Surveyors', '2435', null, '2024-09-02'),
  ('construction-project-managers', 'Construction Project Managers', 'Architects, Town Planners and Surveyors', '2436', null, '2024-09-02'),
  ('commercial-manager', 'Commercial Manager', 'Architects, Town Planners and Surveyors', '2436', null, '2024-09-02'),
  ('social-worker', 'Social Worker', 'Welfare Professionals', '2442', null, '2024-09-02'),
  ('quality-control-planning-engineers', 'Quality Control and Planning Engineers', 'Quality and Regulatory Professionals', '2461', null, '2024-09-02'),
  ('quality-assurance-regulatory', 'Quality Assurance and Regulatory Professionals', 'Quality and Regulatory Professionals', '2462', null, '2024-09-02'),
  ('environmental-health', 'Environmental Health Professionals', 'Quality and Regulatory Professionals', '2463', null, '2024-09-02'),
  ('art-director-animation', 'Art Director in 2D or 3D Animation', 'Media Professionals', '2473', 'Minimum 1 year experience', '2024-09-02'),
  ('bim-coordinator', 'BIM Coordinator/Technician', 'Draughtspersons and Related Architectural Technicians', '3122', null, '2024-09-02'),
  ('phecc-paramedics', 'PHECC Registered Paramedics', 'Health Associate Professionals', '3213', null, '2024-09-02'),
  ('phecc-advanced-paramedics', 'PHECC Registered Advanced Paramedic Practitioners', 'Health Associate Professionals', '3213', null, '2024-09-02'),
  ('prosthetists', 'Prosthetists', 'Health Associate Professionals', '3218', null, '2024-09-02'),
  ('orthotists', 'Orthotists', 'Health Associate Professionals', '3218', null, '2024-09-02'),
  ('respiratory-physiologist', 'Respiratory Physiologist', 'Health Associate Professionals', '3218', null, '2024-09-02'),
  ('animation-background-design', 'Animation Background and Design Artist', 'Artistic, Literary and Media Occupations', '3411', '2D or 3D, minimum 1 year experience', '2024-09-02'),
  ('location-designer-animation', 'Location Designer in 2D or 3D Animation', 'Design Occupations', '3421', 'Minimum 1 year experience', '2024-09-02'),
  ('character-designer-animation', 'Character Designer in 2D or 3D Animation', 'Design Occupations', '3421', 'Minimum 1 year experience', '2024-09-02'),
  ('prop-designer-animation', 'Prop Designer in 2D or 3D Animation', 'Design Occupations', '3421', 'Minimum 1 year experience', '2024-09-02'),
  ('animation-layout-artist', 'Animation Layout Artist in 2D or 3D Animation', 'Design Occupations', '3421', 'Minimum 1 year experience', '2024-09-02'),
  ('high-performance-coaches', 'High Performance Coaches and Directors', 'Sports and Fitness Occupations', '3442', 'National or high-profile international sports organisations', '2024-09-02'),
  ('estimator', 'Estimator', 'Business, Finance and Related Associate Professionals', '3531', null, '2024-09-02'),
  ('business-sales-executives', 'Business Sales Executives', 'Sales, Marketing and Related Associate Professionals', '3542', 'International sales or IT B2B focus, fluency in non-English EEA language', '2024-09-02'),
  ('international-marketing-experts', 'International Marketing Experts', 'Sales, Marketing and Related Associate Professionals', '3543', 'Product strategy, pharmaceutical/medical devices/SaaS/B2B specialisation', '2024-09-02')
on conflict (slug) do nothing;
