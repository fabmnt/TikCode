import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { CONVEX_SITE_URL, CONVEX_URL } from "astro:env/client";
import { createAuthClient } from "better-auth/react";

const CLOUD_HOST_SUFFIX = ".convex.cloud";
const SITE_HOST_SUFFIX = ".convex.site";

export const convexSiteUrl =
  CONVEX_SITE_URL ??
  (CONVEX_URL.includes(CLOUD_HOST_SUFFIX)
    ? CONVEX_URL.replace(CLOUD_HOST_SUFFIX, SITE_HOST_SUFFIX)
    : CONVEX_URL);

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
});
