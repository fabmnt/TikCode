import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin } from "./authz";
import { quizContent } from "./schema";

const DRAFT_LIMIT = 50;
const SLUG_HISTORY_LIMIT = 60;

export const listDrafts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await ctx.db
      .query("quizzes")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .order("desc")
      .take(DRAFT_LIMIT);
  },
});

export const publishDraft = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, { quizId }) => {
    await requireAdmin(ctx);

    const quiz = await ctx.db.get(quizId);
    if (!quiz) {
      throw new ConvexError("Quiz not found");
    }

    if (quiz.status === "published") {
      throw new ConvexError("Quiz is already published");
    }

    await ctx.db.patch(quizId, { status: "published" });
  },
});

export const discardDraft = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, { quizId }) => {
    await requireAdmin(ctx);

    const quiz = await ctx.db.get(quizId);
    if (!quiz) {
      throw new ConvexError("Quiz not found");
    }

    if (quiz.status !== "draft") {
      throw new ConvexError("Only drafts can be discarded");
    }

    const stats = await ctx.db
      .query("quizStats")
      .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
      .unique();
    if (stats) {
      await ctx.db.delete(stats._id);
    }

    await ctx.db.delete(quizId);
  },
});

export const existingSlugs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const quizzes = await ctx.db
      .query("quizzes")
      .order("desc")
      .take(SLUG_HISTORY_LIMIT);

    return quizzes.map((quiz) => quiz.slug);
  },
});

export const insertDrafts = internalMutation({
  args: { quizzes: v.array(v.object(quizContent)) },
  handler: async (ctx, { quizzes }) => {
    let inserted = 0;
    let skipped = 0;

    for (const quiz of quizzes) {
      const existing = await ctx.db
        .query("quizzes")
        .withIndex("by_slug", (q) => q.eq("slug", quiz.slug))
        .unique();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("quizzes", { ...quiz, status: "draft" });
      inserted += 1;
    }

    return { inserted, skipped };
  },
});
