import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type GroupViewData = NonNullable<
  FunctionReturnType<typeof api.groups.getGroupByToken>
>;
export type GroupQuizView = GroupViewData["quizzes"][number];
export type GroupProgress = GroupViewData["progress"];
export type GroupScoreEntry = NonNullable<GroupViewData["scoreboard"]>[number];
export type GroupSummary = FunctionReturnType<
  typeof api.groups.listMyGroups
>[number];

export function joinLink(token: string) {
  return `${window.location.origin}/g/${token}`;
}

export function quizLabel(count: number) {
  return count === 1 ? "1 quiz" : `${count} quizzes`;
}

export function memberLabel(count: number) {
  return count === 1 ? "1 member" : `${count} members`;
}
