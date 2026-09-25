import { useId, useState } from "react";
import { CopyIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/quiz/RichText";
import {
  DIFFICULTY_LABEL,
  LANGUAGE_LABEL,
  TOPIC_LABEL,
} from "@/lib/quiz-labels";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_LETTERS,
  quizDraftProblem,
  type QuizDraft,
  type QuizDifficulty,
  type QuizLanguage,
  type QuizTopic,
} from "@/lib/quiz-draft";
import { cn } from "@/lib/utils";

type QuizDraftFieldsProps = {
  index: number;
  draft: QuizDraft;
  disabled: boolean;
  showProblems: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<QuizDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
};

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60";

export function QuizDraftFields({
  index,
  draft,
  disabled,
  showProblems,
  canRemove,
  onChange,
  onRemove,
  onDuplicate,
}: QuizDraftFieldsProps) {
  const [preview, setPreview] = useState(false);
  const descriptionId = useId();
  const problem = showProblems ? quizDraftProblem(draft) : null;

  function updateOption(optionIndex: number, label: string) {
    onChange({
      options: draft.options.map((current, at) =>
        at === optionIndex ? label : current,
      ),
    });
  }

  function removeOption(optionIndex: number) {
    const options = draft.options.filter((_, at) => at !== optionIndex);
    let correctIndex = draft.correctIndex;

    if (correctIndex === optionIndex) {
      correctIndex = null;
    } else if (correctIndex !== null && optionIndex < correctIndex) {
      correctIndex -= 1;
    }

    onChange({ options, correctIndex });
  }

  return (
    <section className="border-border flex flex-col gap-4 rounded-xl border p-4">
      <header className="flex items-center gap-3">
        <h2 className="text-sm font-medium">Quiz {index + 1}</h2>
        {problem && <p className="text-destructive text-xs">{problem}</p>}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onDuplicate}
          >
            <CopyIcon />
            Duplicate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove quiz ${index + 1}`}
            disabled={disabled || !canRemove}
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </header>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Statement</span>
        <input
          className={cn(fieldClass, "h-9")}
          value={draft.prompt}
          placeholder="What is wrong with this code?"
          disabled={disabled}
          onChange={(event) => onChange({ prompt: event.target.value })}
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <label className="text-muted-foreground" htmlFor={descriptionId}>
            Description
          </label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={() => setPreview((current) => !current)}
          >
            {preview ? "Write" : "Preview"}
          </Button>
        </div>
        {preview ? (
          <RichText
            content={draft.description}
            language={draft.language}
            className="border-border bg-card min-h-32 rounded-lg border p-3"
          />
        ) : (
          <textarea
            id={descriptionId}
            className={cn(fieldClass, "min-h-32 py-2 font-mono text-xs")}
            value={draft.description}
            placeholder={
              "Explain the problem in markdown. Fenced code blocks are highlighted:\n\n```" +
              draft.language +
              "\nconst total = items.length;\n```"
            }
            disabled={disabled}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Language</span>
          <select
            className={cn(fieldClass, "h-9")}
            value={draft.language}
            disabled={disabled}
            onChange={(event) =>
              onChange({ language: event.target.value as QuizLanguage })
            }
          >
            {Object.entries(LANGUAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Topic</span>
          <select
            className={cn(fieldClass, "h-9")}
            value={draft.topic}
            disabled={disabled}
            onChange={(event) =>
              onChange({ topic: event.target.value as QuizTopic })
            }
          >
            {Object.entries(TOPIC_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Difficulty</span>
          <select
            className={cn(fieldClass, "h-9")}
            value={draft.difficulty}
            disabled={disabled}
            onChange={(event) =>
              onChange({ difficulty: event.target.value as QuizDifficulty })
            }
          >
            {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">Options</span>
        <ul className="flex flex-col gap-2">
          {draft.options.map((label, optionIndex) => {
            const letter = OPTION_LETTERS[optionIndex];

            return (
              <li key={letter} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${draft.key}`}
                  className="accent-primary size-4 shrink-0"
                  aria-label={`Mark option ${letter.toUpperCase()} as correct`}
                  checked={draft.correctIndex === optionIndex}
                  disabled={disabled}
                  onChange={() => onChange({ correctIndex: optionIndex })}
                />
                <span className="text-muted-foreground w-4 shrink-0 text-xs font-semibold uppercase">
                  {letter}
                </span>
                <input
                  className={cn(fieldClass, "h-9")}
                  value={label}
                  placeholder={`Option ${letter.toUpperCase()}`}
                  aria-label={`Option ${letter.toUpperCase()}`}
                  disabled={disabled}
                  onChange={(event) =>
                    updateOption(optionIndex, event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove option ${letter.toUpperCase()}`}
                  disabled={disabled || draft.options.length <= MIN_OPTIONS}
                  onClick={() => removeOption(optionIndex)}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
        {draft.options.length < MAX_OPTIONS && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ options: [...draft.options, ""] })}
            >
              <PlusIcon />
              Add option
            </Button>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Explanation</span>
        <textarea
          className={cn(fieldClass, "min-h-20 py-2")}
          value={draft.explanation}
          placeholder="Why the correct option is right."
          disabled={disabled}
          onChange={(event) => onChange({ explanation: event.target.value })}
        />
      </label>
    </section>
  );
}
