import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

// Google sends the browser away and back, so the return visit has no click
// handler. Link the anonymous id once Convex has accepted the session.
export function useLinkAnonymousVotes(clientId: string) {
  const { isAuthenticated } = useConvexAuth();
  const linkAnonymousVotes = useMutation(api.quizzes.linkAnonymousVotes);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void linkAnonymousVotes({ clientId }).catch(() => undefined);
  }, [clientId, isAuthenticated, linkAnonymousVotes]);
}
