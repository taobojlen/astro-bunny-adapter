import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ time: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
};
