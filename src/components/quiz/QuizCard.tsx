import { ChevronDownIcon } from "lucide-react";
import { QuizOption } from "@/components/quiz/QuizOption";
import { RichText } from "@/components/quiz/RichText";
import { cn } from "@/lib/utils";
import type { QuizView } from "@/lib/feed";

type QuizCardProps = {
  quiz: QuizView;
  pendingOptionId: string | null;
  onAnswer: (optionId: string) => void;
};

export function QuizCard({ quiz, pendingOptionId, onAnswer }: QuizCardProps) {
  const pending = pendingOptionId !== null;

  return (
    <article className="flex h-full flex-col gap-3 px-4 pt-5 pb-6">
      <header className="flex flex-col gap-2">
        {quiz.authorName && (
          <span className="text-muted-foreground truncate text-xs">
            by {quiz.authorName}
          </span>
        )}
        <h2 className="text-lg font-medium tracking-tight">{quiz.prompt}</h2>
      </header>

      <div className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-0 md:border">
        <RichText
          content={quiz.description}
          language={quiz.language}
          className="min-h-0 flex-1 overflow-auto p-3"
        />
        {quiz.answered && (
          <p className="border-border text-muted-foreground border-t px-3 py-2 text-sm">
            {quiz.explanation}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2" role="group" aria-label="Answers">
        {quiz.options.map((option) => {
          const count = quiz.answered ? (quiz.optionCounts[option.id] ?? 0) : 0;
          const selected = quiz.answered
            ? quiz.selectedOptionId === option.id
            : pendingOptionId === option.id;
          const correct = quiz.answered
            ? quiz.correctOptionId === option.id
            : false;

          return (
            <QuizOption
              key={option.id}
              letter={option.id.toUpperCase()}
              label={option.label}
              count={count}
              totalVotes={quiz.answered ? quiz.totalVotes : 0}
              answered={quiz.answered}
              selected={selected}
              correct={correct}
              pending={pendingOptionId === option.id}
              disabled={quiz.answered || pending}
              onSelect={() => onAnswer(option.id)}
            />
          );
        })}
      </div>

      <p
        className={cn(
          "text-muted-foreground flex items-center justify-center gap-1 text-xs [&_svg]:size-3.5",
          !quiz.answered && "invisible",
        )}
      >
        Scroll for the next quiz
        <ChevronDownIcon />
      </p>
    </article>
  );
}
