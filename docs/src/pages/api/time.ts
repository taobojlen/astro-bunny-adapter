import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const timezone = body?.timezone ?? "UTC";
  const time = new Date().toLocaleString("en-US", { timeZone: timezone });
  return new Response(JSON.stringify({ time, timezone }), {
    headers: { "Content-Type": "application/json" },
  });
};
