import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { votePercent } from "@/lib/quiz-labels";
import { Spinner } from "@/components/ui/spinner";

type QuizOptionProps = {
  letter: string;
  label: string;
  count: number;
  totalVotes: number;
  answered: boolean;
  selected: boolean;
  correct: boolean;
  pending: boolean;
  disabled: boolean;
  onSelect: () => void;
};

export function QuizOption({
  letter,
  label,
  count,
  totalVotes,
  answered,
  selected,
  correct,
  pending,
  disabled,
  onSelect,
}: QuizOptionProps) {
  const percent = votePercent(count, totalVotes);
  const chosenCorrect = answered && selected && correct;
  const chosenWrong = answered && selected && !correct;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
        "border-border bg-muted focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
        !answered && "hover:bg-muted/80",
        chosenCorrect && "border-primary bg-primary/15",
        chosenWrong && "border-destructive bg-destructive/15",
        answered && "disabled:opacity-100",
        pending && "opacity-70",
      )}
    >
      {answered && (
        <span
          className={cn(
            "absolute inset-y-0 left-0",
            chosenCorrect && "bg-primary/20",
            chosenWrong && "bg-destructive/20",
            !selected && "bg-foreground/10",
          )}
          style={{ width: `${percent}%` }}
        />
      )}
      <span className="relative flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
              "border-border bg-background text-muted-foreground border",
              chosenCorrect &&
                "border-primary bg-primary text-primary-foreground",
              chosenWrong &&
                "border-destructive bg-destructive text-background",
            )}
          >
            {pending ? <Spinner /> : letter}
          </span>
          <span>{label}</span>
        </span>
        {answered && (
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 [&_svg]:size-4">
            {correct && (
              <CheckIcon
                className={chosenCorrect ? "text-primary" : undefined}
              />
            )}
            {chosenWrong && <XIcon className="text-destructive" />}
            <span>
              {percent}% · {count}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}
