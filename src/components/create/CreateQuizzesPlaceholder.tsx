import { Skeleton } from "@/components/ui/skeleton";

// The create page renders this on the server before the island hydrates, so it
// must stay animation-free: a CSS animation would visibly restart when the
// island replaces this markup with the same one.
export function CreateQuizzesPlaceholder() {
  return (
    <div aria-hidden className="flex flex-col gap-6 px-4 py-6">
      <div className="border-border flex flex-col gap-4 rounded-xl border p-4">
        <Skeleton className="h-4 w-24 animate-none" />
        <Skeleton className="h-8 w-full animate-none" />
        <Skeleton className="h-20 w-full animate-none" />
        <Skeleton className="h-8 w-full animate-none" />
      </div>
    </div>
  );
}
