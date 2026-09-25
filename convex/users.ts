import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const USERNAME_MAX_LENGTH = 20;
const USERNAME_FALLBACK = "user";
const USERNAME_SUFFIX_LENGTHS = [6, 12];
const BACKFILL_BATCH_SIZE = 100;

export function usernameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  return localPart
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

function withSuffix(base: string, suffix: string) {
  const separator = "_";
  const room = USERNAME_MAX_LENGTH - suffix.length - separator.length;
  return `${base.slice(0, room)}${separator}${suffix}`;
}

// Usernames are the public profile handle, so they must stay unique and
// readable. The email local part is the readable base; the auth id breaks
// ties when two accounts share a local part.
export async function uniqueUsername(
  ctx: MutationCtx,
  email: string,
  authId: string,
) {
  const base = usernameFromEmail(email) || USERNAME_FALLBACK;
  const candidates = [
    base,
    ...USERNAME_SUFFIX_LENGTHS.map((length) =>
      withSuffix(base, authId.slice(-length)),
    ),
  ];

  for (const candidate of candidates) {
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .first();
    if (!taken) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

const profileValidator = v.object({
  username: v.string(),
  name: v.union(v.string(), v.null()),
  image: v.union(v.string(), v.null()),
});

export const profileByUsername = query({
  args: { username: v.string() },
  returns: v.union(v.null(), profileValidator),
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user?.username) {
      return null;
    }

    return {
      username: user.username,
      name: user.name ?? null,
      image: user.image ?? null,
    };
  },
});

// Accounts created before usernames existed keep their documents until this
// runs once per deployment.
export const backfillUsernames = internalMutation({
  args: {},
  returns: v.object({ updated: v.number() }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(BACKFILL_BATCH_SIZE);
    let updated = 0;

    for (const user of users) {
      if (user.username) {
        continue;
      }

      await ctx.db.patch(user._id, {
        username: await uniqueUsername(ctx, user.email, user.authId),
      });
      updated += 1;
    }

    return { updated };
  },
});
