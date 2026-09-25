import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { role } from "./schema";

const currentUserValidator = v.union(
  v.null(),
  v.object({
    email: v.string(),
    name: v.string(),
    role: v.union(role, v.null()),
    username: v.union(v.string(), v.null()),
  }),
);

async function appUserByAuthId(ctx: QueryCtx | MutationCtx, authId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
}

// The app user behind the current session, or null when nobody is signed in.
// Queries use this to answer without throwing; mutations use requireUser.
export async function currentAppUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  return await appUserByAuthId(ctx, authUser._id);
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await currentAppUser(ctx);
  if (!user) {
    throw new ConvexError("Sign in to continue");
  }

  return user;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return user;
}

export const currentUser = query({
  args: {},
  returns: currentUserValidator,
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const user = await appUserByAuthId(ctx, authUser._id);
    return {
      email: user?.email ?? authUser.email,
      name: user?.name ?? authUser.name,
      role: user?.role ?? null,
      username: user?.username ?? null,
    };
  },
});

export const userByAuthId = internalQuery({
  args: { authId: v.string() },
  returns: v.union(v.null(), v.object({ role: v.union(role, v.null()) })),
  handler: async (ctx, { authId }) => {
    const user = await appUserByAuthId(ctx, authId);
    if (!user) {
      return null;
    }

    return { role: user.role ?? null };
  },
});
