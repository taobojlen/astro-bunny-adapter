import { describe, it, expect } from "vitest";
import { getDefaultEsbuildOptions } from "./index.js";

describe("getDefaultEsbuildOptions", () => {
  it("returns the documented default esbuild config", () => {
    const defaults = getDefaultEsbuildOptions();

    expect(defaults).toEqual({
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2024",
      minify: true,
      external: [
        "node:*",
        "@bunny.net/edgescript-sdk",
        "@bunny.net/edgescript-sdk/*",
      ],
      logLevel: "info",
    });
  });
});
