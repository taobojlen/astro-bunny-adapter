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

  it("renders the index page with a 200 status", async () => {
    const request = new Request("http://example.com/");
    const result = await entry.handler({ request });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const html = await (result as Response).text();
    expect(html).toContain("astro-bunny-adapter");
  });

  it("renders an SSR page that uses Astro.request", async () => {
    const request = new Request("http://example.com/ssr");
    const result = await entry.handler({ request });

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(200);
    const html = await (result as Response).text();
    expect(html).toContain("SSR Works");
  });

  it("passes through requests that don't match any route", async () => {
    const request = new Request("http://example.com/no-such-page");
    const result = await entry.handler({ request });

    // onOriginRequest: return the Request to let it pass through to origin
    expect(result).toBeInstanceOf(Request);
  });
});
