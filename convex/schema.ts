import { authTables } from "@convex-dev/auth/server";
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

export const quizStatus = v.union(v.literal("draft"), v.literal("published"));

export const quizOption = v.object({
  id: v.string(),
  label: v.string(),
});

export const quizContent = {
  slug: v.string(),
  prompt: v.string(),
  code: v.string(),
  language,
  topic,
  difficulty,
  options: v.array(quizOption),
  correctOptionId: v.string(),
  explanation: v.string(),
};

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(role),
  }).index("email", ["email"]),

  quizzes: defineTable({
    ...quizContent,
    status: quizStatus,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

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
