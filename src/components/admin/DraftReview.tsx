import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { CheckIcon, InboxIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { RichText } from "@/components/quiz/RichText";
import { DIFFICULTY_LABEL, TOPIC_LABEL } from "@/lib/quiz-labels";
import { cn } from "@/lib/utils";

type DraftCardProps = {
  draft: Doc<"quizDrafts">;
  pending: boolean;
  disabled: boolean;
  onPublish: () => void;
  onDiscard: () => void;
};

function DraftCard({
  draft,
  pending,
  disabled,
  onPublish,
  onDiscard,
}: DraftCardProps) {
  return (
    <article className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TOPIC_LABEL[draft.topic]}</Badge>
        <Badge variant="outline">{DIFFICULTY_LABEL[draft.difficulty]}</Badge>
        <span className="text-muted-foreground ml-auto font-mono text-xs">
          {draft.slug}
        </span>
      </header>

      <h3 className="text-sm font-medium">{draft.prompt}</h3>

      <div className="h-40">
        <RichText
          content={draft.description}
          className="border-border bg-card h-full overflow-auto rounded-lg border p-3"
        />
      </div>

      <ul className="flex flex-col gap-1.5">
        {draft.options.map((option) => {
          const correct = option.id === draft.correctOptionId;

          return (
            <li
              key={option.id}
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                correct ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <span className="font-semibold uppercase">{option.id}</span>
              <span>{option.label}</span>
              {correct && (
                <CheckIcon className="text-primary ml-auto size-4 shrink-0" />
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground text-sm">{draft.explanation}</p>

      <div className="flex items-center gap-2">
        <Button onClick={onPublish} disabled={disabled}>
          {pending && <Spinner />}
          Publish
        </Button>
        <Button variant="destructive" onClick={onDiscard} disabled={disabled}>
          Discard
        </Button>
      </div>
    </article>
  );
}

export function DraftReview() {
  const drafts = useQuery(api.drafts.listDrafts);
  const publishDraft = useMutation(api.drafts.publishDraft);
  const discardDraft = useMutation(api.drafts.discardDraft);
  const [pendingId, setPendingId] = useState<Id<"quizDrafts"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(draftId: Id<"quizDrafts">, action: () => Promise<unknown>) {
    setPendingId(draftId);
    setError(null);

    void action()
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Something went wrong.",
        ),
      )
      .finally(() => setPendingId(null));
  }

  if (drafts === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium">Drafts ({drafts.length})</h2>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {drafts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No drafts waiting</EmptyTitle>
            <EmptyDescription>
              Generated quizzes show up here for review.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        drafts.map((draft) => (
          <DraftCard
            key={draft._id}
            draft={draft}
            pending={pendingId === draft._id}
            disabled={pendingId !== null}
            onPublish={() =>
              run(draft._id, () => publishDraft({ draftId: draft._id }))
            }
            onDiscard={() =>
              run(draft._id, () => discardDraft({ draftId: draft._id }))
            }
          />
        ))
      )}
    </section>
  );
}
