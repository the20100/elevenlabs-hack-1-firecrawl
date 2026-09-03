import { NextRequest } from "next/server";

const MAX_QUERY_LENGTH = 200;
const WINDOW_MS = 60_000;
const PER_IP_LIMIT = 10;
const GLOBAL_LIMIT = 40;
const DAILY_LIMIT = 500;

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

  const res = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      limit: 8,
      scrapeOptions: { formats: ["markdown"] },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Firecrawl search error:", res.status, errorText);
    return Response.json(
      { error: "Firecrawl search failed", details: errorText },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Extract the most useful parts for the AI
  const results = (data.data || []).map(
    (item: { title?: string; url?: string; markdown?: string }) => ({
      title: item.title || "",
      url: item.url || "",
      snippet:
        (item.markdown || "").slice(0, 800) +
        ((item.markdown || "").length > 800 ? "..." : ""),
    })
  );

  return Response.json({ results });
}
