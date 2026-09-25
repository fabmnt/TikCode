import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { UsersIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { GoogleSignInButton } from "@/components/auth/GoogleAuthButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { memberLabel, quizLabel, type GroupSummary } from "@/lib/group";

function GroupRow({ group }: { group: GroupSummary }) {
  return (
    <a
      href={`/g/${group.joinToken}`}
      className="border-border hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4 transition-colors"
    >
      <UsersIcon className="text-muted-foreground size-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{group.name}</span>
        <span className="text-muted-foreground block text-xs">
          {quizLabel(group.quizCount)} · {memberLabel(group.memberCount)}
        </span>
      </span>
      {group.isCreator && <Badge variant="outline">Owner</Badge>}
    </a>
  );
}

function LoadingGroups() {
  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function GroupsList() {
  const groups = useQuery(api.groups.listMyGroups);

  if (groups === undefined) {
    return <LoadingGroups />;
  }

  if (groups.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No groups yet</EmptyTitle>
            <EmptyDescription>
              Create a group, add quizzes, then share its join link.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const created = groups.filter((group) => group.isCreator);
  const joined = groups.filter((group) => !group.isCreator);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {created.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-xs font-medium uppercase">
            Created by you
          </h2>
          {created.map((group) => (
            <GroupRow key={group._id} group={group} />
          ))}
        </section>
      )}

      {joined.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-xs font-medium uppercase">
            Joined
          </h2>
          {joined.map((group) => (
            <GroupRow key={group._id} group={group} />
          ))}
        </section>
      )}
    </div>
  );
}

function GroupsViewView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AuthLoading>
          <LoadingGroups />
        </AuthLoading>
        <Unauthenticated>
          <div className="flex flex-col gap-4 px-4 py-6">
            <p className="text-muted-foreground text-sm">
              Sign in with Google to create quiz groups and to join the groups
              you are invited to.
            </p>
            <GoogleSignInButton align="start" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <GroupsList />
        </Authenticated>
      </div>
      <BottomNav active="groups" />
    </div>
  );
}

export default withConvexProvider(GroupsViewView);
