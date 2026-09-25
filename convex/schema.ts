import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const language = v.union(v.literal("typescript"), v.literal("python"));

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

export const quizContent = {
  slug: v.string(),
  prompt: v.string(),
  description: v.string(),
  language,
  topic,
  difficulty,
  options: v.array(quizOption),
  correctOptionId: v.string(),
  explanation: v.string(),
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
});
