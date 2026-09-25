import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const USERNAME_MAX_LENGTH = 20;
const USERNAME_FALLBACK = "user";
const USERNAME_SUFFIX_LENGTHS = [6, 12];
const BACKFILL_BATCH_SIZE = 100;

// Page routes that would shadow the profile URL of an account with the same
// handle, so they are never handed out as usernames.
const RESERVED_USERNAMES = new Set(["admin"]);

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
// ties when two accounts share a local part. Throws instead of reusing an
// occupied candidate, so one profile URL never resolves to two accounts.
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
    if (RESERVED_USERNAMES.has(candidate)) {
      continue;
    }

    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .first();
    if (!taken) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to generate a unique username: ${candidates.join(", ")} are all taken`,
  );
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
// runs. Each call migrates one page and schedules the next, so deployments
// with more users than BACKFILL_BATCH_SIZE are still fully covered.
export const backfillUsernames = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ updated: v.number(), isDone: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("users").paginate({
      cursor: cursor ?? null,
      numItems: BACKFILL_BATCH_SIZE,
    });
    let updated = 0;

    for (const user of page.page) {
      if (user.username) {
        continue;
      }

      await ctx.db.patch(user._id, {
        username: await uniqueUsername(ctx, user.email, user.authId),
      });
      updated += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.users.backfillUsernames, {
        cursor: page.continueCursor,
      });
    }

    return { updated, isDone: page.isDone };
  },
});
