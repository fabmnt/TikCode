import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexReactClient } from "convex/react";
import { useState, type FunctionComponent, type JSX } from "react";
import { authClient } from "@/lib/auth-client";
import { getOrCreateClientId } from "@/lib/client-id";
import { useLinkAnonymousVotes } from "@/lib/use-link-anonymous-votes";

const client = new ConvexReactClient(CONVEX_URL);

function LinkAnonymousVotes() {
  const [clientId] = useState(getOrCreateClientId);
  useLinkAnonymousVotes(clientId);
  return null;
}

export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexBetterAuthProvider
        client={client}
        // The provider's AuthClient union does not overlap this client's
        // inferred session type, even though the runtime plugins match.
        authClient={authClient as unknown as AuthClient}
      >
        <LinkAnonymousVotes />
        <Component {...props} />
      </ConvexBetterAuthProvider>
    );
  };
}
