import { readdir, rm, rename } from "node:fs/promises";
import { join } from "node:path";

export async function cleanupServerDir(serverDir: string): Promise<void> {
  const serverFiles = await readdir(serverDir);
  for (const file of serverFiles) {
    if (file !== "entry.bundled.mjs") {
      await rm(join(serverDir, file), { recursive: true });
    }
  }

  await rename(
    join(serverDir, "entry.bundled.mjs"),
    join(serverDir, "entry.mjs"),
  );
}
