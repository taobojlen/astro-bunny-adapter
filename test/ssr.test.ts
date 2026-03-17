import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const docsDir = resolve(import.meta.dirname, "../docs");

let entry: any;

describe("SSR rendering", () => {
  beforeAll(async () => {
    // Build the adapter, then the docs site
    execSync("pnpm build", { encoding: "utf-8", stdio: "pipe" });
    execSync("pnpm build", { cwd: docsDir, encoding: "utf-8", stdio: "pipe" });
    entry = await import(resolve(docsDir, "dist/server/entry.mjs"));
  }, 120_000);

  it("passes through prerendered pages to origin", async () => {
    const request = new Request("http://example.com/");
    const result = await entry.handler({ request });

    // Prerendered pages are served as static files by the CDN,
    // so the handler passes the request through to origin.
    expect(result).toBeInstanceOf(Request);
  });

  it("renders the SSR demo page with a 200 status", async () => {
    const request = new Request("http://example.com/ssr-demo");
    const result = await entry.handler({ request });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const html = await (result as Response).text();
    expect(html).toContain("SSR Demo");
  });

  it("returns a JSON response from the API endpoint", async () => {
    const request = new Request("http://example.com/api/time");
    const result = await entry.handler({ request });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const data = await (result as Response).json();
    expect(data).toHaveProperty("time");
  });

  it("passes through requests that don't match any route", async () => {
    const request = new Request("http://example.com/no-such-page");
    const result = await entry.handler({ request });

    // onOriginRequest: return the Request to let it pass through to origin
    expect(result).toBeInstanceOf(Request);
  });
});
