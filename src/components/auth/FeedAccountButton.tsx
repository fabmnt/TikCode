import { useConvexAuth } from "convex/react";
import {
  GoogleSignInButton,
  SignOutButton,
} from "@/components/auth/GoogleAuthButton";

export function FeedAccountButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <GoogleSignInButton />;
  }

  return <SignOutButton />;
}
