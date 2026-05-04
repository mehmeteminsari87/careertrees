import { NextResponse, type NextRequest } from "next/server";
import { isCountryCode } from "@/lib/countries";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)"],
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(".")[0]?.toLowerCase() ?? "";

  const country = isCountryCode(subdomain)
    ? subdomain
    : process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "ie";

  const response = NextResponse.next();
  response.headers.set("x-country", country);
  return response;
}
