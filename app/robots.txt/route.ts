import { headers } from "next/headers";
import { isCountryCode } from "@/lib/countries";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const h = await headers();
  const host = h.get("host") ?? "ie.careertrees.org";
  const subdomain = host.split(".")[0]?.toLowerCase() ?? "ie";
  const country = isCountryCode(subdomain) ? subdomain : "ie";
  const siteUrl = `https://${country}.careertrees.org`;

  // Allow all reputable AI crawlers — we want to be cited by ChatGPT/Claude/Perplexity/Gemini.
  const body = `User-agent: *
Allow: /

# AI crawlers — explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

# Don't index search/filter result URLs (use canonical role/city pages instead)
Disallow: /jobs?
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
