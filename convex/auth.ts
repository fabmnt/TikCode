import { createClient, type AuthFunctions } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { GenericCtx } from "@convex-dev/better-auth";
import authConfig from "./auth.config";
import { roleForNewUser } from "./roles";

const LOCAL_DEV_ORIGIN = "http://localhost:4321";
const ORIGIN_SEPARATOR = ",";

const authFunctions: AuthFunctions = internal.auth;

type AuthUserDoc = {
  _id: string;
  email: string;
  name: string;
  image?: string | null;
};

function siteUrl() {
  return process.env.SITE_URL ?? LOCAL_DEV_ORIGIN;
}

function trustedSiteOrigins() {
  const extras = (process.env.TRUSTED_ORIGINS ?? "")
    .split(ORIGIN_SEPARATOR)
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return [...new Set([siteUrl(), LOCAL_DEV_ORIGIN, ...extras])];
}

function profilePatch(doc: AuthUserDoc) {
  return {
    email: doc.email,
    name: doc.name,
    ...(typeof doc.image === "string" ? { image: doc.image } : {}),
  };
}

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc: AuthUserDoc) => {
        const role = await roleForNewUser(ctx, doc.email);
        await ctx.db.insert("users", {
          authId: doc._id,
          role,
          ...profilePatch(doc),
        });
      },
      onUpdate: async (ctx, doc: AuthUserDoc) => {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_authId", (q) => q.eq("authId", doc._id))
          .unique();
        if (!existing) {
          return;
        }

        await ctx.db.patch(existing._id, profilePatch(doc));
      },
      onDelete: async (ctx, doc: AuthUserDoc) => {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_authId", (q) => q.eq("authId", doc._id))
          .unique();
        if (!existing) {
          return;
        }

        await ctx.db.delete(existing._id);
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    ...(process.env.BETTER_AUTH_SECRET
      ? { secret: process.env.BETTER_AUTH_SECRET }
      : {}),
    trustedOrigins: trustedSiteOrigins(),
    database: authComponent.adapter(ctx),
    // Google is the only provider. Email and password stay unconfigured.
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    plugins: [crossDomain({ siteUrl: siteUrl() }), convex({ authConfig })],
  });
};
