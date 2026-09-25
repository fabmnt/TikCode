import { useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { GoogleSignInButton } from "@/components/auth/GoogleAuthButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { GroupQuizComposer } from "@/components/groups/GroupQuizComposer";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuizInput } from "@/lib/quiz-draft";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60";

function CreateGroupForm() {
  const createGroup = useMutation(api.groups.createGroup);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(quizzes: QuizInput[]) {
    const cleanName = name.trim();
    if (cleanName === "") {
      setNameError("Give the group a name.");
      return;
    }

    setNameError(null);
    setError(null);
    setPending(true);

    void createGroup({ name: cleanName, quizzes })
      .then((result) => {
        window.location.href = `/g/${result.joinToken}`;
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "The group could not be saved.",
        ),
      )
      .finally(() => setPending(false));
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Group name</span>
        <input
          className={cn(fieldClass, "h-9")}
          value={name}
          placeholder="Frontend interview prep"
          disabled={pending}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(null);
          }}
        />
        {nameError && (
          <span className="text-destructive text-xs">{nameError}</span>
        )}
      </label>

      <GroupQuizComposer
        submitLabel="Create group"
        disabled={pending}
        error={error}
        onSubmit={save}
      />
    </div>
  );
}

function CreateGroupView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AuthLoading>
          <div className="flex flex-col gap-4 px-4 py-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </AuthLoading>
        <Unauthenticated>
          <div className="flex flex-col gap-4 px-4 py-6">
            <p className="text-muted-foreground text-sm">
              Sign in with Google to create a group and write quizzes for it.
            </p>
            <GoogleSignInButton align="start" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <CreateGroupForm />
        </Authenticated>
      </div>
      <BottomNav active="groups" />
    </div>
  );
}

export default withConvexProvider(CreateGroupView);
