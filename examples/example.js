// JavaScript example: SVGs detected inside string literals.
//
// Better SVG previews inline SVG markup even when it lives inside a string
// (single/double quotes or template literals). Hover over any of the SVGs
// below, or look at the gutter icon next to them.

// 1. SVG inside a double-quoted string.
//    Stroke-based icons need `stroke` + `fill='none'`; without a stroke the
//    line paths have no fillable area and nothing would render.
export const closeIcon =
  "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg>"

// 2. SVG inside a template literal, formatted across multiple lines.
//    The closing bracket on its own line (`</svg\n>`) is still detected.
export const heartIcon = `<button aria-label="Like">
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
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg
>
</button>`

// 3. SVG inside a template literal that uses ${} interpolations.
//    Interpolations are ignored for the preview, so the icon still shows up.
export function renderBadge(color, label) {
  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="${color}"
    aria-label="${label}"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none" />
  </svg>`
}

// 4. SVG concatenated/returned as a plain string.
export const getSpinner = () =>
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="40 20"/></svg>'
