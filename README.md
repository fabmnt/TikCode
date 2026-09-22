# Quizz Feed

A swipeable feed of code quizzes for developers. Built with Astro, React, Convex, and Tailwind CSS.

## Development

```sh
pnpm install
pnpm dev
```

The app runs at `http://localhost:4321`.

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
