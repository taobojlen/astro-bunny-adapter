import { defineConfig } from "astro/config";
import bunnyAdapter from "astro-bunny-adapter";

export default defineConfig({
  output: "server",
  adapter: bunnyAdapter(),
});
