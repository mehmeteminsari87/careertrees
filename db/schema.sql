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
