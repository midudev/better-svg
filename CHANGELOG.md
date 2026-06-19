# Change Log

All notable changes to the "Better SVG" extension will be documented in this file.

## [0.5.0] - 2026-06-19

### Added

- Detect and preview inline SVGs embedded inside JavaScript/TypeScript string literals and template literals, including SVGs that use `${...}` interpolations
- Detect multiline icons whose closing tag bracket is split onto its own line (`</svg\n>`), as emitted by some formatters
- Disable the "Change currentColor" control in the preview panel when the SVG has no `currentColor` to change
- Example files (`examples/example.js`, `examples/example.ts`) showing SVG detection inside string literals
- Local install script (`scripts/install-local.sh` / `pnpm install:local`) to build, install, and reload the extension across VS Code and Cursor

### Fixed

- Preserve the author's attribute quote style after SVGO optimization, so optimizing an SVG embedded in a double-quoted string no longer breaks the surrounding string literal
- Preserve `<style>` blocks and template-literal interpolations through the JSX ⇄ SVG conversion used for optimization

## [0.1.0] - 2025-10-20

### Added

- Initial release
- Live SVG preview panel in Explorer sidebar
- Color picker for `currentColor` customization
- Dark background toggle for better SVG visualization
- Zoom and pan functionality (click to zoom, Alt+click to zoom out, Alt+scroll for smooth zoom)
- SVG optimization with SVGO integration
- Auto-reveal/collapse panel when opening/closing SVG files
- Configurable default color for SVG preview
- Grid background for transparent SVGs
- Bundled with esbuild for fast loading

### Features

- ✨ **Live Preview**: Real-time SVG preview in Explorer sidebar
- 🎨 **Color Control**: Change `currentColor` value dynamically
- 🌓 **Dark Mode**: Toggle dark background for light-colored SVGs
- 🔍 **Zoom & Pan**: Interactive zoom with Alt key support
- ⚡ **Optimization**: One-click SVG optimization with SVGO
- 📐 **Grid Background**: Checkerboard pattern for transparency
- ⚙️ **Configurable**: Auto-reveal and default color settings
