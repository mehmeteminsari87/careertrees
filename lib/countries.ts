export type CountryCode = "ie" | "nl" | "pt" | "it" | "de";

export interface Country {
  code: CountryCode;
  name: string;
  nativeName: string;
  locale: string;
  currency: "EUR";
  primaryLanguage: string;
  capital: string;
  status: "live" | "planned";
}

export const COUNTRIES: Record<CountryCode, Country> = {
  ie: {
    code: "ie",
    name: "Ireland",
    nativeName: "Ireland",
    locale: "en-IE",
    currency: "EUR",
    primaryLanguage: "en",
    capital: "Dublin",
    status: "live",
  },
  nl: {
    code: "nl",
    name: "Netherlands",
    nativeName: "Nederland",
    locale: "nl-NL",
    currency: "EUR",
    primaryLanguage: "nl",
    capital: "Amsterdam",
    status: "planned",
  },
  pt: {
    code: "pt",
    name: "Portugal",
    nativeName: "Portugal",
    locale: "pt-PT",
    currency: "EUR",
    primaryLanguage: "pt",
    capital: "Lisbon",
    status: "planned",
  },
  it: {
    code: "it",
    name: "Italy",
    nativeName: "Italia",
    locale: "it-IT",
    currency: "EUR",
    primaryLanguage: "it",
    capital: "Rome",
    status: "planned",
  },
  de: {
    code: "de",
    name: "Germany",
    nativeName: "Deutschland",
    locale: "de-DE",
    currency: "EUR",
    primaryLanguage: "de",
    capital: "Berlin",
    status: "planned",
  },
};

export const LIVE_COUNTRIES: Country[] = Object.values(COUNTRIES).filter(
  (c) => c.status === "live",
);

export function isCountryCode(value: string): value is CountryCode {
  return value in COUNTRIES;
}

export function getCountry(code: string): Country | null {
  return isCountryCode(code) ? COUNTRIES[code] : null;
}
