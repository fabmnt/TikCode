import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ShieldAlertIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { AdminSignIn } from "@/components/admin/AdminSignIn";
import { DraftReview } from "@/components/admin/DraftReview";
import { GenerationForm } from "@/components/admin/GenerationForm";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner />
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useAuthActions();

  return (
    <Button variant="outline" size="sm" onClick={() => void signOut()}>
      Sign out
    </Button>
  );
}

function AdminDashboard() {
  const user = useQuery(api.authz.currentUser);

  if (user === undefined) {
    return <Loading />;
  }

  if (user?.role !== "admin") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Admin access required</EmptyTitle>
          <EmptyDescription>
            {user?.email
              ? `${user.email} is not an admin account.`
              : "Sign in with an admin account."}
          </EmptyDescription>
        </EmptyHeader>
        <SignOutButton />
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium">Quizzes</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <GenerationForm />
      <DraftReview />
    </div>
  );
}

function AdminPanelView() {
  return (
    <>
      <AuthLoading>
        <Loading />
      </AuthLoading>
      <Unauthenticated>
        <AdminSignIn />
      </Unauthenticated>
      <Authenticated>
        <AdminDashboard />
      </Authenticated>
    </>
  );
}

export default withConvexProvider(AdminPanelView);
