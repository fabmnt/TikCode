import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// Every group generation call can spend money on a web search, so each account
// gets a small hourly budget. A signed-in user cannot create a group faster
// than this limit allows them to generate quizzes for it.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  groupQuizGeneration: { kind: "fixed window", rate: 5, period: HOUR },
});
