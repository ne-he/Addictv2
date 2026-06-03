// app/api/predict/route.js — server-side proxy to the FastAPI backend.
//
// The browser calls THIS same-origin route; the route calls FastAPI. That keeps
// API_URL (and any future key) server-side and sidesteps browser CORS entirely.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const base = process.env.API_URL?.replace(/\/+$/, "");
  if (!base) {
    return Response.json(
      { error: "API_URL is not set. Add it to .env.local (see .env.example)." },
      { status: 503 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // The free Hugging Face Space can cold-start; give it a generous bound.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const upstream = await fetch(`${base}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    // Pass the FastAPI status + JSON straight through (incl. 422 validation errors).
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return Response.json(
      { error: "Backend unreachable", detail: String(err?.message || err) },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
