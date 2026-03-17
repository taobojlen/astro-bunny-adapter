import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const docsDir = resolve(import.meta.dirname, "../docs");

describe("astro build", () => {
  it("builds the docs site with the adapter without errors", () => {
    // This will throw if the build fails (non-zero exit code)
    const result = execSync("pnpm build", {
      cwd: docsDir,
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("build");
  }, 120_000);
});
