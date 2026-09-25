import { useState } from "react";
import { useAction } from "convex/react";
import { SparklesIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { QuizDraftFields } from "@/components/create/QuizDraftFields";
import { DIFFICULTY_LABEL, TOPIC_LABEL } from "@/lib/quiz-labels";
import {
  MAX_QUIZZES_PER_BATCH,
  draftFromGeneratedQuiz,
  emptyQuizDraft,
  isUntouchedDraft,
  quizDraftProblem,
  toQuizInput,
  type QuizDraft,
  type QuizInput,
} from "@/lib/quiz-draft";
import { cn } from "@/lib/utils";

type Topic = keyof typeof TOPIC_LABEL;
type Difficulty = keyof typeof DIFFICULTY_LABEL;

const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
const MAX_GENERATED = 5;

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60";

type GroupQuizComposerProps = {
  submitLabel: string;
  disabled: boolean;
  error: string | null;
  onSubmit: (quizzes: QuizInput[]) => void;
};

// Drafts are local until the parent saves them, so generated quizzes can be
// edited field by field before they reach a group.
export function GroupQuizComposer({
  submitLabel,
  disabled,
  error,
  onSubmit,
}: GroupQuizComposerProps) {
  const generate = useAction(api.generate.generateGroupQuizzes);
  const [drafts, setDrafts] = useState<QuizDraft[]>(() => [emptyQuizDraft()]);
  const [showProblems, setShowProblems] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [topic, setTopic] = useState<Topic>("code-smell");
  const [difficulties, setDifficulties] = useState<Difficulty[]>([
    "intermediate",
  ]);
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isComplete = drafts.every((draft) => quizDraftProblem(draft) === null);
  const reachedLimit = drafts.length >= MAX_QUIZZES_PER_BATCH;

  function updateDraft(key: string, patch: Partial<QuizDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function addDraft() {
    setDrafts((current) => [...current, emptyQuizDraft()]);
  }

  function duplicateDraft(key: string) {
    setDrafts((current) => {
      if (current.length >= MAX_QUIZZES_PER_BATCH) {
        return current;
      }

      return current.flatMap((draft) =>
        draft.key === key
          ? [draft, { ...draft, key: crypto.randomUUID() }]
          : [draft],
      );
    });
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  function toggleDifficulty(level: Difficulty) {
    setDifficulties((current) =>
      current.includes(level)
        ? current.filter((entry) => entry !== level)
        : [...current, level],
    );
  }

  function generateQuizzes() {
    setGenerateMessage(null);
    setGenerateError(null);

    if (prompt.trim() === "") {
      setGenerateError("Describe what the quizzes should cover.");
      return;
    }
    if (difficulties.length === 0) {
      setGenerateError("Pick at least one difficulty.");
      return;
    }

    // Untouched starter drafts give way to the generated quizzes, so the
    // creator does not have to delete a blank quiz before saving.
    const kept = drafts.filter((draft) => !isUntouchedDraft(draft));
    const room = MAX_QUIZZES_PER_BATCH - kept.length;
    if (room <= 0) {
      setGenerateError(
        `A group can take up to ${MAX_QUIZZES_PER_BATCH} quizzes at a time. Save these first.`,
      );
      return;
    }

    setGenerating(true);
    void generate({
      prompt: prompt.trim(),
      topic,
      difficulties,
      count: Math.min(count, room),
    })
      .then((result) => {
        const generated = result.quizzes
          .map(draftFromGeneratedQuiz)
          .slice(0, room);
        setDrafts((current) => {
          const remaining = current.filter((draft) => !isUntouchedDraft(draft));
          const next = [...remaining, ...generated];

          return next.length > 0 ? next : [emptyQuizDraft()];
        });

        const short =
          generated.length < result.requested
            ? ` ${result.requested - generated.length} of ${result.requested} could not be generated.`
            : "";
        const searchHint = result.searched
          ? ""
          : " The web search step failed, so these come from the model's own knowledge.";
        setGenerateMessage(
          generated.length === 0
            ? `No quizzes could be generated. Try a more specific prompt.${searchHint}`
            : generated.length === 1
              ? `1 quiz generated. Review and edit it below.${short}${searchHint}`
              : `${generated.length} quizzes generated. Review and edit them below.${short}${searchHint}`,
        );
      })
      .catch((cause: unknown) =>
        setGenerateError(
          cause instanceof Error ? cause.message : "Generation failed.",
        ),
      )
      .finally(() => setGenerating(false));
  }

  function submit() {
    setShowProblems(true);
    if (!isComplete) {
      return;
    }

    onSubmit(drafts.map(toQuizInput));
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="border-border flex flex-col gap-4 rounded-xl border p-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Generate with AI</h2>
          <p className="text-muted-foreground text-sm">
            A free model searches the web, then returns drafts you can edit
            before saving.
          </p>
        </header>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Prompt</span>
          <textarea
            className={cn(fieldClass, "min-h-20 py-2")}
            value={prompt}
            placeholder="What should the quizzes cover? For example: common mistakes with React data fetching."
            disabled={generating}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Topic</span>
            <select
              className={cn(fieldClass, "h-9")}
              value={topic}
              disabled={generating}
              onChange={(event) => setTopic(event.target.value as Topic)}
            >
              {Object.entries(TOPIC_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">How many</span>
            <input
              className={cn(fieldClass, "h-9")}
              type="number"
              min={1}
              max={MAX_GENERATED}
              value={count}
              disabled={generating}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground mb-1.5 text-sm">
            Difficulties
          </legend>
          <div className="flex flex-wrap gap-4">
            {DIFFICULTIES.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary size-4"
                  checked={difficulties.includes(level)}
                  disabled={generating}
                  onChange={() => toggleDifficulty(level)}
                />
                {DIFFICULTY_LABEL[level]}
              </label>
            ))}
          </div>
        </fieldset>

        {generateMessage && <p className="text-sm">{generateMessage}</p>}
        {generateError && (
          <p className="text-destructive text-sm">{generateError}</p>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={generating || disabled}
            onClick={generateQuizzes}
          >
            {generating ? <Spinner /> : <SparklesIcon />}
            {generating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </section>

      {drafts.map((draft, index) => (
        <QuizDraftFields
          key={draft.key}
          index={index}
          draft={draft}
          disabled={disabled}
          showProblems={showProblems}
          canRemove={drafts.length > 1}
          canDuplicate={!reachedLimit}
          onChange={(patch) => updateDraft(draft.key, patch)}
          onRemove={() => removeDraft(draft.key)}
          onDuplicate={() => duplicateDraft(draft.key)}
        />
      ))}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="border-border bg-background sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || reachedLimit}
          onClick={addDraft}
        >
          Add quiz
        </Button>
        <Button type="button" disabled={disabled} onClick={submit}>
          {disabled && <Spinner />}
          {disabled ? "Saving..." : submitLabel}
        </Button>
        <span className="text-muted-foreground text-xs">
          {drafts.length} of {MAX_QUIZZES_PER_BATCH} in this batch
        </span>
      </div>
    </div>
  );
}
