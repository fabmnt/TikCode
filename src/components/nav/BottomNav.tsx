import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  HouseIcon,
  LogInIcon,
  PlusIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useSignedIn } from "@/lib/use-signed-in";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export type NavTab = "feed" | "groups" | "create" | "profile";

const TAB_CLASS =
  "flex h-12 flex-1 items-center justify-center gap-1 text-[0.7rem] font-medium";

function TabLink({
  href,
  label,
  icon,
  active,
  showLabel = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  showLabel?: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={showLabel ? undefined : label}
      aria-current={active ? "page" : undefined}
      className={cn(
        TAB_CLASS,
        "transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {showLabel && label}
      {icon}
    </a>
  );
}

function SignInTab() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Sign in"
        disabled={pending}
        className={cn(TAB_CLASS, "text-muted-foreground hover:text-foreground")}
        onClick={() => {
          setPending(true);
          setError(null);
          void authClient.signIn
            .social({
              provider: "google",
              callbackURL: window.location.href,
              errorCallbackURL: window.location.href,
            })
            .then((result) => {
              if (result.error) {
                setPending(false);
                setError("Could not start Google sign-in.");
              }
            })
            .catch(() => {
              setPending(false);
              setError("Could not start Google sign-in.");
            });
        }}
      >
        {pending ? (
          <Spinner className="size-5" />
        ) : (
          <LogInIcon className="size-5" />
        )}
      </button>
      {error && (
        <p className="text-destructive bg-background absolute inset-x-0 bottom-full py-2 text-center text-xs">
          {error}
        </p>
      )}
    </>
  );
}

function ProfileTab({ active }: { active: boolean }) {
  const user = useQuery(api.authz.currentUser);

  if (!user?.username) {
    return (
      <span aria-hidden className={cn(TAB_CLASS, "text-muted-foreground")}>
        <UserRoundIcon className="size-5" />
      </span>
    );
  }

  return (
    <TabLink
      href={`/${user.username}`}
      label="Profile"
      icon={<UserRoundIcon className="size-5" />}
      active={active}
    />
  );
}

export function BottomNav({ active }: { active: NavTab }) {
  const signedIn = useSignedIn();

  return (
    <nav
      aria-label="Main"
      className="border-border bg-background relative flex shrink-0 border-t pb-[env(safe-area-inset-bottom)]"
    >
      <TabLink
        href="/"
        label="Feed"
        icon={<HouseIcon className="size-5" />}
        active={active === "feed"}
      />
      <TabLink
        href="/groups"
        label="Groups"
        icon={<UsersIcon className="size-5" />}
        active={active === "groups"}
      />
      <TabLink
        href="/create"
        label="Create"
        icon={<PlusIcon className="size-5" />}
        active={active === "create"}
        showLabel
      />
      {signedIn ? <ProfileTab active={active === "profile"} /> : <SignInTab />}
    </nav>
  );
}
