import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { authClient } from "@/lib/auth-client";

// Better Auth caches its last session lookup for cross-domain sign-in, so a
// signed-in visitor can be recognized before the live check answers. `ott`
// marks the return trip from Google, when the session exists but has not
// reached that cache yet.
function signedInOnLoad() {
  return (
    Boolean(authClient.getSessionData()?.session) ||
    new URLSearchParams(window.location.search).has("ott")
  );
}

// Keeps the signed-in UI from flashing the signed-out state while the auth
// check is still in flight.
export function useSignedIn() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [wasSignedInOnLoad] = useState(signedInOnLoad);

  return isLoading ? wasSignedInOnLoad : isAuthenticated;
}
