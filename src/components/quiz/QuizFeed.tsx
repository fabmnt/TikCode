import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { CircleHelpIcon, PlusIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { getOrCreateClientId } from "@/lib/client-id";
import { FEED_PAGE_SIZE, isNearby, withStats } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FeedAccountButton } from "@/components/auth/FeedAccountButton";
import { QuizCard } from "@/components/quiz/QuizCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function FeedHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between px-3">
      <a
        href="/create"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        <PlusIcon />
        Create
      </a>
      <FeedAccountButton />
    </header>
  );
}

function QuizFeedView() {
  const [clientId] = useState(getOrCreateClientId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingByQuiz, setPendingByQuiz] = useState<Record<string, string>>(
    {},
  );
  const { results, status, isLoading, loadMore } = usePaginatedQuery(
    api.quizzes.listFeed,
    { clientId },
    { initialNumItems: FEED_PAGE_SIZE },
  );
  const vote = useMutation(api.quizzes.vote);

  const prevQuiz = results[activeIndex - 1];
  const currentQuiz = results[activeIndex];
  const nextQuiz = results[activeIndex + 1];
  const prevStats = useQuery(
    api.quizzes.getStats,
    prevQuiz ? { quizId: prevQuiz._id, clientId } : "skip",
  );
  const currentStats = useQuery(
    api.quizzes.getStats,
    currentQuiz ? { quizId: currentQuiz._id, clientId } : "skip",
  );
  const nextStats = useQuery(
    api.quizzes.getStats,
    nextQuiz ? { quizId: nextQuiz._id, clientId } : "skip",
  );

  if (isLoading && results.length === 0) {
    return (
      <div className="flex h-dvh flex-col">
        <FeedHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-5/6" />
          <Skeleton className="min-h-0 flex-1" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex h-dvh flex-col">
        <FeedHeader />
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleHelpIcon />
              </EmptyMedia>
              <EmptyTitle>No quizzes yet</EmptyTitle>
              <EmptyDescription>
                Seed the database, then refresh this feed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <FeedHeader />
      <div
        className="min-h-0 flex-1 snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-y-contain scroll-smooth [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const el = event.currentTarget;
          const index = Math.round(el.scrollTop / el.clientHeight);
          setActiveIndex((current) => (current === index ? current : index));

          if (status === "CanLoadMore" && index >= results.length - 4) {
            loadMore(FEED_PAGE_SIZE);
          }
        }}
      >
        {results.map((quiz, index) => {
          let stats = undefined;
          if (index === activeIndex - 1) stats = prevStats;
          if (index === activeIndex) stats = currentStats;
          if (index === activeIndex + 1) stats = nextStats;

          return (
            <div
              key={quiz._id}
              className="h-[calc(100dvh-3rem)] snap-start snap-always"
            >
              {isNearby(index, activeIndex) ? (
                <QuizCard
                  quiz={withStats(quiz, stats)}
                  pendingOptionId={pendingByQuiz[quiz._id] ?? null}
                  onAnswer={(optionId) => {
                    if (quiz.answered || pendingByQuiz[quiz._id]) {
                      return;
                    }

                    setPendingByQuiz((current) => ({
                      ...current,
                      [quiz._id]: optionId,
                    }));

                    void vote({
                      quizId: quiz._id,
                      clientId,
                      optionId,
                    }).finally(() => {
                      setPendingByQuiz((current) => {
                        const next = { ...current };
                        delete next[quiz._id];
                        return next;
                      });
                    });
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default withConvexProvider(QuizFeedView);
