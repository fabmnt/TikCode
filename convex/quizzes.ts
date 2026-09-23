import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { difficulty, language, quizOption, topic } from "./schema";

const LINK_PAGE_SIZE = 100;
const LINK_SCAN_LIMIT = 500;

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

async function viewerUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

async function voteForViewer(
  ctx: QueryCtx | MutationCtx,
  quizId: Id<"quizzes">,
  clientId: string,
  userId: string | null,
) {
  if (userId) {
    const byUser = await ctx.db
      .query("votes")
      .withIndex("by_quiz_and_user", (q) =>
        q.eq("quizId", quizId).eq("userId", userId),
      )
      .unique();
    if (byUser) {
      return byUser;
    }
  }

  return await ctx.db
    .query("votes")
    .withIndex("by_quiz_and_client", (q) =>
      q.eq("quizId", quizId).eq("clientId", clientId),
    )
    .unique();
}

async function changeOptionCount(
  ctx: MutationCtx,
  quizId: Id<"quizzes">,
  optionId: string,
  delta: number,
) {
  const stats = await statsByQuiz(ctx, quizId);
  if (!stats) {
    return;
  }

  const nextCount = Math.max(0, (stats.optionCounts[optionId] ?? 0) + delta);
  await ctx.db.patch(stats._id, {
    optionCounts: { ...stats.optionCounts, [optionId]: nextCount },
  });
}

const feedQuiz = v.object({
  _id: v.id("quizzes"),
  prompt: v.string(),
  code: v.string(),
  language,
  options: v.array(quizOption),
});

const feedItem = v.union(
  feedQuiz.extend({ answered: v.literal(false) }),
  feedQuiz.extend({
    answered: v.literal(true),
    selectedOptionId: v.string(),
    correctOptionId: v.string(),
    explanation: v.string(),
    topic,
    difficulty,
  }),
);

function publicQuiz(quiz: Doc<"quizzes">) {
  return {
    _id: quiz._id,
    prompt: quiz.prompt,
    code: quiz.code,
    language: quiz.language,
    options: quiz.options,
  };
}

function answeredQuiz(quiz: Doc<"quizzes">, vote: Doc<"votes">) {
  return {
    ...publicQuiz(quiz),
    answered: true as const,
    selectedOptionId: vote.optionId,
    correctOptionId: quiz.correctOptionId,
    explanation: quiz.explanation,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
  };
}

export const listFeed = query({
  args: {
    clientId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(feedItem),
  handler: async (ctx, { clientId, paginationOpts }) => {
    const userId = await viewerUserId(ctx);
    const result = await ctx.db
      .query("quizzes")
      .order("asc")
      .paginate(paginationOpts);

    const page = await Promise.all(
      result.page.map(async (quiz) => {
        const vote = await voteForViewer(ctx, quiz._id, clientId, userId);
        if (!vote) {
          return { ...publicQuiz(quiz), answered: false as const };
        }

        return answeredQuiz(quiz, vote);
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
  returns: v.union(
    v.object({ answered: v.literal(false) }),
    v.object({
      answered: v.literal(true),
      optionCounts: v.record(v.string(), v.number()),
      totalVotes: v.number(),
    }),
  ),
  handler: async (ctx, { quizId, clientId }) => {
    const userId = await viewerUserId(ctx);
    const vote = await voteForViewer(ctx, quizId, clientId, userId);
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
  returns: v.object({ alreadyVoted: v.boolean() }),
  handler: async (ctx, { quizId, clientId, optionId }) => {
    const quiz = await ctx.db.get(quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const optionExists = quiz.options.some((option) => option.id === optionId);
    if (!optionExists) {
      throw new Error("Unknown option");
    }

    const userId = await viewerUserId(ctx);
    const existing = await voteForViewer(ctx, quizId, clientId, userId);
    if (existing) {
      if (userId && existing.userId === undefined) {
        await ctx.db.patch(existing._id, { userId });
      }
      return { alreadyVoted: true };
    }

    await ctx.db.insert("votes", {
      quizId,
      clientId,
      optionId,
      ...(userId ? { userId } : {}),
    });

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

    return { alreadyVoted: false };
  },
});

export const linkAnonymousVotes = mutation({
  args: { clientId: v.string() },
  returns: v.object({
    linked: v.number(),
    dropped: v.number(),
  }),
  handler: async (ctx, { clientId }) => {
    const userId = await viewerUserId(ctx);
    if (!userId) {
      throw new ConvexError("Sign in to continue");
    }

    const browserVotes: Doc<"votes">[] = [];
    let scanned = 0;
    let cursor: string | null = null;
    let isDone = false;

    // Read first, then write. A sign-in links at most LINK_SCAN_LIMIT votes.
    while (!isDone && scanned < LINK_SCAN_LIMIT) {
      const page = await ctx.db
        .query("votes")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .paginate({
          numItems: Math.min(LINK_PAGE_SIZE, LINK_SCAN_LIMIT - scanned),
          cursor,
        });

      browserVotes.push(...page.page);
      scanned += page.page.length;
      cursor = page.continueCursor;
      isDone = page.isDone;
    }

    let linked = 0;
    let dropped = 0;

    for (const anonymousVote of browserVotes) {
      if (anonymousVote.userId !== undefined) {
        continue;
      }

      const accountVote = await ctx.db
        .query("votes")
        .withIndex("by_quiz_and_user", (q) =>
          q.eq("quizId", anonymousVote.quizId).eq("userId", userId),
        )
        .unique();

      if (accountVote) {
        await changeOptionCount(
          ctx,
          anonymousVote.quizId,
          anonymousVote.optionId,
          -1,
        );
        await ctx.db.delete(anonymousVote._id);
        dropped += 1;
        continue;
      }

      await ctx.db.patch(anonymousVote._id, { userId });
      linked += 1;
    }

    return { linked, dropped };
  },
});
