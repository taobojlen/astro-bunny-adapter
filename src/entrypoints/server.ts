import { App } from "astro/app";
// @ts-ignore - virtual module provided by Astro at build time
import { manifest } from "virtual:astro:manifest";
import { net } from "@bunny.net/edgescript-sdk";
import { setGetEnv } from "astro/env/setup";

// Polyfill process.env from Deno's environment so that server-side code
// can access runtime env vars in the Bunny edge runtime (Deno-based).
// Only runs in Deno — in Node.js, process.env is already a reactive proxy
// and replacing it would break dynamic env var access (e.g. getSecret).
// @ts-ignore - Deno runtime
if (typeof Deno !== "undefined") {
  // @ts-ignore
  const denoEnv = Deno.env?.toObject?.() ?? {};
  // @ts-ignore
  globalThis.process = globalThis.process ?? {};
  // @ts-ignore
  globalThis.process.env = { ...denoEnv, ...globalThis.process.env };
}

// Wire up astro:env/server's getSecret() to read from the polyfilled env.
setGetEnv((key) => process.env[key]);

let app: App;
try {
  app = new App(manifest);
} catch (e) {
  console.error("Failed to initialize Astro App:", e);
  throw e;
}

export async function handler(
  ctx: { request: Request },
): Promise<Request | Response> {
  const request = ctx.request;

  try {
    const routeData = app.match(request);
    if (!routeData) {
      return request;
    }

    const response = await app.render(request, { routeData });

    // Apply Set-Cookie headers from Astro's cookie API
    const setCookieHeaders = Array.from(app.setCookieHeaders(response));
    if (setCookieHeaders.length > 0) {
      const headers = new Headers(response.headers);
      for (const cookie of setCookieHeaders) {
        headers.append("Set-Cookie", cookie);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.stack || e.message : String(e);
    console.error(`Render error: ${request.method} ${request.url}\n${message}`);
    return new Response("Internal Server Error", { status: 500 });
  }
}

net.http
  .servePullZone()
  .onOriginRequest((ctx) => handler(ctx) as Promise<Request> | Promise<Response>);
