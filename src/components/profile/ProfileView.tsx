import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeftIcon, UserRoundIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { withConvexProvider } from "@/lib/convex";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/GoogleAuthButton";
import { BottomNav } from "@/components/nav/BottomNav";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Profile = NonNullable<
  FunctionReturnType<typeof api.users.profileByUsername>
>;

const profileStats = [
  { label: "Following", value: 0 },
  { label: "Followers", value: 0 },
  { label: "Likes", value: 0 },
];

function ProfileHeader({ username }: { username: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center px-2">
      <a
        href="/"
        aria-label="Back to feed"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <ArrowLeftIcon />
      </a>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-medium">
        @{username}
      </span>
      <span aria-hidden className="size-8" />
    </header>
  );
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  const initial = [...(profile.name ?? profile.username)][0]?.toUpperCase();

  return (
    <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full">
      {profile.image ? (
        <img
          src={profile.image}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-muted-foreground text-3xl font-medium">
          {initial}
        </span>
      )}
    </div>
  );
}

function ProfileStats() {
  return (
    <div className="flex items-center justify-center gap-8 pt-1">
      {profileStats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center gap-1">
          <span className="text-base font-semibold tabular-nums">
            {stat.value}
          </span>
          <span className="text-muted-foreground text-xs">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileContent({
  profile,
  isOwnProfile,
}: {
  profile: Profile;
  isOwnProfile: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-5">
        <ProfileAvatar profile={profile} />
        <div className="flex flex-col items-center gap-1 text-center">
          {profile.name ? (
            <span className="text-lg font-medium">{profile.name}</span>
          ) : null}
          <span className="text-muted-foreground text-sm">
            @{profile.username}
          </span>
        </div>
        <ProfileStats />
        {isOwnProfile && <SignOutButton className="mt-1 h-9 w-full" />}
      </div>
      <Separator />
      <div className="flex justify-center px-4 py-16">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              This profile has no activity to show.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </div>
  );
}

function ProfileNotFound({ username }: { username: string }) {
  return (
    <div className="flex min-h-0 flex-1 justify-center px-4 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserRoundIcon />
          </EmptyMedia>
          <EmptyTitle>User not found</EmptyTitle>
          <EmptyDescription>
            There is no profile for @{username}.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <a
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to feed
          </a>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-4 pt-6">
      <Skeleton className="size-24 shrink-0 rounded-full" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

function ProfileView({ username }: { username: string }) {
  const profile = useQuery(api.users.profileByUsername, { username });
  const viewer = useQuery(api.authz.currentUser);
  const isOwnProfile =
    Boolean(viewer?.username) && viewer?.username === profile?.username;

  return (
    <div className="flex h-full flex-col">
      <ProfileHeader username={profile?.username ?? username} />
      {profile === undefined ? (
        <ProfileLoading />
      ) : profile === null ? (
        <ProfileNotFound username={username} />
      ) : (
        <ProfileContent profile={profile} isOwnProfile={isOwnProfile} />
      )}
      <BottomNav active="profile" />
    </div>
  );
}

export default withConvexProvider(ProfileView);
