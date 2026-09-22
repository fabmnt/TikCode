import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuizOption } from "@/components/quiz/QuizOption";
import { CodeBlock } from "@/components/quiz/CodeBlock";
import {
  DIFFICULTY_LABEL,
  LANGUAGE_LABEL,
  TOPIC_LABEL,
} from "@/lib/quiz-labels";
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
        <div className="flex h-5 flex-nowrap items-center gap-2 overflow-hidden">
          <Badge variant="outline">{LANGUAGE_LABEL[quiz.language]}</Badge>
          {quiz.answered && (
            <>
              <Badge variant="outline">{TOPIC_LABEL[quiz.topic]}</Badge>
              <Badge variant="outline">
                {DIFFICULTY_LABEL[quiz.difficulty]}
              </Badge>
            </>
          )}
        </div>
        <h2 className="text-lg font-medium tracking-tight">{quiz.prompt}</h2>
      </header>

      <div className="relative min-h-0 flex-1">
        <CodeBlock code={quiz.code} language={quiz.language} />
        {quiz.answered && (
          <p className="border-border bg-card/95 text-muted-foreground absolute inset-x-0 bottom-0 rounded-b-lg px-3 py-2 text-sm md:inset-x-px md:bottom-px md:border-t">
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
