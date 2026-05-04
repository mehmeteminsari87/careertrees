import type { Metadata } from "next";
import { getCurrentCountry } from "@/lib/country-context";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const country = await getCurrentCountry();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://careertrees.org";
  const subdomainUrl = `https://${country.code}.careertrees.org`;

  return {
    metadataBase: new URL(subdomainUrl),
    title: {
      default: `Jobs in ${country.name} | CareerTrees`,
      template: `%s | CareerTrees ${country.name}`,
    },
    description: `Verified, active job listings in ${country.name}. Visa sponsorship, salary data, and career paths in one place.`,
    alternates: {
      languages: {
        "en-IE": `${siteUrl.replace("https://", "https://ie.")}`,
        "nl-NL": `${siteUrl.replace("https://", "https://nl.")}`,
        "x-default": siteUrl,
      },
    },
    openGraph: {
      type: "website",
      siteName: "CareerTrees",
      locale: country.locale,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const country = await getCurrentCountry();
  return (
    <html lang={country.primaryLanguage}>
      <body>{children}</body>
    </html>
  );
}
