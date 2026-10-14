# EngSoc Dashboard

This is the Official GitHub Repository for UNSW Engineering Society's Dashboard

A full-stack application with Next.js React frontend and Express.js backend.

## Project Structure

```
engsoc-dashboard/
├── frontend/                 # Next.js React application
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # UI components
│       ├── services/         # Backend calls — all go through api-client.ts
│       ├── mocks/            # Offline data used when NEXT_PUBLIC_USE_MOCK=true
│       ├── lib/              # Shared helpers
│       └── types/            # Shared types
├── backend/                  # Express.js API server
│   └── src/
│       ├── routes/           # HTTP layer: parse the request, call functions/, respond
│       ├── functions/        # Business logic and permission checks
│       ├── database/         # SQL queries only
│       ├── middleware/       # Auth (verifyAuthToken, requireRole) and the error handler
│       └── lib/              # errors.ts (AppError classes), http.ts (asyncHandler, ok, parseId)
├── database/                 # Schema and migrations
└── .github/workflows/        # CI: format, lint and typecheck on every PR
```

## Getting Started

### Prerequisites

- Node.js 22+ and npm installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd engsoc-dashboard
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

### Running the Application

#### Development

- Frontend hot-reload is enabled in development mode
- Backend uses nodemon for automatic restart on file changes
- TypeScript provides type checking for both frontend and backend

### Code style, linting and CI

Both apps use **ESLint** for correctness and **Prettier** for formatting (shared config in `.prettierrc.json`: single quotes, semicolons, 2-space indent, 120-column lines). Run these from `backend/` or `frontend/`:

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix (backend)
npm run format        # rewrite files with Prettier
npm run format:check  # fail if anything isn't formatted
npm run typecheck     # tsc --noEmit
```

GitHub Actions (`.github/workflows/lint.yml`) runs `format:check`, `lint` and `typecheck` for both apps on every pull request and push to `main` — a PR can't go green until all three pass. Run `npm run format && npm run lint` before pushing to catch issues locally. Installing the Prettier and ESLint extensions in your editor (with format-on-save) keeps this automatic.

### Backend conventions

- **Layers.** `routes/` handles HTTP only, `functions/` holds the logic and permission checks, and `database/` holds the SQL. Routes never query the database directly.
- **Wrap every async handler in `asyncHandler`** (from `lib/http.ts`). Don't write `try/catch` in routes; let errors propagate.
- **Throw, don't respond, on failure.** Use the classes in `lib/errors.ts`, such as `throw new NotFoundError('Task not found')`. `ValidationError` maps to 400, `UnauthorizedError` to 401, `ForbiddenError` to 403, `NotFoundError` to 404, `ConflictError` to 409 and `UpstreamError` to 502. `middleware/errorHandler.ts` turns them into responses. Anything else is logged and answered with a generic 500, so internal messages never reach the client. A domain-specific error should extend one of these classes (e.g. `class ForbiddenTaskError extends ForbiddenError {}`).
- **Respond with `ok(res, data)` / `created(res, data)`** and parse numeric route params with `parseId(req.params.id, 'task')`.
- **Authenticated routes** use the `verifyAuthToken` middleware and type the request as `AuthedRequest`, which gives a typed `req.user.userId`. Don't use `(req as any).user`.

```ts
router.get(
  '/:taskId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const task = await getTaskById(parseId(req.params.taskId, 'task'), req.user.userId);
    if (!task) throw new NotFoundError('Task not found');
    ok(res, task);
  }),
);
```

### Frontend conventions

- **Components never call `fetch` directly.** They call a function in `src/services/`.
- **Services call the backend through `api<T>()` / `apiFetch()`** in `services/api-client.ts`. These handle the auth header, JSON encoding and errors. A failed request throws an `ApiError` carrying the backend's message and HTTP status. Use `isUnauthorized(err)` to detect an expired session.
- **Mock mode.** Each service checks `USE_MOCK` (from `services/api-config.ts`) first and answers from `src/mocks/` when it's set.

```ts
export async function getTask(token: string, taskId: number): Promise<TaskItem> {
  if (USE_MOCK) {
    const { getTask: mockGetTask } = await import('@/mocks/functions/tasks');
    return mockGetTask(taskId);
  }
  return toTaskItem(await api<RawTask>(`/tasks/${taskId}`, { token, errorMessage: 'Failed to load task' }));
}
```

## Learn More

- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)

## License

ISC
