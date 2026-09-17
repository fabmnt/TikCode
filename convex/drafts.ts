import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { requireAdmin } from "./authz";
import { quizContent } from "./schema";

const DRAFT_LIMIT = 50;
const SLUG_HISTORY_LIMIT = 60;

async function publishedSlugExists(ctx: MutationCtx, slug: string) {
  const published = await ctx.db
    .query("quizzes")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  return published !== null;
}

async function draftSlugExists(ctx: MutationCtx, slug: string) {
  const draft = await ctx.db
    .query("quizDrafts")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  return draft !== null;
}

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await ctx.db.query("quizDrafts").order("desc").take(DRAFT_LIMIT);
  },
});

export const publishDraft = mutation({
  args: { draftId: v.id("quizDrafts") },
  handler: async (ctx, { draftId }) => {
    await requireAdmin(ctx);

    const draft = await ctx.db.get(draftId);
    if (!draft) {
      throw new ConvexError("Draft not found");
    }

    if (await publishedSlugExists(ctx, draft.slug)) {
      throw new ConvexError(
        `A published quiz already uses the slug "${draft.slug}". Discard this draft instead.`,
      );
    }

    await ctx.db.insert("quizzes", {
      slug: draft.slug,
      prompt: draft.prompt,
      code: draft.code,
      language: draft.language,
      topic: draft.topic,
      difficulty: draft.difficulty,
      options: draft.options,
      correctOptionId: draft.correctOptionId,
      explanation: draft.explanation,
    });
    await ctx.db.delete(draftId);
  },
});

export const discardDraft = mutation({
  args: { draftId: v.id("quizDrafts") },
  handler: async (ctx, { draftId }) => {
    await requireAdmin(ctx);

    const draft = await ctx.db.get(draftId);
    if (!draft) {
      throw new ConvexError("Draft not found");
    }

    await ctx.db.delete(draftId);
  },
});

export const existingSlugs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .order("desc")
      .take(SLUG_HISTORY_LIMIT);
    const drafts = await ctx.db
      .query("quizDrafts")
      .order("desc")
      .take(SLUG_HISTORY_LIMIT);

    return [
      ...quizzes.map((quiz) => quiz.slug),
      ...drafts.map((draft) => draft.slug),
    ];
  },
});

export const insertDrafts = internalMutation({
  args: { drafts: v.array(v.object(quizContent)) },
  handler: async (ctx, { drafts }) => {
    let inserted = 0;
    let skipped = 0;

    for (const draft of drafts) {
      const collides =
        (await publishedSlugExists(ctx, draft.slug)) ||
        (await draftSlugExists(ctx, draft.slug));

      if (collides) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("quizDrafts", draft);
      inserted += 1;
    }

    return { inserted, skipped };
  },
});
