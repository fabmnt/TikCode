import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const BATCH_SIZE = 100;

// The retired `language` field still sits on documents written before it was
// removed from the schema. Replacing each document without the field keeps it
// writable under the current schema. One-off, run once per deployment:
//
//   npx convex run migrations:stripQuizLanguage
//   npx convex run migrations:stripQuizDraftLanguage
//
// Both mutations page through their table and schedule the next page, so large
// tables are covered in several transactions.
export const stripQuizLanguage = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ stripped: v.number(), isDone: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("quizzes").paginate({
      cursor: cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let stripped = 0;

    for (const quiz of page.page) {
      const legacy = quiz as Doc<"quizzes"> & { language?: string };
      if (legacy.language === undefined) {
        continue;
      }

      await ctx.db.replace("quizzes", quiz._id, {
        slug: quiz.slug,
        prompt: quiz.prompt,
        description: quiz.description,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        options: quiz.options,
        correctOptionId: quiz.correctOptionId,
        explanation: quiz.explanation,
        ...(quiz.authorId ? { authorId: quiz.authorId } : {}),
        ...(quiz.authorName ? { authorName: quiz.authorName } : {}),
      });
      stripped += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.stripQuizLanguage, {
        cursor: page.continueCursor,
      });
    }

    return { stripped, isDone: page.isDone };
  },
});

export const stripQuizDraftLanguage = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({ stripped: v.number(), isDone: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("quizDrafts").paginate({
      cursor: cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let stripped = 0;

    for (const draft of page.page) {
      const legacy = draft as Doc<"quizDrafts"> & { language?: string };
      if (legacy.language === undefined) {
        continue;
      }

      await ctx.db.replace("quizDrafts", draft._id, {
        slug: draft.slug,
        prompt: draft.prompt,
        description: draft.description,
        topic: draft.topic,
        difficulty: draft.difficulty,
        options: draft.options,
        correctOptionId: draft.correctOptionId,
        explanation: draft.explanation,
      });
      stripped += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.stripQuizDraftLanguage,
        { cursor: page.continueCursor },
      );
    }

    return { stripped, isDone: page.isDone };
  },
});
