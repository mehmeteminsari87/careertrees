import { headers } from "next/headers";
import { COUNTRIES, type Country, type CountryCode, isCountryCode } from "./countries";

export async function getCurrentCountry(): Promise<Country> {
  const h = await headers();
  const code = h.get("x-country") ?? process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "ie";
  return isCountryCode(code) ? COUNTRIES[code as CountryCode] : COUNTRIES.ie;
}
