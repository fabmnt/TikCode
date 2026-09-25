export const TOPIC_LABEL = {
  "code-smell": "Code smell",
  antipattern: "Antipattern",
  "bad-practice": "Bad practice",
} as const;

export const DIFFICULTY_LABEL = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

export function votePercent(count: number, totalVotes: number) {
  if (totalVotes === 0) {
    return 0;
  }

  return Math.round((count / totalVotes) * 100);
}
