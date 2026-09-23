import { GoogleSignInButton } from "@/components/auth/GoogleAuthButton";

export function AdminSignIn() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-medium">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Sign in with Google to manage quiz generation.
        </p>
      </header>
      <GoogleSignInButton align="start" />
    </div>
  );
}
