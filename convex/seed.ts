import { mutation } from "./_generated/server";
import { SEED_QUIZZES } from "./seedData";

function countsFor(
  optionIds: string[],
  existing: Record<string, number> | undefined,
) {
  return Object.fromEntries(optionIds.map((id) => [id, existing?.[id] ?? 0]));
}

export const seedQuizzes = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("quizzes").collect();
    const bySlug = new Map(existing.map((quiz) => [quiz.slug, quiz]));
    let inserted = 0;
    let updated = 0;

    for (const quiz of SEED_QUIZZES) {
      const current = bySlug.get(quiz.slug);
      const optionIds = quiz.options.map((option) => option.id);
      let quizId;

      if (current) {
        await ctx.db.replace(current._id, { ...quiz, status: "published" });
        quizId = current._id;
        updated += 1;
      } else {
        quizId = await ctx.db.insert("quizzes", {
          ...quiz,
          status: "published",
        });
        inserted += 1;
      }

      const stats = await ctx.db
        .query("quizStats")
        .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
        .unique();
      const optionCounts = countsFor(optionIds, stats?.optionCounts);

      if (stats) {
        await ctx.db.patch(stats._id, { optionCounts });
      } else {
        await ctx.db.insert("quizStats", { quizId, optionCounts });
      }
    }

    return { inserted, updated };
  },
});
