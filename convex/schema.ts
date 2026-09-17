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

export const quizOption = v.object({
  id: v.string(),
  label: v.string(),
});

export default defineSchema({
  quizzes: defineTable({
    slug: v.string(),
    prompt: v.string(),
    code: v.string(),
    language,
    topic,
    difficulty,
    options: v.array(quizOption),
    correctOptionId: v.string(),
    explanation: v.string(),
  }).index("by_slug", ["slug"]),

  quizStats: defineTable({
    quizId: v.id("quizzes"),
    optionCounts: v.record(v.string(), v.number()),
  }).index("by_quiz", ["quizId"]),

  votes: defineTable({
    quizId: v.id("quizzes"),
    clientId: v.string(),
    optionId: v.string(),
  })
    .index("by_quiz_and_client", ["quizId", "clientId"])
    .index("by_client", ["clientId"]),
});
