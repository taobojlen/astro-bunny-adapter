import type { APIRoute } from "astro";
import { TEST_SECRET, getSecret } from "astro:env/server";

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      schemaSecret: typeof TEST_SECRET === "string",
      dynamicSecret: typeof getSecret("TEST_SECRET") === "string",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
