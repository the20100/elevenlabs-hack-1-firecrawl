import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  if (!query || typeof query !== "string") {
    return Response.json({ error: "Missing query parameter" }, { status: 400 });
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
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
      limit: 5,
      scrapeOptions: { formats: ["markdown"] },
    }),
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
        (item.markdown || "").slice(0, 500) +
        ((item.markdown || "").length > 500 ? "..." : ""),
    })
  );

  return Response.json({ results });
}
