import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type QuizInput = FunctionArgs<
  typeof api.quizzes.createQuizzes
>["quizzes"][number];

export type QuizLanguage = QuizInput["language"];
export type QuizTopic = QuizInput["topic"];
export type QuizDifficulty = QuizInput["difficulty"];

export type QuizDraft = {
  key: string;
  prompt: string;
  description: string;
  language: QuizLanguage;
  topic: QuizTopic;
  difficulty: QuizDifficulty;
  options: string[];
  correctIndex: number | null;
  explanation: string;
};

export const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"];
export const MAX_OPTIONS = OPTION_LETTERS.length;
export const MIN_OPTIONS = 2;
export const MAX_QUIZZES_PER_BATCH = 10;

const DEFAULT_OPTION_COUNT = 4;

export function emptyQuizDraft(): QuizDraft {
  return {
    key: crypto.randomUUID(),
    prompt: "",
    description: "",
    language: "typescript",
    topic: "code-smell",
    difficulty: "intermediate",
    options: Array.from({ length: DEFAULT_OPTION_COUNT }, () => ""),
    correctIndex: null,
    explanation: "",
  };
}

export function quizDraftProblem(draft: QuizDraft): string | null {
  if (draft.prompt.trim() === "") {
    return "Add a statement.";
  }
  if (draft.description.trim() === "") {
    return "Add a description.";
  }
  if (draft.options.some((label) => label.trim() === "")) {
    return "Fill in every option.";
  }
  if (draft.correctIndex === null) {
    return "Mark the correct option.";
  }
  if (draft.explanation.trim() === "") {
    return "Add an explanation.";
  }

  return null;
}

export function toQuizInput(draft: QuizDraft): QuizInput {
  return {
    prompt: draft.prompt.trim(),
    description: draft.description.trim(),
    language: draft.language,
    topic: draft.topic,
    difficulty: draft.difficulty,
    options: draft.options.map((label, index) => ({
      id: OPTION_LETTERS[index],
      label: label.trim(),
    })),
    correctOptionId:
      draft.correctIndex === null ? "" : OPTION_LETTERS[draft.correctIndex],
    explanation: draft.explanation.trim(),
  };
}
