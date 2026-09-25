import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type QuizInput = FunctionArgs<
  typeof api.quizzes.createQuizzes
>["quizzes"][number];

export type GeneratedGroupQuiz = FunctionReturnType<
  typeof api.generate.generateGroupQuizzes
>["quizzes"][number];

export type QuizTopic = QuizInput["topic"];
export type QuizDifficulty = QuizInput["difficulty"];

export type QuizDraft = {
  key: string;
  prompt: string;
  description: string;
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
    topic: "code-smell",
    difficulty: "intermediate",
    options: Array.from({ length: DEFAULT_OPTION_COUNT }, () => ""),
    correctIndex: null,
    explanation: "",
  };
}

// Turns a generated quiz into an editable draft, so nothing reaches a group
// before the creator has reviewed it.
export function draftFromGeneratedQuiz(quiz: GeneratedGroupQuiz): QuizDraft {
  const correctIndex = quiz.options.findIndex(
    (option) => option.id === quiz.correctOptionId,
  );

  return {
    key: crypto.randomUUID(),
    prompt: quiz.prompt,
    description: quiz.description,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    options: quiz.options.map((option) => option.label),
    correctIndex: correctIndex === -1 ? null : correctIndex,
    explanation: quiz.explanation,
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
