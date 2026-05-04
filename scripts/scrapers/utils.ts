export function htmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function detectCountry(locationText: string | null): string | null {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();
  if (/\b(ireland|dublin|cork|galway|limerick|waterford)\b/.test(lower)) return "ie";
  if (/\b(netherlands|holland|amsterdam|rotterdam|utrecht|the hague|eindhoven)\b/.test(lower)) return "nl";
  if (/\b(portugal|lisbon|porto|braga)\b/.test(lower)) return "pt";
  if (/\b(italy|italia|rome|roma|milan|milano|turin|torino|bologna|naples|napoli|florence|firenze)\b/.test(lower)) return "it";
  if (/\b(germany|deutschland|berlin|munich|munchen|hamburg|frankfurt|cologne|koln|stuttgart)\b/.test(lower)) return "de";
  return null;
}

export function detectCity(locationText: string | null, countryCode: string | null): string | null {
  if (!locationText || !countryCode) return null;
  const lower = locationText.toLowerCase();
  const cityMap: Record<string, string[]> = {
    ie: ["dublin", "cork", "galway", "limerick", "waterford"],
    nl: ["amsterdam", "rotterdam", "utrecht", "the hague", "eindhoven"],
    pt: ["lisbon", "porto", "braga"],
    it: ["rome", "milan", "turin", "bologna", "naples", "florence"],
    de: ["berlin", "munich", "hamburg", "frankfurt", "cologne", "stuttgart"],
  };
  const cities = cityMap[countryCode] ?? [];
  for (const city of cities) {
    if (lower.includes(city)) return city.replace(" ", "-");
  }
  return null;
}

export function detectRemote(locationText: string | null, title: string, description: string): {
  isRemote: boolean;
  policy: "remote" | "hybrid" | "onsite" | null;
} {
  const haystack = `${locationText ?? ""} ${title} ${description.slice(0, 500)}`.toLowerCase();
  if (/\b(fully remote|100% remote|remote only|work from anywhere)\b/.test(haystack)) {
    return { isRemote: true, policy: "remote" };
  }
  if (/\b(hybrid|flexible work|partially remote|2 days? in office|3 days? in office)\b/.test(haystack)) {
    return { isRemote: false, policy: "hybrid" };
  }
  if (/\bremote\b/.test(haystack)) {
    return { isRemote: true, policy: "remote" };
  }
  if (/\b(on-?site|in office|in-office)\b/.test(haystack)) {
    return { isRemote: false, policy: "onsite" };
  }
  return { isRemote: false, policy: null };
}

export function safeFetch(url: string, init?: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...init,
    signal: controller.signal,
    headers: {
      "User-Agent": "CareerTrees/0.1 (+https://careertrees.org/about)",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  }).finally(() => clearTimeout(timeout));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
