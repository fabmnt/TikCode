"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { ConvexError, v, type Infer } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { difficulty, language, topic } from "./schema";
import { slugify } from "./slug";

const DEFAULT_MODEL = "stealth/union-alpha";
const MAX_QUIZZES_PER_RUN = 5;
const OPTION_IDS = ["a", "b", "c", "d"] as const;
const MIN_CODE_LINES = 5;
const MAX_CODE_LINES = 15;
const FENCE_PATTERN = /```([^\n`]*)\n([\s\S]*?)```/g;

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
- The description is markdown. It holds one fenced code block of ${MIN_CODE_LINES} to ${MAX_CODE_LINES} lines and, optionally, one or two short sentences that frame the code.
- Tag the fence with the requested language, for example \`\`\`typescript. Use only one code block per quiz.
- The snippet looks like code from a real project and demonstrates exactly one problem that matches the requested topic.
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
  description: z
    .string()
    .describe(
      "Markdown description with one fenced code block that holds the code snippet",
    ),
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

function countCodeLines(code: string) {
  return code.split("\n").filter((line) => line.trim() !== "").length;
}

function codeFences(description: string) {
  return [...description.matchAll(FENCE_PATTERN)];
}

function withLanguageTag(description: string, language: Language) {
  return description.replace(
    FENCE_PATTERN,
    (_fence, _tag: string, code: string) =>
      `\`\`\`${language}\n${code.trimEnd()}\n\`\`\``,
  );
}

function isUsable(quiz: GeneratedQuiz, slug: string) {
  if (slug.length === 0) {
    return false;
  }

  const optionIds = new Set(quiz.options.map((option) => option.id));
  const fences = codeFences(quiz.description);
  const codeLines = fences.length === 1 ? countCodeLines(fences[0][2]) : 0;

  const optionsAreValid =
    optionIds.size === quiz.options.length &&
    optionIds.has(quiz.correctOptionId) &&
    quiz.options.every((option) => option.label.trim() !== "");

  const contentIsValid =
    quiz.prompt.trim().endsWith("?") &&
    fences.length === 1 &&
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
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
    rejected: v.number(),
  }),
  handler: async (ctx, request): Promise<GenerationResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError("Sign in to continue");
    }

    const user = await ctx.runQuery(internal.authz.userByAuthId, {
      authId: identity.subject,
    });
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

    const drafts = output.flatMap((quiz) => {
      const slug = slugify(quiz.slug);
      if (!isUsable(quiz, slug)) {
        return [];
      }

      return [
        {
          ...quiz,
          description: withLanguageTag(quiz.description, request.language),
          slug,
          topic: request.topic,
          difficulty: request.difficulty,
          language: request.language,
        },
      ];
    });

    const result = await ctx.runMutation(internal.drafts.insertDrafts, {
      drafts,
    });

    return { ...result, rejected: output.length - drafts.length };
  },
});
