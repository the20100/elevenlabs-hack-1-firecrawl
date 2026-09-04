import { NextRequest } from "next/server";

const MAX_QUERY_LENGTH = 200;
const WINDOW_MS = 60_000;
const PER_IP_LIMIT = 10;
const GLOBAL_LIMIT = 40;
const DAILY_LIMIT = 500;

type FirecrawlItem = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

// Per-instance counters. Serverless instances are not shared, so this is a
// burn-rate ceiling rather than an exact quota -- but a sustained drain keeps
// one instance warm, which is exactly when the ceiling needs to hold.
const hits = new Map<string, number[]>();
let dailyBucket = -1;
let dailyCount = 0;

function isSameOrigin(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;

  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function takeSlot(now: number, ip: string) {
  if (hits.size > 1000) {
    for (const [key, window] of hits) {
      if (window.length === 0) hits.delete(key);
    }
  }

  const prune = (key: string) => {
    const window = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    hits.set(key, window);
    return window;
  };

  const perIp = prune(`ip:${ip}`);
  const global = prune("global");
  if (perIp.length >= PER_IP_LIMIT || global.length >= GLOBAL_LIMIT) {
    return false;
  }

  perIp.push(now);
  global.push(now);
  return true;
}

function takeDailySlot(now: number) {
  const day = Math.floor(now / 86_400_000);
  if (day !== dailyBucket) {
    dailyBucket = day;
    dailyCount = 0;
  }
  if (dailyCount >= DAILY_LIMIT) return false;
  dailyCount += 1;
  return true;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as { query?: unknown } | null)?.query;
  if (typeof raw !== "string") {
    return Response.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const query = raw.trim();
  if (!query) {
    return Response.json({ error: "Missing query parameter" }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      { error: `Query must be ${MAX_QUERY_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const now = Date.now();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  if (!takeSlot(now, ip)) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (!takeDailySlot(now)) {
    console.warn("firecrawl-search: daily cap reached, refusing paid calls");
    return Response.json(
      { error: "Search is temporarily unavailable" },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Trimmed for the same reason as the agent ID in src/app/debate/page.tsx: the
  // Vercel Production value carries a trailing newline. Fetch's header-value
  // normalization currently strips it, so this works today — but a whitespace
  // difference in a bearer token is not something to leave to a spec detail.
  // Trimming at the read site also makes a whitespace-only value fall into the
  // `!apiKey` branch below rather than sending an empty bearer token.
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Firecrawl API key not configured" },
      { status: 500 }
    );
  }

  // The upstream call is the only part of this handler that can reject: the
  // timeout below aborts it, and an upstream that stalls will hit it.
  // Uncaught, that abort escapes as
  // an unhandledRejection and the route answers with an empty 500 instead of
  // JSON, on an ordinary search with no attacker involved. That is the reason
  // this catch exists. Secondary: on a serverless instance an unhandled rejection
  // can take the instance down, and the counters above live in that instance, so
  // they reset with it. They are a burn-rate limiter, not the spend ceiling --
  // the ceiling is the non-renewing credit balance -- but a limiter that a slow
  // upstream can zero is not doing the one job it has.
  let res: Response;
  try {
    res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // No `scrapeOptions`. This is a *blocking client tool* inside a live voice
      // debate -- the agent cannot speak until it resolves -- so latency is the
      // binding constraint, not depth. Asking Firecrawl to scrape all 8 result
      // pages to markdown measured 21.1s in production; search-only measures
      // 1.3s for the same query. 21s of dead air mid-round is a worse failure
      // than a thinner snippet, and the snippet is not actually thinner: see the
      // `description` note below.
      //
      // Cost falls with it. Firecrawl bills search at 2 credits/10 results and
      // scraping at 1 credit *per page* on top, so this drops 10 credits per
      // search to 2 -- which also shrinks the paid-call exposure behind the
      // ELE-29 guard by 5x.
      body: JSON.stringify({ query, limit: 8 }),
      // 15s, down from 30s. Measured search-only latency is 1.3s, so this is
      // ~11x headroom, while a round is only 120s. Past ~15s the conversation is
      // already dead; failing fast lets the agent say it found nothing and keep
      // talking, which beats stalling for the rest of the round.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.error("Firecrawl search unreachable:", err);
    return Response.json(
      { error: timedOut ? "Search timed out" : "Search is unavailable" },
      { status: timedOut ? 504 : 502 }
    );
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Firecrawl search error:", res.status, errorText);
    return Response.json(
      { error: "Firecrawl search failed", details: errorText },
      { status: res.status }
    );
  }

  let data: { data?: FirecrawlItem[] };
  try {
    data = await res.json();
  } catch (err) {
    console.error("Firecrawl search returned non-JSON:", err);
    return Response.json({ error: "Search is unavailable" }, { status: 502 });
  }

  // Extract the most useful parts for the AI.
  //
  // `description` is the search engine's query-matched snippet, so it tends to
  // carry the claim the agent actually asked about -- measured examples: "Its
  // death rate since 1965 is 1.3 deaths per TWh". The previous
  // `markdown.slice(0, 800)` took the first 800 characters of the *scraped
  // page*, which is nav, cookie banners and headers far more often than it is
  // the relevant passage. So dropping the scrape costs less grounding than it
  // looks like -- it usually gains some.
  //
  // `markdown` stays as a fallback purely so that re-enabling `scrapeOptions`
  // later cannot silently produce empty snippets.
  const results = (data.data || []).map((item: FirecrawlItem) => {
    const text = (item.description || item.markdown || "").trim();
    return {
      title: item.title || "",
      url: item.url || "",
      snippet: text.slice(0, 800) + (text.length > 800 ? "..." : ""),
    };
  });

  return Response.json({ results });
}
