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
      conditions: ["browser", "worker", "import", "default"],
      minify: true,
      external: [
        "node:*",
        "@bunny.net/edgescript-sdk",
        "@bunny.net/edgescript-sdk/*",
      ],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      banner: {
        js: 'import * as process from "node:process";import { Buffer } from "node:buffer";globalThis.process ??= process;globalThis.Buffer ??= Buffer;globalThis.global ??= globalThis;',
      },
      logLevel: "info",
    });
  });
});
