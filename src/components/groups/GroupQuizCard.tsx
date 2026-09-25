import { CheckIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { RichText } from "@/components/quiz/RichText";
import { DIFFICULTY_LABEL, TOPIC_LABEL } from "@/lib/quiz-labels";
import { cn } from "@/lib/utils";
import type { GroupQuizView } from "@/lib/group";

type GroupQuizCardProps = {
  quiz: GroupQuizView;
  pendingOptionId: string | null;
  onAnswer: (optionId: string) => void;
};

export function GroupQuizCard({
  quiz,
  pendingOptionId,
  onAnswer,
}: GroupQuizCardProps) {
  const answer = quiz.answer;
  const pending = pendingOptionId !== null;

  return (
    <article className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TOPIC_LABEL[quiz.topic]}</Badge>
        <Badge variant="outline">{DIFFICULTY_LABEL[quiz.difficulty]}</Badge>
        {answer && (
          <span
            className={cn(
              "ml-auto text-xs font-medium",
              answer.correct ? "text-primary" : "text-destructive",
            )}
          >
            {answer.correct ? "Correct" : "Not correct"}
          </span>
        )}
      </header>

      <h3 className="text-base font-medium">{quiz.prompt}</h3>

      <div className="border-border bg-card max-h-72 overflow-auto rounded-lg border p-3">
        <RichText content={quiz.description} />
      </div>

      <ul className="flex flex-col gap-2">
        {quiz.options.map((option) => {
          const selected = answer !== null && answer.optionId === option.id;
          const isCorrect =
            answer !== null && answer.correctOptionId === option.id;
          const chosenWrong = selected && !isCorrect;

          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={answer !== null || pending}
                aria-pressed={selected}
                onClick={() => onAnswer(option.id)}
                className={cn(
                  "border-border bg-muted focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none",
                  answer === null && "hover:bg-muted/80",
                  selected &&
                    !isCorrect &&
                    "border-destructive bg-destructive/15",
                  isCorrect &&
                    answer !== null &&
                    "border-primary bg-primary/15",
                  pendingOptionId === option.id && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "border-border bg-background text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                    selected &&
                      !isCorrect &&
                      "border-destructive bg-destructive text-background",
                    isCorrect &&
                      answer !== null &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {pendingOptionId === option.id ? (
                    <Spinner />
                  ) : (
                    option.id.toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">{option.label}</span>
                {isCorrect && answer !== null && (
                  <CheckIcon className="text-primary size-4 shrink-0" />
                )}
                {chosenWrong && (
                  <XIcon className="text-destructive size-4 shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answer && (
        <p className="text-muted-foreground text-sm">{answer.explanation}</p>
      )}
    </article>
  );
}
