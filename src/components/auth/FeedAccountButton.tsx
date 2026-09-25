import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { authClient } from "@/lib/auth-client";
import {
  GoogleSignInButton,
  SignOutButton,
} from "@/components/auth/GoogleAuthButton";

// Better Auth caches its last session lookup for cross-domain sign-in, so the
// header can pick the right control before the live check answers. `ott` marks
// the return trip from Google, when the session exists but has not reached that
// cache yet.
function signedInBeforeAuthResolves() {
  return (
    Boolean(authClient.getSessionData()?.session) ||
    new URLSearchParams(window.location.search).has("ott")
  );
}

export function FeedAccountButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [signedInOnLoad] = useState(signedInBeforeAuthResolves);
  const signedIn = isLoading ? signedInOnLoad : isAuthenticated;

  return signedIn ? <SignOutButton /> : <GoogleSignInButton />;
}
