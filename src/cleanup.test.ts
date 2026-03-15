import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanupServerDir } from "./cleanup.js";

describe("cleanupServerDir", () => {
  let serverDir: string;

  beforeEach(async () => {
    serverDir = await mkdtemp(join(tmpdir(), "astro-bunny-test-"));

    // Mimic post-build dist/server/ layout
    await writeFile(join(serverDir, "entry.mjs"), "// original entry");
    await writeFile(join(serverDir, "entry.bundled.mjs"), "// bundled entry");
    await writeFile(
      join(serverDir, "virtual_astro_middleware.mjs"),
      "// middleware",
    );
    await mkdir(join(serverDir, "chunks"));
    await writeFile(
      join(serverDir, "chunks", "some-chunk.mjs"),
      "// chunk",
    );
  });

  it("removes all files and directories except entry.bundled.mjs, then renames it to entry.mjs", async () => {
    await cleanupServerDir(serverDir);

    const remaining = await readdir(serverDir);
    expect(remaining).toEqual(["entry.mjs"]);
  });
});
