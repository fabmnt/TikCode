import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export const FEED_PAGE_SIZE = 10;
export const FEED_WINDOW_RADIUS = 1;

export type FeedQuiz = FunctionReturnType<
  typeof api.quizzes.listFeed
>["page"][number];
export type QuizStats = FunctionReturnType<typeof api.quizzes.getStats>;

export type QuizView = FeedQuiz & {
  optionCounts: Record<string, number>;
  totalVotes: number;
};

export function withStats(
  quiz: FeedQuiz,
  stats: QuizStats | undefined,
): QuizView {
  if (!quiz.answered || !stats?.answered) {
    return { ...quiz, optionCounts: {}, totalVotes: 0 };
  }

  return {
    ...quiz,
    optionCounts: stats.optionCounts,
    totalVotes: stats.totalVotes,
  };
}

export function isNearby(index: number, activeIndex: number) {
  return Math.abs(index - activeIndex) <= FEED_WINDOW_RADIUS;
}
