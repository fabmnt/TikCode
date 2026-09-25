import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { useSignedIn } from "@/lib/use-signed-in";
import { GoogleSignInButton } from "@/components/auth/GoogleAuthButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { GroupQuizCard } from "@/components/groups/GroupQuizCard";
import { GroupQuizComposer } from "@/components/groups/GroupQuizComposer";
import { GroupScoreboard } from "@/components/groups/GroupScoreboard";
import {
  joinLink,
  memberLabel,
  quizLabel,
  type GroupProgress,
  type GroupQuizView,
  type GroupViewData,
} from "@/lib/group";

type PendingAnswer = { quizId: GroupQuizView["_id"]; optionId: string };

function GroupHeader({ group }: { group: GroupViewData }) {
  const [copied, setCopied] = useState(false);
  const link = joinLink(group.joinToken);

  return (
    <header className="flex flex-col gap-2">
      <a
        href="/groups"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
      >
        <ArrowLeftIcon className="size-3.5" />
        Groups
      </a>
      <h1 className="text-lg font-medium">{group.name}</h1>
      <p className="text-muted-foreground text-sm">
        {group.creatorName ?? group.creatorUsername ?? "A member"} ·{" "}
        {quizLabel(group.quizCount)} · {memberLabel(group.memberCount)}
      </p>
      {group.isCreator && (
        <div className="border-border bg-card mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs">
            {link}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(link)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}
    </header>
  );
}

function ProgressCard({ progress }: { progress: GroupProgress }) {
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.answered / progress.total) * 100);

  return (
    <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Your progress</span>
        <span className="text-muted-foreground">
          {progress.answered} of {progress.total} answered · {progress.correct}{" "}
          correct
        </span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

function SignInCard({ name }: { name: string }) {
  return (
    <section className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-sm font-medium">Sign in to join</h2>
      <p className="text-muted-foreground text-sm">
        {name} is a private group. Sign in with Google to answer its quizzes and
        get a place on the scoreboard.
      </p>
      <GoogleSignInButton align="start" />
    </section>
  );
}

function JoinCard({
  group,
  pending,
  error,
  onJoin,
}: {
  group: GroupViewData;
  pending: boolean;
  error: string | null;
  onJoin: () => void;
}) {
  return (
    <section className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-sm font-medium">Join this group</h2>
      <p className="text-muted-foreground text-sm">
        Inside: {quizLabel(group.quizCount)}. Join to answer them and see how
        everyone scored.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div>
        <Button type="button" disabled={pending} onClick={onJoin}>
          {pending && <Spinner />}
          {pending ? "Joining..." : "Join group"}
        </Button>
      </div>
    </section>
  );
}

function AddQuizzes({
  groupId,
  onSaved,
}: {
  groupId: GroupViewData["_id"];
  onSaved: (count: number) => void;
}) {
  const addGroupQuizzes = useMutation(api.groups.addGroupQuizzes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="border-border flex flex-col gap-4 rounded-xl border p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Add quizzes</h2>
        <p className="text-muted-foreground text-sm">
          Members see new quizzes as soon as they are saved.
        </p>
      </header>
      <GroupQuizComposer
        submitLabel="Add to group"
        disabled={pending}
        error={error}
        onSubmit={(quizzes) => {
          setPending(true);
          setError(null);

          void addGroupQuizzes({ groupId, quizzes })
            .then((result) => onSaved(result.created))
            .catch((cause: unknown) =>
              setError(
                cause instanceof Error
                  ? cause.message
                  : "The quizzes could not be added.",
              ),
            )
            .finally(() => setPending(false));
        }}
      />
    </section>
  );
}

function GroupLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function GroupNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Group not found</EmptyTitle>
          <EmptyDescription>
            This join link is not valid anymore. Ask the creator for a new one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function GroupViewView({ token }: { token: string }) {
  const group = useQuery(api.groups.getGroupByToken, { token });
  const signedIn = useSignedIn();
  const join = useMutation(api.groups.joinGroup);
  const answer = useMutation(api.groups.answerGroupQuiz);
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(
    null,
  );
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRun, setAddRun] = useState(0);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  function joinGroup() {
    setJoinPending(true);
    setJoinError(null);

    void join({ token })
      .catch((cause: unknown) =>
        setJoinError(
          cause instanceof Error
            ? cause.message
            : "This group could not be joined.",
        ),
      )
      .finally(() => setJoinPending(false));
  }

  function answerQuiz(quizId: GroupQuizView["_id"], optionId: string) {
    setPendingAnswer({ quizId, optionId });
    setAnswerError(null);

    void answer({ quizId, optionId })
      .catch((cause: unknown) =>
        setAnswerError(
          cause instanceof Error
            ? cause.message
            : "Your answer could not be saved.",
        ),
      )
      .finally(() => setPendingAnswer(null));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {group === undefined ? (
          <GroupLoading />
        ) : group === null ? (
          <GroupNotFound />
        ) : (
          <div className="flex flex-col gap-6 px-4 py-6">
            <GroupHeader group={group} />

            {group.isMember ? (
              <>
                {group.progress.total > 0 && (
                  <ProgressCard progress={group.progress} />
                )}
                {answerError && (
                  <p className="text-destructive text-sm">{answerError}</p>
                )}

                {group.quizzes.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <UsersIcon />
                      </EmptyMedia>
                      <EmptyTitle>No quizzes yet</EmptyTitle>
                      <EmptyDescription>
                        {group.isCreator
                          ? "Write or generate the first quizzes below."
                          : "The creator has not added quizzes yet."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="flex flex-col gap-4">
                    {group.quizzes.map((quiz) => (
                      <GroupQuizCard
                        key={quiz._id}
                        quiz={quiz}
                        pendingOptionId={
                          pendingAnswer?.quizId === quiz._id
                            ? pendingAnswer.optionId
                            : null
                        }
                        onAnswer={(optionId) => answerQuiz(quiz._id, optionId)}
                      />
                    ))}
                  </div>
                )}

                {group.progress.total > 0 && !group.progress.completed && (
                  <p className="text-muted-foreground text-sm">
                    Finish {quizLabel(group.progress.total)} to unlock the
                    scoreboard.
                  </p>
                )}

                {group.scoreboard && (
                  <GroupScoreboard
                    entries={group.scoreboard}
                    progress={group.progress}
                  />
                )}

                {group.isCreator && (
                  <section className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddOpen((open) => !open)}
                      >
                        <PlusIcon />
                        {addOpen ? "Close" : "Add quizzes"}
                      </Button>
                      {addedCount !== null && (
                        <span className="text-muted-foreground text-xs">
                          {addedCount === 1
                            ? "1 quiz added."
                            : `${addedCount} quizzes added.`}
                        </span>
                      )}
                    </div>
                    {addOpen && (
                      <AddQuizzes
                        key={addRun}
                        groupId={group._id}
                        onSaved={(count) => {
                          setAddedCount(count);
                          setAddRun((run) => run + 1);
                        }}
                      />
                    )}
                  </section>
                )}
              </>
            ) : signedIn ? (
              <JoinCard
                group={group}
                pending={joinPending}
                error={joinError}
                onJoin={joinGroup}
              />
            ) : (
              <SignInCard name={group.name} />
            )}
          </div>
        )}
      </div>
      <BottomNav active="groups" />
    </div>
  );
}

export default withConvexProvider(GroupViewView);
