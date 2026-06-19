# Better SVG — notes for Claude

VS Code extension: inline SVG preview (gutter + hover), a preview panel for
`.svg` files, and SVGO optimization. Core logic lives in `src/` (notably
`svgPreview.ts`, `svgTransform.ts`, `svgGutterPreview.ts`); the preview panel
webview is in `src/webview/`.

## Common commands

- `pnpm test` — run the unit tests (`node --test`).
- `pnpm check` / `pnpm lint` / `pnpm format:check` — quality gates.
- `pnpm install:local` — build the `.vsix` and (re)install + reload local
  editors. Restrict with `EDITORS="code" pnpm install:local`.

## Publishing / releasing

ALWAYS publish/package with `npx @vscode/vsce` — NOT a globally
pnpm-installed `vsce`. The pnpm-global install resolves its bundled secretlint
rule modules from a symlinked store and fails with
"Failed to load secretlint's rule module ... is not found". `npx` uses a flat
install where the rules resolve correctly.

Release steps:

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Commit (`chore(release): vX.Y.Z`) and tag (`git tag -a vX.Y.Z`).
3. Push `main` + tag to `origin` (github.com/midudev/better-svg). Note: the
   repo may also have a `fork` remote — push releases to `origin`.
4. `npx @vscode/vsce package -o better-svg-X.Y.Z.vsix` to verify.
5. `npx @vscode/vsce publish` — auth comes from the stored PAT
   (`vsce login midudev`, kept in `~/.vsce`) or the `VSCE_PAT` env var.

`vscode:prepublish` runs `pnpm package`, so publishing compiles and bundles
automatically.
