import type { AstroConfig, AstroIntegration, AstroIntegrationLogger } from "astro";
import type { BuildOptions } from "esbuild";

const BUNNY_SCRIPT_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

export type Options = {
  esbuild?:
    | BuildOptions
    | ((defaults: BuildOptions) => BuildOptions | Promise<BuildOptions>);
  shiki?: {
    /** Language IDs to keep in the bundle. All others are removed.
     * Reduces edge script size by up to 80% when using Shiki-based
     * syntax highlighting (e.g. Starlight / Expressive Code). */
    bundledLangs?: string[];
  };
};

/**
 * Regex that matches individual entries in Shiki's language/theme bundle files.
 * Captures the `"id"` value so we can selectively remove entries.
 * Same approach as the astro-expressive-code Vite plugin.
 */
const shikiEntryRegExp = /(?<=\n)\s*\{[\s\S]*?"id": "(.*?)",[\s\S]*?\n\s*\},?\s*\n/g;

/**
 * Returns the default esbuild options used to bundle the server output.
 * The `entryPoints`, `outfile`, and `plugins` fields are set at build time
 * and not included here.
 */
export function getDefaultEsbuildOptions(): Omit<BuildOptions, "entryPoints" | "outfile" | "plugins"> {
  return {
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
  };
}

export default function bunnyAdapter(options: Options = {}): AstroIntegration {
  let astroConfig: AstroConfig;
  let logger: AstroIntegrationLogger;

  return {
    name: "astro-bunny-adapter",
    hooks: {
      "astro:config:setup": ({ updateConfig, config }) => {
        updateConfig({
          build: {
            client: new URL("./client/", config.outDir),
            server: new URL("./server/", config.outDir),
            serverEntry: "entry.mjs",
          },
        });
      },

      "astro:config:done": ({ config, setAdapter, buildOutput, logger: _logger }) => {
        astroConfig = config;
        logger = _logger;

        if (buildOutput === "static") {
          throw new Error(
            'astro-bunny-adapter: static output is not supported. ' +
              "This adapter requires on-demand server rendering. " +
              'Set `output: "server"` in your Astro config.',
          );
        }

        if (
          config.image.service.entrypoint === "astro/assets/services/sharp"
        ) {
          logger.warn(
            "sharp is not supported in Bunny.net's edge runtime. " +
              "The image service has been automatically switched to passthrough.",
          );
          config.image.service = {
            entrypoint: "astro/assets/services/noop",
            config: {},
          };
        }

        setAdapter({
          name: "astro-bunny-adapter",
          entrypointResolution: "auto",
          serverEntrypoint: "astro-bunny-adapter/entrypoints/server.js",
          supportedAstroFeatures: {
            serverOutput: "stable",
            staticOutput: "unsupported",
            sharpImageService: "unsupported",
          },
        });
      },

      "astro:build:setup": ({ vite, target }) => {
        if (target === "server") {
          vite.build ??= {};
          vite.build.rollupOptions ??= {};
          vite.build.rollupOptions.external = ["sharp"];

          // Prevent Vite from externalizing Shiki so that any transform
          // plugins (including our bundledLangs filter) can process it.
          vite.ssr ??= {};
          vite.ssr.noExternal ??= [];
          if (Array.isArray(vite.ssr.noExternal)) {
            vite.ssr.noExternal.push(/^shiki/, /^@shikijs\//);
          }

          if (options.shiki?.bundledLangs) {
            const allowedLangs = options.shiki.bundledLangs;
            vite.plugins ??= [];
            (vite.plugins as Array<unknown>).push({
              name: "astro-bunny-adapter:shiki-filter",
              transform(code: string, id: string) {
                // Target the actual data file, not the re-export (langs.mjs).
                // Shiki splits language data into langs-bundle-full-<hash>.mjs.
                if (/shiki\/dist\/langs-bundle-full.*\.mjs$/.test(id)) {
                  return code.replace(
                    shikiEntryRegExp,
                    (match: string, langId: string) =>
                      allowedLangs.includes(langId) ? match : "",
                  );
                }
              },
            });
          }
        }
      },

      "astro:build:done": async () => {
        const { fileURLToPath } = await import("node:url");
        const { build } = await import("esbuild");
        const nodeProtocolImports = await import(
          "esbuild-plugin-node-protocol-imports"
        );

        const serverDir = fileURLToPath(
          new URL("./server/", astroConfig.outDir),
        );
        const entryFile = fileURLToPath(
          new URL("./server/entry.mjs", astroConfig.outDir),
        );
        const outFile = fileURLToPath(
          new URL("./server/entry.bundled.mjs", astroConfig.outDir),
        );

        const defaults: BuildOptions = {
          ...getDefaultEsbuildOptions(),
          entryPoints: [entryFile],
          outfile: outFile,
          plugins: [nodeProtocolImports.default],
        };

        const finalOptions =
          typeof options.esbuild === "function"
            ? await options.esbuild(defaults)
            : { ...defaults, ...options.esbuild };

        await build(finalOptions);

        // Check bundle size against Bunny.net's 10 MB limit
        const { stat } = await import("node:fs/promises");
        const bundleStats = await stat(outFile);
        const sizeMB = (bundleStats.size / (1024 * 1024)).toFixed(1);
        if (bundleStats.size > BUNNY_SCRIPT_SIZE_LIMIT) {
          throw new Error(
            `Edge script bundle is ${sizeMB} MB, which exceeds Bunny.net's 10 MB limit. ` +
              "Try reducing your server-rendered dependencies or prerendering more pages. " +
              "See https://docs.bunny.net/docs/edge-scripting-limits for details.",
          );
        }
        logger.info(`Edge script bundle size: ${sizeMB} MB (limit: 10 MB)`);

        // Clean up intermediate build artifacts — keep only the bundled output
        const { cleanupServerDir } = await import("./cleanup.js");
        await cleanupServerDir(serverDir);
      },
    },
  };
}
