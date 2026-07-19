import { NextResponse, type NextRequest } from "next/server";

// Persona front doors: point any of these domains at this app and "/"
// serves the matching persona landing. One config row per brand — no code.
// NOTE: buyeraipro.com is intentionally absent — it runs the standalone
// BuyerAiPro scan engine on its own Vercel project.
const HOST_TO_PERSONA: Record<string, string> = {
  "julybuyer.com": "/buy",
  "buy.july.ca": "/buy",
  "julyowner.com": "/own",
  "owneraipro.com": "/own",
  "julyseller.com": "/sell",
  "selleraipro.com": "/sell",
  "julyinvestor.com": "/invest",
  "investaipro.com": "/invest",
  "investoraipro.com": "/invest",
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/^www\./, "").split(":")[0];
  const dest = HOST_TO_PERSONA[host];
  if (!dest) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.rewrite(url);
  }
  // Buyer domains: /claim is always the buyer signup (no address step) unless
  // the link already carries an explicit persona or a professional role.
  if (dest === "/buy" && pathname === "/claim") {
    const p = req.nextUrl.searchParams;
    if (!p.has("persona") && p.get("role") !== "professional") {
      const url = req.nextUrl.clone();
      url.searchParams.set("persona", "buyer");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/claim"] };
