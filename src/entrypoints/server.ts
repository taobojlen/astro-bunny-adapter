import type { SSRManifest } from "astro";
import { App } from "astro/app";
// @ts-expect-error — resolved at runtime in the bunny edge environment
import { net } from "@bunny.net/edgescript-sdk/esm-bunny/lib.mjs";

let app: App;

export function createExports(manifest: SSRManifest) {
  app = new App(manifest);
  return { handler };
}

async function handler(
  ctx: { request: Request; response: Response },
): Promise<Response> {
  const request = ctx.request;

  const routeData = app.match(request);
  if (!routeData) {
    return ctx.response;
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
}

export function start(manifest: SSRManifest) {
  const exports = createExports(manifest);

  net.http
    .servePullZone()
    .onOriginResponse(async (ctx: { request: Request; response: Response }) => {
      return exports.handler(ctx);
    });
}
