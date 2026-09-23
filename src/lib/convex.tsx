import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexReactClient } from "convex/react";
import type { FunctionComponent, JSX } from "react";
import { authClient } from "@/lib/auth-client";

const client = new ConvexReactClient(CONVEX_URL);

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
        <Component {...props} />
      </ConvexBetterAuthProvider>
    );
  };
}
