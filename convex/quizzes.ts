import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function emptyCounts(optionIds: string[]) {
  return Object.fromEntries(optionIds.map((id) => [id, 0]));
}

function totalVotes(optionCounts: Record<string, number>) {
  return Object.values(optionCounts).reduce((sum, count) => sum + count, 0);
}

async function statsByQuiz(ctx: MutationCtx, quizId: Id<"quizzes">) {
  return await ctx.db
    .query("quizStats")
    .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
    .unique();
}

export const listFeed = query({
  args: {
    clientId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { clientId, paginationOpts }) => {
    const result = await ctx.db
      .query("quizzes")
      .order("asc")
      .paginate(paginationOpts);

    const page = await Promise.all(
      result.page.map(async (quiz) => {
        const vote = await ctx.db
          .query("votes")
          .withIndex("by_quiz_and_client", (q) =>
            q.eq("quizId", quiz._id).eq("clientId", clientId),
          )
          .unique();

        const publicQuiz = {
          _id: quiz._id,
          prompt: quiz.prompt,
          code: quiz.code,
          language: quiz.language,
          options: quiz.options,
        };

        if (!vote) {
          return { ...publicQuiz, answered: false as const };
        }

        return {
          ...publicQuiz,
          answered: true as const,
          selectedOptionId: vote.optionId,
          correctOptionId: quiz.correctOptionId,
          explanation: quiz.explanation,
          topic: quiz.topic,
          difficulty: quiz.difficulty,
        };
      }),
    );

    return { ...result, page };
  },
});

export const getStats = query({
  args: {
    quizId: v.id("quizzes"),
    clientId: v.string(),
  },
  handler: async (ctx, { quizId, clientId }) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_quiz_and_client", (q) =>
        q.eq("quizId", quizId).eq("clientId", clientId),
      )
      .unique();

    if (!vote) {
      return { answered: false as const };
    }

    const stats = await ctx.db
      .query("quizStats")
      .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
      .unique();
    const optionCounts = stats?.optionCounts ?? {};

    return {
      answered: true as const,
      optionCounts,
      totalVotes: totalVotes(optionCounts),
    };
  },
});

export const vote = mutation({
  args: {
    quizId: v.id("quizzes"),
    clientId: v.string(),
    optionId: v.string(),
  },
  handler: async (ctx, { quizId, clientId, optionId }) => {
    const quiz = await ctx.db.get(quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const optionExists = quiz.options.some((option) => option.id === optionId);
    if (!optionExists) {
      throw new Error("Unknown option");
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_quiz_and_client", (q) =>
        q.eq("quizId", quizId).eq("clientId", clientId),
      )
      .unique();

    if (existing) {
      return { alreadyVoted: true as const };
    }

    await ctx.db.insert("votes", { quizId, clientId, optionId });

    const stats = await statsByQuiz(ctx, quizId);
    const optionCounts = {
      ...emptyCounts(quiz.options.map((option) => option.id)),
      ...stats?.optionCounts,
    };
    optionCounts[optionId] = (optionCounts[optionId] ?? 0) + 1;

    if (stats) {
      await ctx.db.patch(stats._id, { optionCounts });
    } else {
      await ctx.db.insert("quizStats", { quizId, optionCounts });
    }

    return { alreadyVoted: false as const };
  },
});
