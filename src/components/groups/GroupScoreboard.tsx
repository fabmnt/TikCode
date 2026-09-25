import { cn } from "@/lib/utils";
import type { GroupProgress, GroupScoreEntry } from "@/lib/group";

type GroupScoreboardProps = {
  entries: GroupScoreEntry[];
  progress: GroupProgress;
};

export function GroupScoreboard({ entries, progress }: GroupScoreboardProps) {
  return (
    <section className="border-border flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Scores</h2>
        <p className="text-muted-foreground text-sm">
          You finished every quiz with {progress.correct} of {progress.total}{" "}
          correct.
        </p>
      </header>

      <ol className="flex flex-col">
        {entries.map((entry, index) => {
          const name = entry.name ?? entry.username ?? "Member";

          return (
            <li
              key={`${entry.username ?? name}-${index}`}
              className={cn(
                "border-border flex items-center gap-3 border-b py-2 text-sm last:border-b-0",
                entry.isViewer && "text-primary",
              )}
            >
              <span className="text-muted-foreground w-4 shrink-0 text-xs">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {entry.username ? (
                  <a
                    href={`/${entry.username}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {name}
                  </a>
                ) : (
                  name
                )}
                {entry.isViewer && (
                  <span className="text-muted-foreground ml-1 text-xs">
                    (you)
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium">
                {entry.correct}/{progress.total}
              </span>
              <span className="text-muted-foreground w-24 shrink-0 text-right text-xs">
                {entry.completed ? "Finished" : `${entry.answered} answered`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
