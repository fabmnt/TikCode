import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user || user.role !== undefined) {
        return;
      }

      const otherUser = await ctx.db
        .query("users")
        .filter((q) => q.neq(q.field("_id"), userId))
        .first();

      await ctx.db.patch(userId, { role: otherUser ? "user" : "admin" });
    },
  },
});
