import { CONVEX_URL } from "astro:env/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { FunctionComponent, JSX } from "react";

const client = new ConvexReactClient(CONVEX_URL);

export function withConvexProvider<Props extends JSX.IntrinsicAttributes>(
  Component: FunctionComponent<Props>,
) {
  return function WithConvexProvider(props: Props) {
    return (
      <ConvexProvider client={client}>
        <Component {...props} />
      </ConvexProvider>
    );
  };
}
