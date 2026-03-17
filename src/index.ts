import type { AstroConfig, AstroIntegration } from "astro";
import type { BuildOptions } from "esbuild";

export type Options = {
  esbuild?:
    | BuildOptions
    | ((defaults: BuildOptions) => BuildOptions | Promise<BuildOptions>);
};

export default function bunnyAdapter(options: Options = {}): AstroIntegration {
  let astroConfig: AstroConfig;

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

      "astro:config:done": ({ config, setAdapter, buildOutput, logger }) => {
        astroConfig = config;

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
          entryPoints: [entryFile],
          outfile: outFile,
          bundle: true,
          format: "esm",
          platform: "browser",
          target: "es2024",
          minify: false,
          external: [
            "node:*",
            "@bunny.net/edgescript-sdk",
            "@bunny.net/edgescript-sdk/*",
          ],
          plugins: [nodeProtocolImports.default],
          logLevel: "info",
        };

        const finalOptions =
          typeof options.esbuild === "function"
            ? await options.esbuild(defaults)
            : { ...defaults, ...options.esbuild };

        await build(finalOptions);

        // Clean up intermediate build artifacts — keep only the bundled output
        const { cleanupServerDir } = await import("./cleanup.js");
        await cleanupServerDir(serverDir);
      },
    },
  };
}
