import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Sign in to continue");
  }

  const user = await ctx.db.get(userId);
  if (user?.role !== "admin") {
    throw new ConvexError("Admin access required");
  }

  return user;
}

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return { email: user.email ?? null, role: user.role ?? null };
  },
});

export const userById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return { role: user.role ?? null };
  },
});
