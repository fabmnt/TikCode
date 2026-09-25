import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentAppUser, requireUser } from "./authz";
import { difficulty, quizOption, topic } from "./schema";
import { assertQuizBatch, cleanQuiz, quizInput } from "./quizzes";

const MAX_GROUP_NAME_LENGTH = 60;
const MAX_GROUP_QUIZZES = 50;
const TOKEN_BYTES = 16;

const answerView = v.object({
  optionId: v.string(),
  correct: v.boolean(),
  correctOptionId: v.string(),
  explanation: v.string(),
});

const groupQuizView = v.object({
  _id: v.id("groupQuizzes"),
  prompt: v.string(),
  description: v.string(),
  topic,
  difficulty,
  options: v.array(quizOption),
  answer: v.union(v.null(), answerView),
});

const scoreEntry = v.object({
  name: v.union(v.string(), v.null()),
  username: v.union(v.string(), v.null()),
  correct: v.number(),
  answered: v.number(),
  completed: v.boolean(),
  isViewer: v.boolean(),
});

// 128 random bits, hex encoded, so a join link cannot be guessed.
function newJoinToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function groupByToken(ctx: QueryCtx | MutationCtx, token: string) {
  return await ctx.db
    .query("quizGroups")
    .withIndex("by_joinToken", (q) => q.eq("joinToken", token))
    .unique();
}

async function membership(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"quizGroups">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .unique();
}

function quizzesInGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"quizGroups">,
) {
  return ctx.db
    .query("groupQuizzes")
    .withIndex("by_group", (q) => q.eq("groupId", groupId));
}

function membersInGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"quizGroups">,
) {
  return ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId));
}

function answersInGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"quizGroups">,
) {
  return ctx.db
    .query("groupAnswers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId));
}

// A member answers each quiz at most once and a group holds at most
// MAX_GROUP_QUIZZES quizzes, so this bound is exact.
async function viewerAnswers(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"quizGroups">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("groupAnswers")
    .withIndex("by_group_and_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .take(MAX_GROUP_QUIZZES);
}

// Every member and answer is read, so large groups keep exact standings
// instead of losing rows to a cap. Best score first; members who answered less
// follow, then by name.
async function buildScoreboard(
  ctx: QueryCtx,
  group: Doc<"quizGroups">,
  viewer: Doc<"users">,
) {
  const totals = new Map<Id<"users">, { correct: number; answered: number }>();
  for await (const answer of answersInGroup(ctx, group._id)) {
    const score = totals.get(answer.userId) ?? { correct: 0, answered: 0 };
    score.answered += 1;
    score.correct += answer.correct ? 1 : 0;
    totals.set(answer.userId, score);
  }

  const entries = [];
  for await (const member of membersInGroup(ctx, group._id)) {
    const user = await ctx.db.get(member.userId);
    const score = totals.get(member.userId) ?? { correct: 0, answered: 0 };

    entries.push({
      name: user?.name ?? null,
      username: user?.username ?? null,
      correct: score.correct,
      answered: score.answered,
      completed: group.quizCount > 0 && score.answered >= group.quizCount,
      isViewer: member.userId === viewer._id,
    });
  }

  entries.sort(
    (a, b) =>
      b.correct - a.correct ||
      b.answered - a.answered ||
      (a.name ?? a.username ?? "").localeCompare(b.name ?? b.username ?? ""),
  );

  return entries;
}

export const createGroup = mutation({
  args: { name: v.string(), quizzes: v.array(quizInput) },
  returns: v.object({
    groupId: v.id("quizGroups"),
    joinToken: v.string(),
  }),
  handler: async (ctx, { name, quizzes }) => {
    const user = await requireUser(ctx);
    const cleanName = name.trim();

    if (cleanName === "") {
      throw new ConvexError("Give the group a name.");
    }
    if (cleanName.length > MAX_GROUP_NAME_LENGTH) {
      throw new ConvexError(
        `Group names can be at most ${MAX_GROUP_NAME_LENGTH} characters.`,
      );
    }
    assertQuizBatch(quizzes);

    const joinToken = newJoinToken();
    const groupId = await ctx.db.insert("quizGroups", {
      name: cleanName,
      creatorId: user._id,
      joinToken,
      quizCount: quizzes.length,
      memberCount: 1,
    });
    await ctx.db.insert("groupMembers", { groupId, userId: user._id });

    for (const quiz of quizzes) {
      await ctx.db.insert("groupQuizzes", { groupId, ...cleanQuiz(quiz) });
    }

    return { groupId, joinToken };
  },
});

export const listMyGroups = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("quizGroups"),
      name: v.string(),
      joinToken: v.string(),
      isCreator: v.boolean(),
      quizCount: v.number(),
      memberCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await currentAppUser(ctx);
    if (!user) {
      return [];
    }

    const entries: Array<{ group: Doc<"quizGroups">; isCreator: boolean }> = [];
    for await (const group of ctx.db
      .query("quizGroups")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .order("desc")) {
      entries.push({ group, isCreator: true });
    }

    for await (const row of ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")) {
      const group = await ctx.db.get(row.groupId);
      if (group && group.creatorId !== user._id) {
        entries.push({ group, isCreator: false });
      }
    }

    return entries.map(({ group, isCreator }) => ({
      _id: group._id,
      name: group.name,
      joinToken: group.joinToken,
      isCreator,
      quizCount: group.quizCount,
      memberCount: group.memberCount,
    }));
  },
});

// The join token is the access credential: holders see the group and, once
// they join, its quizzes. Signed-out and non-member viewers get the group
// summary and an empty quiz list.
export const getGroupByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("quizGroups"),
      name: v.string(),
      joinToken: v.string(),
      creatorName: v.union(v.string(), v.null()),
      creatorUsername: v.union(v.string(), v.null()),
      memberCount: v.number(),
      quizCount: v.number(),
      isCreator: v.boolean(),
      isMember: v.boolean(),
      quizzes: v.array(groupQuizView),
      progress: v.object({
        answered: v.number(),
        correct: v.number(),
        total: v.number(),
        completed: v.boolean(),
      }),
      scoreboard: v.union(v.null(), v.array(scoreEntry)),
    }),
  ),
  handler: async (ctx, { token }) => {
    const group = await groupByToken(ctx, token);
    if (!group) {
      return null;
    }

    const viewer = await currentAppUser(ctx);
    const creator = await ctx.db.get(group.creatorId);
    const isCreator = viewer !== null && viewer._id === group.creatorId;
    const isMember =
      isCreator ||
      (viewer !== null &&
        (await membership(ctx, group._id, viewer._id)) !== null);

    const quizDocs = isMember
      ? await quizzesInGroup(ctx, group._id).take(MAX_GROUP_QUIZZES)
      : [];
    const answers =
      viewer !== null && isMember
        ? await viewerAnswers(ctx, group._id, viewer._id)
        : [];
    const answerByQuiz = new Map(
      answers.map((answer) => [answer.quizId, answer]),
    );

    const quizzes = quizDocs.map((quiz) => {
      const answer = answerByQuiz.get(quiz._id);

      return {
        _id: quiz._id,
        prompt: quiz.prompt,
        description: quiz.description,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        options: quiz.options,
        answer: answer
          ? {
              optionId: answer.optionId,
              correct: answer.correct,
              correctOptionId: quiz.correctOptionId,
              explanation: quiz.explanation,
            }
          : null,
      };
    });

    const answered = answers.length;
    const correct = answers.filter((answer) => answer.correct).length;
    const completed = group.quizCount > 0 && answered >= group.quizCount;

    return {
      _id: group._id,
      name: group.name,
      joinToken: group.joinToken,
      creatorName: creator?.name ?? null,
      creatorUsername: creator?.username ?? null,
      memberCount: group.memberCount,
      quizCount: group.quizCount,
      isCreator,
      isMember,
      quizzes,
      progress: {
        answered,
        correct,
        total: group.quizCount,
        completed,
      },
      scoreboard:
        completed && viewer !== null
          ? await buildScoreboard(ctx, group, viewer)
          : null,
    };
  },
});

export const joinGroup = mutation({
  args: { token: v.string() },
  returns: v.object({ groupId: v.id("quizGroups"), joined: v.boolean() }),
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx);
    const group = await groupByToken(ctx, token);

    if (!group) {
      throw new ConvexError("This join link is not valid.");
    }

    const existing = await membership(ctx, group._id, user._id);
    if (existing) {
      return { groupId: group._id, joined: false };
    }

    await ctx.db.insert("groupMembers", {
      groupId: group._id,
      userId: user._id,
    });
    await ctx.db.patch(group._id, { memberCount: group.memberCount + 1 });

    return { groupId: group._id, joined: true };
  },
});

export const addGroupQuizzes = mutation({
  args: { groupId: v.id("quizGroups"), quizzes: v.array(quizInput) },
  returns: v.object({ created: v.number() }),
  handler: async (ctx, { groupId, quizzes }) => {
    const user = await requireUser(ctx);
    const group = await ctx.db.get(groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }
    if (group.creatorId !== user._id) {
      throw new ConvexError("Only the group creator can add quizzes.");
    }
    assertQuizBatch(quizzes);

    if (group.quizCount + quizzes.length > MAX_GROUP_QUIZZES) {
      throw new ConvexError(
        `A group can hold up to ${MAX_GROUP_QUIZZES} quizzes.`,
      );
    }

    for (const quiz of quizzes) {
      await ctx.db.insert("groupQuizzes", { groupId, ...cleanQuiz(quiz) });
    }
    await ctx.db.patch(groupId, {
      quizCount: group.quizCount + quizzes.length,
    });

    return { created: quizzes.length };
  },
});

export const answerGroupQuiz = mutation({
  args: { quizId: v.id("groupQuizzes"), optionId: v.string() },
  returns: v.object({ alreadyAnswered: v.boolean() }),
  handler: async (ctx, { quizId, optionId }) => {
    const user = await requireUser(ctx);
    const quiz = await ctx.db.get(quizId);

    if (!quiz) {
      throw new ConvexError("Quiz not found");
    }
    if ((await membership(ctx, quiz.groupId, user._id)) === null) {
      throw new ConvexError("Join this group to answer its quizzes.");
    }

    const answers = await viewerAnswers(ctx, quiz.groupId, user._id);
    if (answers.some((answer) => answer.quizId === quizId)) {
      return { alreadyAnswered: true };
    }

    if (!quiz.options.some((option) => option.id === optionId)) {
      throw new ConvexError("Unknown option");
    }

    await ctx.db.insert("groupAnswers", {
      groupId: quiz.groupId,
      quizId,
      userId: user._id,
      optionId,
      correct: optionId === quiz.correctOptionId,
    });

    return { alreadyAnswered: false };
  },
});
