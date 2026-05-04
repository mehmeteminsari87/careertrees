export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function jobUrl(id: number, title: string): string {
  return `/job/${id}/${slugify(title)}`;
}

export function companyUrl(slug: string): string {
  return `/companies/${slug}`;
}

export function roleUrl(roleSlug: string): string {
  return `/jobs/${roleSlug}`;
}

export function roleInCityUrl(roleSlug: string, citySlug: string): string {
  return `/jobs/${roleSlug}/in/${citySlug}`;
}

export function cityUrl(citySlug: string): string {
  return `/jobs/in/${citySlug}`;
}
