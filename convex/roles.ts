import type { MutationCtx } from "./_generated/server";

const ADMIN_EMAIL_SEPARATOR = ",";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(ADMIN_EMAIL_SEPARATOR)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export async function roleForNewUser(ctx: MutationCtx, email: string) {
  const allowlist = adminEmails();
  const normalized = email.trim().toLowerCase();
  if (allowlist.length > 0) {
    return allowlist.includes(normalized)
      ? ("admin" as const)
      : ("user" as const);
  }

  const existingUser = await ctx.db.query("users").take(1);
  return existingUser.length === 0 ? ("admin" as const) : ("user" as const);
}
