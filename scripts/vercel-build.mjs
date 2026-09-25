import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

const hasDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);
const hasDeploymentUrl = Boolean(process.env.CONVEX_URL);
const isProduction = process.env.VERCEL_ENV === "production";

if (hasDeployKey) {
  run("convex deploy --cmd 'astro build' --preview-run 'seed:seedQuizzes'");
  // Preview deploy keys cannot run functions on their own, and preview
  // deployments are already seeded by --preview-run above.
  if (isProduction) {
    run("convex run seed:seedQuizzes");
  }
} else if (hasDeploymentUrl) {
  console.log(
    "CONVEX_DEPLOY_KEY is not set: building the frontend against CONVEX_URL without deploying Convex functions.",
  );
  run("astro build");
} else {
  throw new Error(
    "No Convex configuration found. Set CONVEX_DEPLOY_KEY to deploy Convex from this build, or CONVEX_URL to build the frontend against an existing deployment.",
  );
}
