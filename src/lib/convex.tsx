import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { CONVEX_URL } from "astro:env/client";
import { ConvexReactClient } from "convex/react";
import type { FunctionComponent, JSX } from "react";

const client = new ConvexReactClient(CONVEX_URL);

export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexAuthProvider client={client}>
        <Component {...props} />
      </ConvexAuthProvider>
    );
  };
}
