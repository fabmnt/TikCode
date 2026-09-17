import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Mode = "signIn" | "signUp";

function describeError(cause: unknown, mode: Mode) {
  const message = cause instanceof Error ? cause.message : "";

  if (
    message.includes("InvalidSecret") ||
    message.includes("InvalidPassword")
  ) {
    return "Wrong email or password.";
  }
  if (message.includes("TooManyFailedAttempts")) {
    return "Too many attempts. Try again later.";
  }
  if (mode === "signUp" && message.includes("already")) {
    return "An account with this email already exists.";
  }

  return mode === "signUp"
    ? "Could not create the account."
    : "Could not sign in.";
}

export function AdminSignIn() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>("signIn");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldClass =
    "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Admin</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "signIn"
            ? "Sign in to manage quiz generation."
            : "The first account created becomes the admin."}
        </p>
      </header>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setPending(true);
          setError(null);

          void signIn("password", formData)
            .catch((cause: unknown) => setError(describeError(cause, mode)))
            .finally(() => setPending(false));
        }}
      >
        <input type="hidden" name="flow" value={mode} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Email</span>
          <input
            className={fieldClass}
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Password</span>
          <input
            className={fieldClass}
            name="password"
            type="password"
            autoComplete={
              mode === "signIn" ? "current-password" : "new-password"
            }
            minLength={8}
            required
          />
        </label>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {mode === "signIn" ? "Sign in" : "Create account"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {mode === "signIn" ? "Sign up instead" : "Sign in instead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
