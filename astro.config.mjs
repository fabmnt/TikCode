// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  // Only the profile route renders on demand; the rest stays prerendered.
  adapter: vercel(),
  env: {
    schema: {
      CONVEX_URL: envField.string({
        access: "public",
        context: "client",
      }),
      CONVEX_SITE_URL: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
