import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const topic = v.union(
  v.literal("code-smell"),
  v.literal("antipattern"),
  v.literal("bad-practice"),
);

export const difficulty = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
);

export const role = v.union(v.literal("admin"), v.literal("user"));

export const quizOption = v.object({
  id: v.string(),
  label: v.string(),
});

// Fields every quiz carries, wherever it is stored (the public feed, the
// generation draft queue, or a quiz group).
export const quizBody = {
  prompt: v.string(),
  description: v.string(),
  topic,
  difficulty,
  options: v.array(quizOption),
  correctOptionId: v.string(),
  explanation: v.string(),
};

export const quizContent = {
  slug: v.string(),
  ...quizBody,
};

export const quizAuthor = {
  authorId: v.optional(v.id("users")),
  authorName: v.optional(v.string()),
};

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    username: v.optional(v.string()),
    role,
  })
    .index("by_authId", ["authId"])
    .index("by_username", ["username"]),

  quizzes: defineTable({ ...quizContent, ...quizAuthor }).index("by_slug", [
    "slug",
  ]),

  quizDrafts: defineTable(quizContent).index("by_slug", ["slug"]),

  quizStats: defineTable({
    quizId: v.id("quizzes"),
    optionCounts: v.record(v.string(), v.number()),
  }).index("by_quiz", ["quizId"]),

  votes: defineTable({
    quizId: v.id("quizzes"),
    clientId: v.string(),
    optionId: v.string(),
    userId: v.optional(v.string()),
  })
    .index("by_quiz_and_client", ["quizId", "clientId"])
    .index("by_client", ["clientId"])
    .index("by_quiz_and_user", ["quizId", "userId"])
    .index("by_user", ["userId"]),

  voteLinkCursors: defineTable({
    userId: v.string(),
    clientId: v.string(),
    cursor: v.string(),
  }).index("by_user_and_client", ["userId", "clientId"]),

  // Quiz groups stay out of the public feed. The join token is the invite:
  // anyone holding the link may join, and only members see the quizzes.
  // Groups never lose members or quizzes, so the two counters cannot drift and
  // the scoreboard and group lists never need to count rows.
  quizGroups: defineTable({
    name: v.string(),
    creatorId: v.id("users"),
    joinToken: v.string(),
    quizCount: v.number(),
    memberCount: v.number(),
  })
    .index("by_joinToken", ["joinToken"])
    .index("by_creator", ["creatorId"]),

  groupQuizzes: defineTable({
    groupId: v.id("quizGroups"),
    ...quizBody,
  }).index("by_group", ["groupId"]),

  groupMembers: defineTable({
    groupId: v.id("quizGroups"),
    userId: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"]),

  // One answer per member per group quiz, so a member's group score is the
  // count of `correct` rows.
  groupAnswers: defineTable({
    groupId: v.id("quizGroups"),
    quizId: v.id("groupQuizzes"),
    userId: v.id("users"),
    optionId: v.string(),
    correct: v.boolean(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_and_user", ["groupId", "userId"]),
});
