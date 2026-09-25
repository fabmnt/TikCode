import { useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { PlusIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { GoogleSignInButton } from "@/components/auth/GoogleAuthButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CreateQuizzesPlaceholder } from "@/components/create/CreateQuizzesPlaceholder";
import { QuizDraftFields } from "@/components/create/QuizDraftFields";
import {
  MAX_QUIZZES_PER_BATCH,
  emptyQuizDraft,
  quizDraftProblem,
  toQuizInput,
  type QuizDraft,
} from "@/lib/quiz-draft";

function SignInPrompt() {
  return (
    <div className="flex min-h-full flex-col gap-6 px-4 py-6">
      <p className="text-muted-foreground text-sm">
        Sign in with Google to write your own quizzes.
      </p>
      <GoogleSignInButton align="start" />
    </div>
  );
}

function CreateQuizForm() {
  const createQuizzes = useMutation(api.quizzes.createQuizzes);
  const [drafts, setDrafts] = useState<QuizDraft[]>(() => [emptyQuizDraft()]);
  const [showProblems, setShowProblems] = useState(false);
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isComplete = drafts.every((draft) => quizDraftProblem(draft) === null);
  const reachedLimit = drafts.length >= MAX_QUIZZES_PER_BATCH;

  function updateDraft(key: string, patch: Partial<QuizDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
    setPublished(null);
  }

  function addDraft() {
    setDrafts((current) => [...current, emptyQuizDraft()]);
    setPublished(null);
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
    setPublished(null);
  }

  function removeDraft(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
    setPublished(null);
  }

  function publish() {
    setShowProblems(true);
    if (!isComplete) {
      return;
    }

    setPending(true);
    setError(null);
    setPublished(null);

    void createQuizzes({ quizzes: drafts.map(toQuizInput) })
      .then((result) => {
        setPublished(result.created);
        setDrafts([emptyQuizDraft()]);
        setShowProblems(false);
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "These quizzes could not be published.",
        ),
      )
      .finally(() => setPending(false));
  }

  return (
    <div className="flex min-h-full flex-col gap-6 px-4 py-6">
      {published !== null && (
        <p className="border-border bg-card rounded-lg border px-3 py-2 text-sm">
          {published === 1
            ? "1 quiz is live."
            : `${published} quizzes are live.`}{" "}
          <a href="/" className="text-primary underline underline-offset-4">
            See the feed
          </a>
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {drafts.map((draft, index) => (
        <QuizDraftFields
          key={draft.key}
          index={index}
          draft={draft}
          disabled={pending}
          showProblems={showProblems}
          canRemove={drafts.length > 1}
          canDuplicate={!reachedLimit}
          onChange={(patch) => updateDraft(draft.key, patch)}
          onRemove={() => removeDraft(draft.key)}
          onDuplicate={() => duplicateDraft(draft.key)}
        />
      ))}

      <div className="border-border bg-background sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending || reachedLimit}
          onClick={addDraft}
        >
          <PlusIcon />
          Add quiz
        </Button>
        <Button type="button" disabled={pending} onClick={publish}>
          {pending && <Spinner />}
          {pending ? "Publishing..." : "Publish quizzes"}
        </Button>
        <span className="text-muted-foreground text-xs">
          {drafts.length} of {MAX_QUIZZES_PER_BATCH} in this batch
        </span>
      </div>
    </div>
  );
}

function CreateQuizzesView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AuthLoading>
          <CreateQuizzesPlaceholder />
        </AuthLoading>
        <Unauthenticated>
          <SignInPrompt />
        </Unauthenticated>
        <Authenticated>
          <CreateQuizForm />
        </Authenticated>
      </div>
      <BottomNav active="create" />
    </div>
  );
}

export default withConvexProvider(CreateQuizzesView);
