# Quizz Feed

A swipeable feed of code quizzes for developers. Built with Astro, React, Convex, and Tailwind CSS.

## Development

```sh
pnpm install
pnpm dev
```

The app runs at `http://localhost:4321`.

## Authentication

The public feed works without an account. Sign in with Google is optional. After sign-in, votes from that browser are attached to the Google account so the same answers show up on other devices. Anonymous voting still works when nobody is signed in.

Admin pages and quiz generation require an admin role:

- Set `ADMIN_EMAILS` on the Convex deployment (comma-separated) before inviting people. Only those Google accounts become admins.
- If `ADMIN_EMAILS` is empty, the first Google account to sign in becomes the admin and later accounts do not.

Email and password sign-in is not available.

### Google Cloud OAuth

Create a Google OAuth web client, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the Convex deployment.

Authorized JavaScript origins:

- `http://localhost:4321`
- the Vercel production origin, for example `https://your-app.vercel.app`

Authorized redirect URIs use the Convex HTTP actions URL (the `.convex.site` host), not the Vercel domain:

- `https://<deployment>.convex.site/api/auth/callback/google`

Add one redirect URI per Convex deployment (dev and prod). Convex sets `CONVEX_SITE_URL` on the deployment automatically.

Also set these Convex env vars:

| Name                 | Purpose                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | Random secret, at least 32 characters (`openssl rand -base64 32`)                                                                                                                                                          |
| `SITE_URL`           | Primary app origin. Use `http://localhost:4321` for local dev, or the Vercel production origin for prod                                                                                                                    |
| `TRUSTED_ORIGINS`    | Optional comma-separated extra origins that may finish Google sign-in. `http://localhost:4321` is always included. Better Auth accepts wildcards such as `https://*.vercel.app`, but a wildcard trusts every matching site |
| `ADMIN_EMAILS`       | Optional comma-separated admin allowlist                                                                                                                                                                                   |

`SITE_URL`, `TRUSTED_ORIGINS`, the Google client, and `BETTER_AUTH_SECRET` are Convex deployment env vars. Do not put the Google secret or `BETTER_AUTH_SECRET` in Vercel.

### Upgrading a deployment that used Convex Auth

Convex Auth tables cannot stay in the database once this schema is deployed. Before pushing this code to an existing deployment, delete the documents in `users`, `authSessions`, `authAccounts`, `authRefreshTokens`, `authVerificationCodes`, `authVerifiers`, and `authRateLimits` from the Convex dashboard. Quiz documents and anonymous votes can stay. Old email/password accounts are not reused; sign in with Google afterward.

## Commands

| Command        | Action                                        |
| :------------- | :-------------------------------------------- |
| `pnpm install` | Installs dependencies                         |
| `pnpm dev`     | Starts local dev server                       |
| `pnpm build`   | Builds the production site to `./dist/`       |
| `pnpm preview` | Previews the production build locally         |
| `pnpm lint`    | Runs ESLint                                   |
| `pnpm format`  | Formats the codebase with Prettier            |
| `pnpm seed`    | Seeds the Convex database with sample quizzes |

## Project structure

```text
/
├── convex/          Convex backend (schema, queries, mutations)
├── public/          Static assets
├── src/
│   ├── components/  React and Astro UI components
│   ├── layouts/     Page layouts
│   ├── lib/         Shared client utilities
│   └── pages/       Astro routes
└── package.json
```
