// TypeScript example: SVGs detected inside string literals.
//
// Better SVG previews inline SVG markup even when it lives inside a string
// (single/double quotes or template literals). Hover over any of the SVGs
// below, or look at the gutter icon next to them.

// 1. SVG inside a single-quoted string.
//    Stroke-based icons need `stroke` + `fill="none"`; without a stroke the
//    line paths have no fillable area and nothing would render.
export const checkIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

// 2. SVG inside a template literal, formatted across multiple lines.
//    Note the closing bracket on its own line (`</svg\n>`), as some
//    formatters emit it — it is still detected.
export const infoIcon = `<a href="/info">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg
>
</a>`

// 3. SVG inside a template literal that uses ${} interpolations.
//    Interpolations are ignored for the preview (rendered as empty values),
//    so the icon still shows up.
export function renderStar(color: string, size: number): string {
  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="${color}"
    class="icon icon-star"
  >
    <polygon points="12 2 15 9 22 9 17 14 19 22 12 17 5 22 7 14 2 9 9 9" />
  </svg>`
}

// 4. SVG returned from a function as a plain string.
export const getLogo = (): string =>
  '<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#df6c31"/><path d="M9 22 16 9l7 13z" fill="#fff"/></svg>'
