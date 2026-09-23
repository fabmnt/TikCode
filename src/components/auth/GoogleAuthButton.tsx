import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function GoogleSignInButton({
  align = "end",
}: {
  align?: "start" | "end";
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className={
        align === "start"
          ? "relative flex flex-col items-start"
          : "relative flex flex-col items-end"
      }
    >
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void authClient.signIn
            .social({
              provider: "google",
              callbackURL: window.location.href,
              errorCallbackURL: window.location.href,
            })
            .catch(() => {
              setPending(false);
              setError("Could not start Google sign-in.");
            });
        }}
      >
        {pending && <Spinner />}
        Sign in with Google
      </Button>
      {error && (
        <p className="text-destructive absolute top-full z-10 mt-1 text-sm whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void authClient.signOut().finally(() => setPending(false));
      }}
    >
      {pending && <Spinner />}
      Sign out
    </Button>
  );
}
