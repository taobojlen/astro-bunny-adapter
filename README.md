# astro-bunny-adapter

Astro adapter for [bunny.net Edge Scripting](https://docs.bunny.net/docs/edge-scripting-overview).

Deploy your Astro 6 app to bunny.net's edge network.

## Installation

```bash
npm install astro-bunny-adapter
```

## Usage

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import bunny from "astro-bunny-adapter";

export default defineConfig({
  adapter: bunny(),
});
```

## Options

### `esbuild`

Override or customize the esbuild config used to bundle the server output for
bunny.net's edge runtime.

```js
// Pass an object to merge with defaults
bunny({
  esbuild: {
    minify: true,
  },
});

// Or pass a function for full control
bunny({
  esbuild: (defaults) => ({
    ...defaults,
    minify: true,
  }),
});
```

## How it works

1. Astro builds your app as usual (server-side rendered)
2. After the build, the adapter re-bundles the server output with esbuild
   targeting `platform: "browser"` so it runs in bunny.net's Deno-based edge runtime
3. The server entrypoint uses `servePullZone().onOriginResponse()` from the
   `@bunny.net/edgescript-sdk` to handle incoming requests through Astro's
   rendering pipeline

## Requirements

- Astro 6
- Node.js >= 22.12.0
- A bunny.net account with Edge Scripting enabled

## License

MIT
