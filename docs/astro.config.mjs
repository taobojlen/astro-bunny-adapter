import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeFlexoki from "starlight-theme-flexoki";
import bunnyAdapter from "astro-bunny-adapter";

export default defineConfig({
  output: "server",
  adapter: bunnyAdapter({
    shiki: { bundledLangs: ["bash", "js", "yaml"] },
  }),
  integrations: [
    starlight({
      title: "astro-bunny-adapter",
      plugins: [starlightThemeFlexoki()],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/taobojlen/astro-bunny-adapter",
        },
      ],
      sidebar: [
        { label: "Home", link: "/" },
        { label: "Getting Started", slug: "getting-started" },
        { label: "Configuration", slug: "configuration" },
        { label: "Deploying", slug: "deploying" },
        { label: "How It Works", slug: "how-it-works" },
        { label: "SSR Demo", link: "/ssr-demo" },
      ],
    }),
  ],
});
