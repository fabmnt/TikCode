import { useAction } from "convex/react";
import { useState } from "react";
import { WandSparklesIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DIFFICULTY_LABEL,
  LANGUAGE_LABEL,
  TOPIC_LABEL,
} from "@/lib/quiz-labels";

type Topic = keyof typeof TOPIC_LABEL;
type Difficulty = keyof typeof DIFFICULTY_LABEL;
type Language = keyof typeof LANGUAGE_LABEL;

const MAX_COUNT = 5;

type Result = { inserted: number; skipped: number; rejected: number };

function describeResult({ inserted, skipped, rejected }: Result) {
  const parts = [`${inserted} draft${inserted === 1 ? "" : "s"} created`];

  if (skipped > 0) {
    parts.push(`${skipped} skipped because the slug already exists`);
  }
  if (rejected > 0) {
    parts.push(`${rejected} dropped for failing validation`);
  }

  return `${parts.join(", ")}.`;
}

export function GenerationForm() {
  const generate = useAction(api.generate.generateDrafts);
  const [topic, setTopic] = useState<Topic>("code-smell");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [language, setLanguage] = useState<Language>("typescript");
  const [count, setCount] = useState(3);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldClass =
    "h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <form
      className="border-border flex flex-col gap-4 rounded-xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setMessage(null);
        setError(null);

        void generate({ topic, difficulty, language, count })
          .then((result) => setMessage(describeResult(result)))
          .catch((cause: unknown) =>
            setError(
              cause instanceof Error ? cause.message : "Generation failed.",
            ),
          )
          .finally(() => setPending(false));
      }}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Generate drafts</h2>
        <p className="text-muted-foreground text-sm">
          New quizzes stay in the draft list until you publish them.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Topic</span>
          <select
            className={fieldClass}
            value={topic}
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
          <span className="text-muted-foreground">Difficulty</span>
          <select
            className={fieldClass}
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as Difficulty)
            }
          >
            {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Language</span>
          <select
            className={fieldClass}
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            {Object.entries(LANGUAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">How many</span>
          <input
            className={fieldClass}
            type="number"
            min={1}
            max={MAX_COUNT}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>
      </div>

      {message && <p className="text-sm">{message}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <WandSparklesIcon />}
          {pending ? "Generating..." : "Generate"}
        </Button>
      </div>
    </form>
  );
}
