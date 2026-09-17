"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { ConvexError, v, type Infer } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { difficulty, language, topic } from "./schema";

const DEFAULT_MODEL = "stealth/union-alpha";
const MAX_QUIZZES_PER_RUN = 5;
const OPTION_IDS = ["a", "b", "c", "d"] as const;
const MIN_CODE_LINES = 5;
const MAX_CODE_LINES = 15;

type Language = Infer<typeof language>;
type Topic = Infer<typeof topic>;
type Difficulty = Infer<typeof difficulty>;

type QuizRequest = {
  topic: Topic;
  difficulty: Difficulty;
  language: Language;
};

const TOPIC_BRIEF: Record<Topic, string> = {
  "code-smell": "a symptom in the code that points to a deeper design problem",
  antipattern:
    "a solution that looks reasonable but causes problems as the code grows",
  "bad-practice": "a construct that is unsafe or wrong in everyday code",
};

const SYSTEM_PROMPT = `You write multiple-choice quizzes that train developers to spot problems in code.

Every quiz must follow these rules:
- The code snippet is between ${MIN_CODE_LINES} and ${MAX_CODE_LINES} lines and looks like code from a real project.
- The snippet is raw code. Never wrap it in markdown fences.
- The snippet demonstrates exactly one problem, and that problem matches the requested topic.
- The question has one defensible answer and ends with a question mark. Never ask for opinions or preferences.
- Provide exactly 4 options, with ids "a", "b", "c" and "d". Exactly one option is correct.
- The wrong options are plausible, but clearly wrong once the reader parses the code.
- The explanation says why the correct option is right, in one or two sentences.
- Each quiz covers a different problem, and none of them repeat a quiz from the "already covered" list.`;

const quizSchema = z.object({
  slug: z
    .string()
    .describe(
      "kebab-case identifier of at most 5 words, e.g. ts-any-escape-hatch",
    ),
  prompt: z.string().describe("One question, ending with a question mark"),
  code: z
    .string()
    .describe("The code snippet, 5 to 15 lines, without markdown fences"),
  options: z
    .array(
      z.object({
        id: z.enum(OPTION_IDS),
        label: z.string().describe("The answer text, one sentence"),
      }),
    )
    .length(4),
  correctOptionId: z
    .enum(OPTION_IDS)
    .describe("The id of the only correct option"),
  explanation: z
    .string()
    .describe("Why the correct option is right, one or two sentences"),
});

type GeneratedQuiz = z.infer<typeof quizSchema>;

type GenerationResult = {
  inserted: number;
  skipped: number;
  rejected: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function countCodeLines(code: string) {
  return code.split("\n").filter((line) => line.trim() !== "").length;
}

function isUsable(quiz: GeneratedQuiz, slug: string) {
  if (slug.length === 0) {
    return false;
  }

  const optionIds = new Set(quiz.options.map((option) => option.id));
  const code = quiz.code.trim();
  const codeLines = countCodeLines(code);

  const optionsAreValid =
    optionIds.size === quiz.options.length &&
    optionIds.has(quiz.correctOptionId) &&
    quiz.options.every((option) => option.label.trim() !== "");

  const contentIsValid =
    quiz.prompt.trim().endsWith("?") &&
    !code.includes("```") &&
    codeLines >= MIN_CODE_LINES &&
    codeLines <= MAX_CODE_LINES &&
    quiz.explanation.trim() !== "";

  return optionsAreValid && contentIsValid;
}

function buildPrompt(
  request: QuizRequest,
  count: number,
  existingSlugs: string[],
) {
  const lines = [
    `Write ${count} quizzes at ${request.difficulty} level, in ${request.language}.`,
    `Topic: ${request.topic}, meaning ${TOPIC_BRIEF[request.topic]}.`,
  ];

  if (existingSlugs.length > 0) {
    lines.push(
      `Already covered, do not repeat these slugs: ${existingSlugs.join(", ")}.`,
    );
  }

  return lines.join("\n");
}

export const generateDrafts = action({
  args: {
    topic,
    difficulty,
    language,
    count: v.number(),
  },
  handler: async (ctx, request): Promise<GenerationResult> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Sign in to continue");
    }

    const user = await ctx.runQuery(internal.authz.userById, { userId });
    if (user?.role !== "admin") {
      throw new ConvexError("Admin access required");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new ConvexError(
        "OPENROUTER_API_KEY is not set on this Convex deployment",
      );
    }

    const count = Math.min(
      Math.max(Math.trunc(request.count), 1),
      MAX_QUIZZES_PER_RUN,
    );
    const existingSlugs = await ctx.runQuery(internal.drafts.existingSlugs);
    const openrouter = createOpenRouter({ apiKey });

    const { output } = await generateText({
      model: openrouter.chat(process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL),
      output: Output.array({
        element: quizSchema,
        minItems: count,
        maxItems: count,
      }),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(request, count, existingSlugs),
    });

    const quizzes = output.flatMap((quiz) => {
      const slug = slugify(quiz.slug);
      if (!isUsable(quiz, slug)) {
        return [];
      }

      return [
        {
          ...quiz,
          slug,
          topic: request.topic,
          difficulty: request.difficulty,
          language: request.language,
        },
      ];
    });

    const result = await ctx.runMutation(internal.drafts.insertDrafts, {
      quizzes,
    });

    return { ...result, rejected: output.length - quizzes.length };
  },
});
