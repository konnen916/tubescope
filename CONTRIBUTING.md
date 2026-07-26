# Contributing to TubeScope

Thanks for wanting to help. TubeScope is a small, dependency-light Firefox extension, and the goal is to keep it that way: fast, honest, and fully client-side.

## Getting set up

```bash
npm install
npm run build        # bundles into dist/
npm run build:watch  # rebuild on change
npm test             # run the unit tests (vitest)
npm run typecheck    # tsc, no emit
```

Load `dist/manifest.json` as a temporary add-on at `about:debugging` to try it.

## How the code is laid out

- `src/lib/` holds **pure** logic: API calls, metrics, insights, chart builders, CSV/JSON export. No DOM, no I/O side effects where avoidable. These are unit-tested.
- `src/background/`, `src/content/`, `src/report/`, `src/options/` are the extension surfaces (glue). They are verified by build, typecheck, and manual testing in Firefox.
- Tests live in `tests/` next to nothing else; each pure module has a matching `*.test.ts`.

## Ground rules

1. **No new runtime dependencies** unless there is a very good reason. No frameworks, no chart libraries (charts are hand-rolled SVG).
2. **No new permissions** without a clear justification in the pull request.
3. **Escape untrusted strings.** Video and channel titles come from the API and are attacker-controllable. Anything rendered into HTML or an SVG string must pass through `esc()` from `src/lib/html.ts`. This is not optional.
4. **Keep pure logic pure and tested.** New metrics or insights go in a `src/lib/` module with tests, not inline in a render function.
5. **Stay honest.** No faked "revenue" or "search volume" numbers. Estimates, if ever added, must be clearly labeled as estimates with their source.
6. **No telemetry, no tracking, no phoning home.** Everything stays on the user's machine.

## Pull requests

- Keep changes focused; one feature or fix per PR.
- Add or update tests for any logic change; `npm test` and `npm run typecheck` must pass.
- Describe what you changed and how you tested it.

## Reporting bugs

Open an issue with the steps to reproduce, what you expected, and what happened. If it involves a specific channel, include the channel URL.
