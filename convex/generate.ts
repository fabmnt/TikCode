"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, type FlexibleSchema } from "ai";
import { ConvexError, v, type Infer } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { difficulty, quizOption, topic } from "./schema";
import { rateLimiter } from "./rateLimits";
import { slugify } from "./slug";

const ADMIN_MODEL_DEFAULT = "stealth/union-alpha";
// Group generation must stay on a free OpenRouter model. Free models have no
// native provider search, so the web search server tool falls back to Exa.
// Only models with structured output support work here; a model without it
// answers the schema request in prose.
const GROUP_MODEL_DEFAULT = "dots-studio/dots-3-note-preview:free";
const MAX_QUIZZES_PER_RUN = 5;
// Free models miss format rules often, so a short batch is retried with the
// rejection reasons attached. Each attempt is another model call, but no extra
// web search, and it stops as soon as the requested count is reached.
const MAX_GENERATION_ATTEMPTS = 3;
const OPTION_IDS = ["a", "b", "c", "d"] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const MIN_CODE_LINES = 5;
const MAX_CODE_LINES = 15;
const WEB_SEARCH_RESULTS = 5;
const FENCE_PATTERN = /^ {0,3}```([^\n`]*)\n([\s\S]*?)```/gm;

// Phrases that give the answer away in a description the player reads before
// answering.
const LEAK_PATTERNS = [
  /correct answer/i,
  /answer is/i,
  /is an antipattern/i,
  /not recommended/i,
  /is incorrect/i,
  /is a bug/i,
];

type Topic = Infer<typeof topic>;
type Difficulty = Infer<typeof difficulty>;

const TOPIC_BRIEF: Record<Topic, string> = {
  "code-smell": "a symptom in the code that points to a deeper design problem",
  antipattern:
    "a solution that looks reasonable but causes problems as the code grows",
  "bad-practice": "a construct that is unsafe or wrong in everyday code",
};

const SYSTEM_PROMPT = `You write multiple-choice quizzes that train developers to spot problems in code.

Every quiz must follow these rules:
- The description is markdown. It holds one fenced code block of ${MIN_CODE_LINES} to ${MAX_CODE_LINES} lines and, optionally, one or two short sentences that frame the code.
- Tag the fence with the language of the snippet, for example \`\`\`typescript. Use only one code block per quiz.
- The snippet looks like code from a real project and demonstrates exactly one problem that matches the requested topic.
- The question has one defensible answer and ends with a question mark. Never ask for opinions or preferences.
- Provide exactly 4 options, with ids "a", "b", "c" and "d". Exactly one option is correct.
- The wrong options are plausible, but clearly wrong once the reader parses the code.
- The explanation says why the correct option is right, in one or two sentences.
- Each quiz covers a different problem, and none of them repeat a quiz from the "already covered" list.`;

const RESEARCH_SYSTEM_PROMPT = `You research topics so quiz writers can ground their quizzes in current facts.

Search the web with the web_search tool, then answer with a short bullet list of concrete findings. Keep it under 150 words. Skip the search when the request is about timeless code problems rather than recent releases, versions, or events.`;

// Free models drift back to prose if the format is only stated once, so the
// group flow repeats the rules that reviews reject on.
const GROUP_FORMAT_PROMPT = `Format rules that reviews reject when broken:
- The code block is mandatory. A description without a fenced code block is invalid.
- The description must not name the problem, the fix, or the answer. It only frames the snippet ("The following function...").
- Never write phrases like "the correct answer is", "this is an antipattern", or "which is not recommended" in the description.`;

const quizCoreSchema = z.object({
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

const draftQuizSchema = quizCoreSchema.extend({
  slug: z
    .string()
    .describe(
      "kebab-case identifier of at most 5 words, e.g. ts-any-escape-hatch",
    ),
});

const groupQuizSchema = quizCoreSchema.extend({
  difficulty: z
    .enum(DIFFICULTIES)
    .describe("How hard this quiz is for the reader"),
});

type CoreQuiz = z.infer<typeof quizCoreSchema>;

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

// Why a generated quiz is not usable, or null when it is. The reason is fed
// back to the model when a batch comes back short.
function rejectionReason(quiz: CoreQuiz, rejectLeaks: boolean) {
  const optionIds = new Set(quiz.options.map((option) => option.id));
  const optionCount = quiz.options.length;
  const fences = codeFences(quiz.description);
  const codeLines = fences.length === 1 ? countCodeLines(fences[0][2]) : 0;

  if (fences.length === 0) {
    return "the description had no fenced code block";
  }
  if (fences.length > 1) {
    return "the description had more than one code block";
  }
  if (codeLines < MIN_CODE_LINES) {
    return `the code block had ${codeLines} lines instead of at least ${MIN_CODE_LINES}`;
  }
  if (codeLines > MAX_CODE_LINES) {
    return `the code block had ${codeLines} lines instead of at most ${MAX_CODE_LINES}`;
  }
  if (!quiz.prompt.trim().endsWith("?")) {
    return "the question did not end with a question mark";
  }
  if (optionIds.size !== optionCount || !optionIds.has(quiz.correctOptionId)) {
    return "the options were not one of each, with a correctOptionId that matches one of them";
  }
  if (quiz.options.some((option) => option.label.trim() === "")) {
    return "an option had no label";
  }
  if (quiz.explanation.trim() === "") {
    return "the explanation was empty";
  }
  if (
    rejectLeaks &&
    LEAK_PATTERNS.some((pattern) => pattern.test(quiz.description))
  ) {
    return "the description gave away the problem or the answer";
  }

  return null;
}

function isUsable(quiz: CoreQuiz) {
  return rejectionReason(quiz, false) === null;
}

function requireApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ConvexError(
      "OPENROUTER_API_KEY is not set on this Convex deployment. Set it with `npx convex env set OPENROUTER_API_KEY <key>`.",
    );
  }

  return apiKey;
}

function clampCount(count: number) {
  return Math.min(Math.max(Math.trunc(count), 1), MAX_QUIZZES_PER_RUN);
}

type GenerationOptions<T> = {
  apiKey: string;
  model: string;
  schema: FlexibleSchema<T>;
  system: string;
  prompt: string;
  count: number;
};

async function generateStructuredQuizzes<T>(options: GenerationOptions<T>) {
  const openrouter = createOpenRouter({ apiKey: options.apiKey });

  const { output } = await generateText({
    model: openrouter.chat(options.model),
    output: Output.array({
      element: options.schema,
      minItems: options.count,
      maxItems: options.count,
    }),
    system: options.system,
    prompt: options.prompt,
  });

  return output;
}

// Server tools and structured output do not mix reliably on free models: a
// request that carries the web search tool answers in prose instead of JSON.
// The research call uses the tool, then the structured call turns the findings
// into quizzes without any tools in the request.
async function researchTopic(options: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const openrouter = createOpenRouter({ apiKey: options.apiKey });

  const { text } = await generateText({
    model: openrouter.chat(options.model),
    tools: {
      web_search: openrouter.tools.webSearch({
        maxResults: WEB_SEARCH_RESULTS,
      }),
    },
    system: RESEARCH_SYSTEM_PROMPT,
    prompt: `Research this topic: ${options.prompt}`,
  });

  return text.trim();
}

function buildDraftPrompt(
  request: { topic: Topic; difficulty: Difficulty },
  count: number,
  existingSlugs: string[],
) {
  const lines = [
    `Write ${count} quizzes at ${request.difficulty} level.`,
    `Topic: ${request.topic}, meaning ${TOPIC_BRIEF[request.topic]}.`,
  ];

  if (existingSlugs.length > 0) {
    lines.push(
      `Already covered, do not repeat these slugs: ${existingSlugs.join(", ")}.`,
    );
  }

  return lines.join("\n");
}

function buildGroupPrompt(
  request: { prompt: string; topic: Topic; difficulties: Difficulty[] },
  count: number,
  findings: string,
  rejections: string[],
) {
  const difficultyLine =
    request.difficulties.length === 1
      ? `Difficulty: ${request.difficulties[0]} for every quiz.`
      : `Difficulty: spread the quizzes across ${request.difficulties.join(", ")}.`;
  const lines = [
    `Write ${count} quizzes about: ${request.prompt}`,
    difficultyLine,
    `Topic: ${request.topic}, meaning ${TOPIC_BRIEF[request.topic]}.`,
  ];

  if (findings !== "") {
    lines.push(`Findings from a web search you can use:\n${findings}`);
  }

  if (rejections.length > 0) {
    lines.push(
      `Previous quizzes were rejected because: ${[...new Set(rejections)].join("; ")}. Follow the format rules exactly this time.`,
    );
  }

  return lines.join("\n");
}

export const generateDrafts = action({
  args: {
    topic,
    difficulty,
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

    const count = clampCount(request.count);
    const existingSlugs = await ctx.runQuery(internal.drafts.existingSlugs);

    const output = await generateStructuredQuizzes({
      apiKey: requireApiKey(),
      model: process.env.OPENROUTER_MODEL ?? ADMIN_MODEL_DEFAULT,
      schema: draftQuizSchema,
      system: SYSTEM_PROMPT,
      prompt: buildDraftPrompt(request, count, existingSlugs),
      count,
    });

    const drafts = output.flatMap((quiz) => {
      const slug = slugify(quiz.slug);
      if (slug === "" || !isUsable(quiz)) {
        return [];
      }

      return [
        {
          ...quiz,
          slug,
          topic: request.topic,
          difficulty: request.difficulty,
        },
      ];
    });

    const result = await ctx.runMutation(internal.drafts.insertDrafts, {
      drafts,
    });

    return { ...result, rejected: output.length - drafts.length };
  },
});

// Returns the quizzes to the caller instead of storing them, so the group
// creator can review and edit every quiz before saving them to the group.
export const generateGroupQuizzes = action({
  args: {
    prompt: v.string(),
    topic,
    difficulties: v.array(difficulty),
    count: v.number(),
  },
  returns: v.object({
    quizzes: v.array(
      v.object({
        prompt: v.string(),
        description: v.string(),
        topic,
        difficulty,
        options: v.array(quizOption),
        correctOptionId: v.string(),
        explanation: v.string(),
      }),
    ),
    requested: v.number(),
    searched: v.boolean(),
  }),
  handler: async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError("Sign in to continue");
    }

    const user = await ctx.runQuery(internal.authz.userByAuthId, {
      authId: identity.subject,
    });
    if (!user) {
      throw new ConvexError("Sign in to continue");
    }

    const prompt = request.prompt.trim();
    if (prompt === "") {
      throw new ConvexError("Describe what the quizzes should cover.");
    }
    if (request.difficulties.length === 0) {
      throw new ConvexError("Pick at least one difficulty.");
    }

    // Check the deployment is configured before spending quota or money.
    const apiKey = requireApiKey();

    // Research spends real money, so each account has a small hourly budget.
    const quota = await rateLimiter.limit(ctx, "groupQuizGeneration", {
      key: String(user._id),
    });
    if (!quota.ok) {
      const minutes = Math.max(1, Math.ceil((quota.retryAfter ?? 0) / 60000));
      throw new ConvexError(
        `You have generated quizzes recently. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      );
    }

    const count = clampCount(request.count);
    const model = process.env.OPENROUTER_GROUP_MODEL ?? GROUP_MODEL_DEFAULT;

    let findings = "";
    let searched = true;
    try {
      findings = await researchTopic({ apiKey, model, prompt });
    } catch {
      // Free models are rate limited often. Quizzes written from the model's
      // own knowledge beat failing the whole request.
      searched = false;
    }

    const quizzes: Array<{
      prompt: string;
      description: string;
      topic: Topic;
      difficulty: Difficulty;
      options: Array<{ id: string; label: string }>;
      correctOptionId: string;
      explanation: string;
    }> = [];
    const rejections: string[] = [];

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const remaining = count - quizzes.length;
      if (remaining === 0) {
        break;
      }

      const output = await generateStructuredQuizzes({
        apiKey,
        model,
        schema: groupQuizSchema,
        system: `${SYSTEM_PROMPT}\n\n${GROUP_FORMAT_PROMPT}`,
        prompt: buildGroupPrompt(
          { ...request, prompt },
          remaining,
          findings,
          attempt === 1 ? [] : rejections,
        ),
        count: remaining,
      });

      for (const quiz of output) {
        const reason = rejectionReason(quiz, true);
        if (reason !== null) {
          rejections.push(reason);
          continue;
        }

        quizzes.push({
          prompt: quiz.prompt,
          description: quiz.description,
          topic: request.topic,
          difficulty: quiz.difficulty,
          options: quiz.options,
          correctOptionId: quiz.correctOptionId,
          explanation: quiz.explanation,
        });
      }
    }

    return { quizzes, requested: count, searched };
  },
});
