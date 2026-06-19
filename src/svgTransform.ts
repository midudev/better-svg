/**
 * Copyright 2025 Miguel Ángel Durán
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const BASE64_PREFIX = '__JSX_BASE64__'
const BASE64_SUFFIX = '__'
const BLADE_BASE64_PREFIX = '__BLADE_BASE64__'
const BLADE_BASE64_SUFFIX = '__'
const TEMPLATE_BASE64_PREFIX = '__TPL_BASE64__'
const TEMPLATE_BASE64_SUFFIX = '__'
const TEMPLATE_TOKEN_REGEX = /__TPL_BASE64__[A-Za-z0-9+/=]*__/g

function encodeJsx(content: string): string {
  return BASE64_PREFIX + Buffer.from(content).toString('base64') + BASE64_SUFFIX
}

function decodeJsx(content: string): string | null {
  if (content.startsWith(BASE64_PREFIX) && content.endsWith(BASE64_SUFFIX)) {
    const b64 = content.slice(BASE64_PREFIX.length, -BASE64_SUFFIX.length)
    return Buffer.from(b64, 'base64').toString('utf-8')
  }
  return null
}

function encodeTemplate(content: string): string {
  return (
    TEMPLATE_BASE64_PREFIX +
    Buffer.from(content).toString('base64') +
    TEMPLATE_BASE64_SUFFIX
  )
}

function decodeTemplate(content: string): string | null {
  if (
    content.startsWith(TEMPLATE_BASE64_PREFIX) &&
    content.endsWith(TEMPLATE_BASE64_SUFFIX)
  ) {
    const b64 = content.slice(
      TEMPLATE_BASE64_PREFIX.length,
      -TEMPLATE_BASE64_SUFFIX.length
    )
    return Buffer.from(b64, 'base64').toString('utf-8')
  }
  return null
}

function encodeBlade(content: string): string {
  return (
    BLADE_BASE64_PREFIX +
    Buffer.from(content).toString('base64') +
    BLADE_BASE64_SUFFIX
  )
}

function decodeBlade(content: string): string | null {
  if (
    content.startsWith(BLADE_BASE64_PREFIX) &&
    content.endsWith(BLADE_BASE64_SUFFIX)
  ) {
    const b64 = content.slice(
      BLADE_BASE64_PREFIX.length,
      -BLADE_BASE64_SUFFIX.length
    )
    return Buffer.from(b64, 'base64').toString('utf-8')
  }
  return null
}

export interface OptimizationOptions {
  /**
   * Whether to transform attributes to/from camelCase (e.g. strokeWidth <-> stroke-width)
   * and class <-> className.
   * Typically true for React/JSX, false for Astro/Vue/SVG.
   */
  useCamelCase?: boolean
}

/**
 * Map of JSX camelCase attributes to SVG kebab-case attributes
 */
export const jsxToSvgAttributeMap: Record<string, string> = {
  // Stroke attributes
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  // Fill attributes
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  // Clip attributes
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  // Font attributes
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontWeight: 'font-weight',
  // Text attributes
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  dominantBaseline: 'dominant-baseline',
  alignmentBaseline: 'alignment-baseline',
  baselineShift: 'baseline-shift',
  // Gradient/filter attributes
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  lightingColor: 'lighting-color',
  // Marker attributes
  markerStart: 'marker-start',
  markerMid: 'marker-mid',
  markerEnd: 'marker-end',
  // Other attributes
  paintOrder: 'paint-order',
  vectorEffect: 'vector-effect',
  shapeRendering: 'shape-rendering',
  imageRendering: 'image-rendering',
  pointerEvents: 'pointer-events',
  xlinkHref: 'xlink:href'
}

/**
 * Create the reverse map: SVG kebab-case to JSX camelCase
 */
export const svgToJsxAttributeMap: Record<string, string> = Object.fromEntries(
  Object.entries(jsxToSvgAttributeMap).map(([jsx, svg]) => [svg, jsx])
)

const BLADE_DIRECTIVE_NAMES = new Set([
  'aware',
  'auth',
  'break',
  'case',
  'checked',
  'class',
  'continue',
  'default',
  'disabled',
  'else',
  'elseif',
  'empty',
  'endauth',
  'endempty',
  'endenv',
  'enderror',
  'endfor',
  'endforeach',
  'endforelse',
  'endfragment',
  'endguest',
  'endif',
  'endisset',
  'endonce',
  'endprepend',
  'endproduction',
  'endpush',
  'endsession',
  'endswitch',
  'endunless',
  'endwhile',
  'env',
  'error',
  'for',
  'foreach',
  'forelse',
  'fragment',
  'guest',
  'if',
  'isset',
  'once',
  'php',
  'prepend',
  'production',
  'props',
  'push',
  'readonly',
  'required',
  'selected',
  'session',
  'style',
  'switch',
  'unless',
  'while'
])

const BLADE_DIRECTIVES_WITHOUT_PARENTHESES = new Set([
  'auth',
  'break',
  'continue',
  'default',
  'else',
  'endauth',
  'endempty',
  'endenv',
  'enderror',
  'endfor',
  'endforeach',
  'endforelse',
  'endfragment',
  'endguest',
  'endif',
  'endisset',
  'endonce',
  'endprepend',
  'endproduction',
  'endpush',
  'endsession',
  'endswitch',
  'endunless',
  'endwhile',
  'guest',
  'php',
  'production'
])

function isLikelyBladeEcho(content: string): boolean {
  const expression = content
    .replace(/^\{\{\s*/, '')
    .replace(/\s*\}\}$/, '')
    .replace(/^\{!!\s*/, '')
    .replace(/\s*!!\}$/, '')
    .trim()

  return /(?:\$|->|::|^__\s*\(|^route\s*\(|^asset\s*\(|^config\s*\(|^old\s*\(|^csrf_)/.test(
    expression
  )
}

function findBladeEchoEnd(content: string, startIdx: number): number | null {
  if (content.startsWith('{{', startIdx)) {
    const endIdx = content.indexOf('}}', startIdx + 2)
    if (endIdx === -1) {
      return null
    }

    const end = endIdx + 2
    return isLikelyBladeEcho(content.slice(startIdx, end)) ? end : null
  }

  if (content.startsWith('{!!', startIdx)) {
    const endIdx = content.indexOf('!!}', startIdx + 3)
    return endIdx === -1 ? null : endIdx + 3
  }

  return null
}

function findBalancedParenthesisEnd(
  content: string,
  openIdx: number
): number | null {
  let balance = 1
  let i = openIdx + 1
  let inString = false
  let stringChar = ''

  while (i < content.length) {
    const char = content[i]
    const prevChar = content[i - 1]

    if (inString) {
      if (char === stringChar && prevChar !== '\\') {
        inString = false
      }
    } else if (char === '"' || char === "'" || char === '`') {
      inString = true
      stringChar = char
    } else if (char === '(') {
      balance++
    } else if (char === ')') {
      balance--
      if (balance === 0) {
        return i + 1
      }
    }

    i++
  }

  return null
}

function findBladeDirectiveEnd(
  content: string,
  startIdx: number
): number | null {
  if (content[startIdx] !== '@' || content[startIdx - 1] === '@') {
    return null
  }

  const nameMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(content.slice(startIdx + 1))
  if (!nameMatch) {
    return null
  }

  const name = nameMatch[0]
  if (!BLADE_DIRECTIVE_NAMES.has(name)) {
    return null
  }

  const afterNameIdx = startIdx + 1 + name.length
  if (content[afterNameIdx] === '(') {
    return findBalancedParenthesisEnd(content, afterNameIdx)
  }

  if (BLADE_DIRECTIVES_WITHOUT_PARENTHESES.has(name)) {
    return afterNameIdx
  }

  return null
}

function containsBladeSyntax(content: string): boolean {
  for (let i = 0; i < content.length; i++) {
    if (
      findBladeEchoEnd(content, i) !== null ||
      findBladeDirectiveEnd(content, i) !== null
    ) {
      return true
    }
  }

  return false
}

function replaceBladeAttributeValues(tagContent: string): string {
  return tagContent.replace(
    /([^\s=<>/]+)(\s*=\s*)(["'])([\s\S]*?)\3/g,
    (match, attr, equals, quote, value) => {
      if (!containsBladeSyntax(value)) {
        return match
      }

      return `${attr}${equals}${quote}${encodeBlade(value)}${quote}`
    }
  )
}

function replaceBladeStandaloneTokensInTag(
  tagContent: string,
  createTokenAttribute: (token: string) => string
): string {
  let result = ''
  let currentIndex = 0
  let inString = false
  let stringChar = ''

  while (currentIndex < tagContent.length) {
    const char = tagContent[currentIndex]
    const prevChar = tagContent[currentIndex - 1]

    if (inString) {
      result += char
      if (char === stringChar && prevChar !== '\\') {
        inString = false
      }
      currentIndex++
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      result += char
      currentIndex++
      continue
    }

    const echoEnd = findBladeEchoEnd(tagContent, currentIndex)
    if (echoEnd !== null) {
      result += createTokenAttribute(tagContent.slice(currentIndex, echoEnd))
      currentIndex = echoEnd
      continue
    }

    const directiveEnd = findBladeDirectiveEnd(tagContent, currentIndex)
    if (directiveEnd !== null) {
      result += createTokenAttribute(
        tagContent.slice(currentIndex, directiveEnd)
      )
      currentIndex = directiveEnd
      continue
    }

    result += char
    currentIndex++
  }

  return result
}

function findTagEnd(content: string, startIdx: number): number | null {
  let currentIndex = startIdx + 1
  let inString = false
  let stringChar = ''

  while (currentIndex < content.length) {
    const char = content[currentIndex]
    const prevChar = content[currentIndex - 1]

    if (inString) {
      if (char === stringChar && prevChar !== '\\') {
        inString = false
      }
      currentIndex++
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      currentIndex++
      continue
    }

    const echoEnd = findBladeEchoEnd(content, currentIndex)
    if (echoEnd !== null) {
      currentIndex = echoEnd
      continue
    }

    const directiveEnd = findBladeDirectiveEnd(content, currentIndex)
    if (directiveEnd !== null) {
      currentIndex = directiveEnd
      continue
    }

    if (char === '>') {
      return currentIndex
    }

    currentIndex++
  }

  return null
}

function replaceBladeSyntaxInTags(content: string): string {
  let result = ''
  let currentIndex = 0
  let bladeTokenIndex = 0

  const createTokenAttribute = (token: string): string => {
    return `data-better-svg-temp-blade-${bladeTokenIndex++}="${encodeBlade(token)}"`
  }

  while (currentIndex < content.length) {
    const tagStartIdx = content.indexOf('<', currentIndex)
    if (tagStartIdx === -1) {
      result += content.slice(currentIndex)
      break
    }

    result += content.slice(currentIndex, tagStartIdx)

    const tagEndIdx = findTagEnd(content, tagStartIdx)
    if (tagEndIdx === null) {
      result += content.slice(tagStartIdx)
      break
    }

    let tagContent = content.slice(tagStartIdx, tagEndIdx + 1)
    if (!/^<[/!?]/.test(tagContent)) {
      tagContent = replaceBladeAttributeValues(tagContent)
      tagContent = replaceBladeStandaloneTokensInTag(
        tagContent,
        createTokenAttribute
      )
    }

    result += tagContent
    currentIndex = tagEndIdx + 1
  }

  return result
}

/**
 * Detects if the SVG content contains JSX-specific syntax
 * (camelCase attributes, expression values like {2}, className, etc.)
 */
export function isJsxSvg(svgContent: string): boolean {
  if (containsBladeSyntax(svgContent)) {
    return true
  }

  // Check for JSX expression values like ={2} or ={variable}
  if (/=\{[^}]+\}/.test(svgContent)) {
    return true
  }

  // Check for spread attributes like {...props}
  if (/\{\.\.\.[^}]+\}/.test(svgContent)) {
    return true
  }

  // Check for className attribute
  if (/\bclassName=/.test(svgContent)) {
    return true
  }

  // Check for any known JSX camelCase attributes
  for (const jsxAttr of Object.keys(jsxToSvgAttributeMap)) {
    const regex = new RegExp(`\\b${jsxAttr}=`, 'g')
    if (regex.test(svgContent)) {
      return true
    }
  }

  // Check for Astro/Svelte/Vue directives with : or @
  // Svelte: on:, bind:, class:, use:, let:, animate:, transition:
  // Vue: v-, :, @
  // Astro: client:
  if (
    /(?:\s|^)(v-|client:|on:|bind:|class:|use:|let:|animate:|transition:|[:@])[a-zA-Z0-9-.:]+/.test(
      svgContent
    )
  ) {
    // Verify it's not a standard namespace
    const matches = svgContent.match(
      /(?:\s|^)(v-|client:|on:|bind:|class:|use:|let:|animate:|transition:|[:@])[a-zA-Z0-9-.:]+/g
    )
    if (matches) {
      for (const m of matches) {
        const attr = m.trim()
        if (!/^(xmlns|xlink|xml|sketch):/.test(attr)) return true
      }
    }
  }

  // Check for JSX comments
  if (/\{\/\*[\s\S]*?\*\/\}/.test(svgContent)) {
    return true
  }

  // Check for line comments // (common in JSX)
  if (/^\s*\/\//m.test(svgContent)) {
    return true
  }

  // Check for any other {braces} or {{interpolation}} (JSX text content or template interpolations)
  // We exclude <style> tags as they naturally contain braces in CSS
  const contentWithoutStyles = svgContent.replace(
    /<style[\s\S]*?<\/style>/gi,
    ''
  )
  if (/\{[\s\S]*?\}/.test(contentWithoutStyles)) {
    return true
  }

  return false
}

/**
 * Converts JSX SVG syntax to valid SVG XML
 * - Converts expression values {2} to "2"
 * - Converts className to class
 * - Converts camelCase attributes to kebab-case
 */
/**
 * Helper to replace JSX expressions like ={...} with ="..."
 * Handles nested braces and strings correctly
 */
function replaceJsxExpressions(content: string): string {
  let result = ''
  let currentIndex = 0

  while (currentIndex < content.length) {
    const startIdx = content.indexOf('={', currentIndex)
    if (startIdx === -1) {
      result += content.slice(currentIndex)
      break
    }

    // Append everything before "={"
    result += content.slice(currentIndex, startIdx)

    // Find matching brace
    let balance = 1
    let j = startIdx + 2
    let found = false
    let inString = false
    let stringChar = ''

    while (j < content.length) {
      const char = content[j]
      const prevChar = content[j - 1]

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true
          stringChar = char
        } else if (char === '{') {
          balance++
        } else if (char === '}') {
          balance--
        }
      }

      j++

      if (!inString && balance === 0) {
        found = true
        break
      }
    }

    if (found) {
      const expression = content.slice(startIdx + 2, j - 1)
      result += `="${encodeJsx(expression)}"`
      currentIndex = j
    } else {
      // Failed to find matching brace, just skip "={"
      result += '={'
      currentIndex = startIdx + 2
    }
  }

  return result
}

function replaceTextInterpolations(content: string): string {
  let result = ''
  let currentIndex = 0

  while (currentIndex < content.length) {
    // We only care about { that are between > and <
    const startIdx = content.indexOf('{', currentIndex)
    if (startIdx === -1) {
      result += content.slice(currentIndex)
      break
    }

    // Heuristic: check if we are likely in text content
    // We look back for > and ensure no < between > and {
    const lastOpen = content.lastIndexOf('>', startIdx)
    const lastClose = content.lastIndexOf('<', startIdx)
    const isInsideTag = lastOpen !== -1 && lastOpen > lastClose

    // If preceded by = or not inside a tag-content area, skip
    if ((startIdx > 0 && content[startIdx - 1] === '=') || !isInsideTag) {
      result += content.slice(currentIndex, startIdx + 1)
      currentIndex = startIdx + 1
      continue
    }

    // Skip if it is a JSX comment start
    if (content.startsWith('/*', startIdx + 1)) {
      result += content.slice(currentIndex, startIdx + 1)
      currentIndex = startIdx + 1
      continue
    }

    // Append everything before "{"
    result += content.slice(currentIndex, startIdx)

    // Find matching brace
    let balance = 1
    let j = startIdx + 1
    let found = false
    let inString = false
    let stringChar = ''

    while (j < content.length) {
      const char = content[j]
      const prevChar = content[j - 1]
      if (inString) {
        if (char === stringChar && prevChar !== '\\') inString = false
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true
          stringChar = char
        } else if (char === '{') balance++
        else if (char === '}') balance--
      }
      j++
      if (!inString && balance === 0) {
        found = true
        break
      }
    }

    if (found) {
      const expression = content.slice(startIdx + 1, j - 1)
      result += encodeJsx(expression)
      currentIndex = j
    } else {
      result += '{'
      currentIndex = startIdx + 1
    }
  }
  return result
}

function replaceJsxSpreads(content: string): string {
  let result = ''
  let currentIndex = 0
  let spreadIndex = 0

  while (currentIndex < content.length) {
    const startIdx = content.indexOf('{...', currentIndex)
    if (startIdx === -1) {
      result += content.slice(currentIndex)
      break
    }

    // Append everything before "{..."
    result += content.slice(currentIndex, startIdx)

    // Find matching brace
    let balance = 1
    let j = startIdx + 4
    let found = false
    let inString = false
    let stringChar = ''

    while (j < content.length) {
      const char = content[j]
      const prevChar = content[j - 1]

      if (inString) {
        if (char === stringChar && prevChar !== '\\') {
          inString = false
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          inString = true
          stringChar = char
        } else if (char === '{') {
          balance++
        } else if (char === '}') {
          balance--
        }
      }

      j++

      if (!inString && balance === 0) {
        found = true
        break
      }
    }

    if (found) {
      const expression = content.slice(startIdx + 4, j - 1).trim()
      result += `data-spread-${spreadIndex++}="${encodeJsx(expression)}"`
      currentIndex = j
    } else {
      result += '{...'
      currentIndex = startIdx + 4
    }
  }

  return result
}

function findBalancedBraceEnd(content: string, openIdx: number): number | null {
  let balance = 1
  let i = openIdx + 1
  let inString = false
  let stringChar = ''

  while (i < content.length) {
    const char = content[i]
    const prevChar = content[i - 1]

    if (inString) {
      if (char === stringChar && prevChar !== '\\') {
        inString = false
      }
    } else if (char === '"' || char === "'" || char === '`') {
      inString = true
      stringChar = char
    } else if (char === '{') {
      balance++
    } else if (char === '}') {
      balance--
      if (balance === 0) {
        return i + 1
      }
    }

    i++
  }

  return null
}

/**
 * Encodes template-literal interpolations like `${expr}` into Base64 tokens.
 * This keeps embedded SVG strings (e.g. `const icon = `<svg fill="${color}">...`)
 * renderable: the `${...}` braces would otherwise break JSX brace parsing and
 * trip the preview's brace validation. Tokens are restored on the way back.
 */
function replaceTemplateInterpolations(content: string): string {
  let result = ''
  let currentIndex = 0

  while (currentIndex < content.length) {
    const startIdx = content.indexOf('${', currentIndex)
    if (startIdx === -1) {
      result += content.slice(currentIndex)
      break
    }

    // Append everything before "${"
    result += content.slice(currentIndex, startIdx)

    const end = findBalancedBraceEnd(content, startIdx + 1)
    if (end === null) {
      result += '${'
      currentIndex = startIdx + 2
      continue
    }

    const expression = content.slice(startIdx + 2, end - 1)
    result += encodeTemplate(expression)
    currentIndex = end
  }

  return result
}

/**
 * Removes leftover template-interpolation tokens so previews render cleanly
 * (e.g. `fill="${color}"` becomes `fill=""` rather than showing the token).
 */
export function stripTemplatePlaceholders(content: string): string {
  return content.replace(TEMPLATE_TOKEN_REGEX, '')
}

function removeJsxComments(content: string): string {
  // Remove block comments {/* ... */}
  content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  // Remove line comments // ... that are on their own line (common in JSX)
  // We use the 'm' flag so ^ matches start of line
  content = content.replace(/^\s*\/\/.*$/gm, '')
  return content
}

function protectEncodedAttributes(content: string): string {
  // Protect any attribute that has a Base64 encoded value OR is a framework directive
  // Matches: attr="..." or just attr (boolean)
  // We avoid \b because it doesn't work with prefix like : or @
  return content.replace(
    /([a-zA-Z0-9-:@.]+)(?:=(["'])([\s\S]*?)\2)?/g,
    (match, attr, quote, value, offset) => {
      // Ensure it's an attribute (preceded by whitespace or <tag)
      const prevChar = content[offset - 1]
      if (prevChar && !/\s|<|>/.test(prevChar)) return match

      // Skip if it's already a temp attribute
      if (attr.startsWith('data-better-svg-temp-')) return match

      // Decide if we should protect this attribute
      const isEncoded =
        value?.includes(BASE64_PREFIX) ||
        value?.includes(BLADE_BASE64_PREFIX) ||
        value?.includes(TEMPLATE_BASE64_PREFIX)
      const isDirective =
        /^(client:|v-|on:|bind:|class:|use:|let:|animate:|transition:|[:@])/.test(
          attr
        ) && !/^(xmlns|xlink|xml|sketch):/.test(attr)

      if (!isEncoded && !isDirective) {
        return match
      }

      // Sanitize attribute name for use in data- attribute
      const safeAttr = attr
        .replace(/:/g, '__COLON__')
        .replace(/@/g, '__AT__')
        .replace(/\./g, '__DOT__')

      if (value !== undefined) {
        return `data-better-svg-temp-${safeAttr}="${value}"`
      } else {
        // Boolean attribute
        return `data-better-svg-temp-${safeAttr}="__BOOLEAN__"`
      }
    }
  )
}

function restoreEncodedAttributes(content: string): string {
  // Restore protected attributes
  return content.replace(
    /data-better-svg-temp-([a-zA-Z0-9-_]+)="([^"]*)"/g,
    (match, safeAttr, value) => {
      if (/^blade-\d+$/.test(safeAttr)) {
        const decoded = decodeBlade(value)
        return decoded ?? match
      }

      const attr = safeAttr
        .replace(/__COLON__/g, ':')
        .replace(/__AT__/g, '@')
        .replace(/__DOT__/g, '.')

      if (value === '__BOOLEAN__') {
        return attr
      }
      return `${attr}="${value}"`
    }
  )
}

const STYLE_BLOCK_PLACEHOLDER = '__BESVG_STYLE_BLOCK_'

/**
 * Pull every `<style>…</style>` block out of the content and replace it with a
 * neutral placeholder. CSS naturally uses braces (`.foo{fill:red}`), which the
 * JSX brace handling would otherwise mistake for text interpolations and
 * base64-encode, corrupting the stylesheet (the preview then renders black).
 * `isJsxSvg` already excludes `<style>` blocks, so the conversion must leave
 * them untouched as well.
 */
function maskStyleBlocks(content: string, store: string[]): string {
  return content.replace(/<style[\s\S]*?<\/style\s*>/gi, (block) => {
    const token = `${STYLE_BLOCK_PLACEHOLDER}${store.length}__`
    store.push(block)
    return token
  })
}

function restoreStyleBlocks(content: string, store: string[]): string {
  if (store.length === 0) {
    return content
  }

  return content.replace(
    new RegExp(`${STYLE_BLOCK_PLACEHOLDER}(\\d+)__`, 'g'),
    (match, index) => store[Number(index)] ?? match
  )
}

/**
 * Converts JSX SVG syntax to valid SVG XML
 * - Converts expression values {2} to "2"
 * - Converts className to class (if useCamelCase is true)
 * - Converts camelCase attributes to kebab-case (if useCamelCase is true)
 */
export function convertJsxToSvg(
  svgContent: string,
  options: OptimizationOptions = { useCamelCase: true }
): string {
  // Protect <style> CSS from the JSX brace transforms below; restored at the end.
  const styleBlocks: string[] = []
  svgContent = maskStyleBlocks(svgContent, styleBlocks)

  // Encode template-literal interpolations like ${expr} first so their braces
  // don't interfere with JSX brace parsing or the preview's brace validation.
  svgContent = replaceTemplateInterpolations(svgContent)

  // Remove JSX comments first to avoid parsing issues
  svgContent = removeJsxComments(svgContent)

  // Convert Blade-only attributes/directives into temporary SVG attributes.
  if (containsBladeSyntax(svgContent)) {
    svgContent = replaceBladeSyntaxInTags(svgContent)
  }

  // Convert JSX expression values like {2} to "2"
  svgContent = replaceJsxExpressions(svgContent)

  // Convert text interpolations like <text>{val}</text>
  svgContent = replaceTextInterpolations(svgContent)

  // Convert spread attributes {...props} to data-spread-i="props"
  // Using robust parser for nested braces
  svgContent = replaceJsxSpreads(svgContent)

  if (options.useCamelCase) {
    // Convert className to class
    svgContent = svgContent.replace(/\bclassName=/g, 'class=')

    // Convert all JSX camelCase attributes to SVG kebab-case
    for (const [jsx, svg] of Object.entries(jsxToSvgAttributeMap)) {
      const regex = new RegExp(`\\b${jsx}=`, 'g')
      svgContent = svgContent.replace(regex, `${svg}=`)
    }
  }

  // Protect all attributes with encoded values from SVGO
  // This handles style, event handlers, and anything else that is dynamically encoded
  svgContent = protectEncodedAttributes(svgContent)

  // Restore the untouched <style> blocks pulled out at the start.
  svgContent = restoreStyleBlocks(svgContent, styleBlocks)

  return svgContent
}

/**
 * Converts SVG XML syntax back to JSX
 * - Converts class to className (if useCamelCase is true)
 * - Converts kebab-case attributes to camelCase (if useCamelCase is true)
 */
export function convertSvgToJsx(
  svgContent: string,
  options: OptimizationOptions = { useCamelCase: true }
): string {
  // Restore protected attributes first
  svgContent = restoreEncodedAttributes(svgContent)

  // Decode Blade expressions in attribute values before JSX expression decoding.
  svgContent = svgContent.replace(
    /([a-zA-Z0-9-:@.]+)=(["'])(__BLADE_BASE64__[^"']*?__)\2/g,
    (match, attr, quote, value) => {
      const decoded = decodeBlade(value)
      if (decoded !== null) {
        return `${attr}=${quote}${decoded}${quote}`
      }
      return match
    }
  )

  svgContent = svgContent.replace(
    /__BLADE_BASE64__[A-Za-z0-9+/=]+__/g,
    (value) => {
      const decoded = decodeBlade(value)
      return decoded ?? value
    }
  )

  if (options.useCamelCase) {
    // Convert class to className
    svgContent = svgContent.replace(/\bclass=/g, 'className=')

    // Convert all SVG kebab-case attributes to JSX camelCase
    for (const [svg, jsx] of Object.entries(svgToJsxAttributeMap)) {
      // Need to escape hyphens and colons for regex
      const escapedSvg = svg.replace(/[-:]/g, '\\$&')
      const regex = new RegExp(`\\b${escapedSvg}=`, 'g')
      svgContent = svgContent.replace(regex, `${jsx}=`)
    }
  }

  // Restore spread attributes
  svgContent = svgContent.replace(
    /\bdata-spread-\d+="([^"]*)"/g,
    (_match, value) => {
      const decoded = decodeJsx(value)
      // If it wasn't encoded (legacy/fallback), try simple unescape or keep as is?
      // Just handling our new logic:
      if (decoded !== null) {
        return `{...${decoded}}`
      }
      // Fallback for old behavior (though we overwrote it) or other cases
      const unescaped = value
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
      return `{...${unescaped}}`
    }
  )

  // Decode Base64 expressions in attributes
  // content="encoded" -> content={expression}
  svgContent = svgContent.replace(
    /([a-zA-Z0-9-:@.]+)=(["'])(__JSX_BASE64__[^"']*?__)\2/g,
    (match, attr, quote, value) => {
      const decoded = decodeJsx(value)
      if (decoded !== null) {
        return `${attr}={${decoded}}`
      }
      return match
    }
  )

  // Decode Base64 expressions in text content
  // >encoded< -> >{expression}<
  svgContent = svgContent.replace(
    />(__JSX_BASE64__[^<]*?__)</g,
    (match, value) => {
      const decoded = decodeJsx(value)
      if (decoded !== null) {
        return `>{${decoded}}<`
      }
      return match
    }
  )

  // Restore template-literal interpolations: token -> ${expr}
  svgContent = svgContent.replace(TEMPLATE_TOKEN_REGEX, (token) => {
    const decoded = decodeTemplate(token)
    return decoded !== null ? `\${${decoded}}` : token
  })

  return svgContent
}

/**
 * Prepares JSX SVG content for SVGO optimization
 * Returns the converted SVG and metadata about whether conversion was applied
 */
export function prepareForOptimization(
  svgContent: string,
  options: OptimizationOptions = { useCamelCase: true }
): {
  preparedSvg: string
  wasJsx: boolean
} {
  const wasJsx = isJsxSvg(svgContent)

  if (wasJsx) {
    return {
      preparedSvg: convertJsxToSvg(svgContent, options),
      wasJsx: true
    }
  }

  return {
    preparedSvg: svgContent,
    wasJsx: false
  }
}

/**
 * Converts optimized SVG back to JSX if the original was JSX
 */
export function finalizeAfterOptimization(
  optimizedSvg: string,
  wasJsx: boolean,
  options: OptimizationOptions = { useCamelCase: true }
): string {
  if (wasJsx) {
    return convertSvgToJsx(optimizedSvg, options)
  }

  return optimizedSvg
}

/**
 * SVGO always emits double-quoted attributes. When the SVG was authored with
 * single-quoted attributes — typically because it lives inside a double-quoted
 * JS/TS string literal — re-emitting double quotes would break the surrounding
 * string. This restores the author's original quote style so the optimized SVG
 * can be dropped back in place safely.
 */
export function matchAttributeQuoteStyle(
  optimizedSvg: string,
  originalSvg: string
): string {
  const usesSingleQuotes = /=\s*'[^']*'/.test(originalSvg)
  const usesDoubleQuotes = /=\s*"[^"]*"/.test(originalSvg)

  // Only act when the original used single quotes exclusively; otherwise keep
  // SVGO's double quotes (the safe default for JSX and backtick templates).
  if (!usesSingleQuotes || usesDoubleQuotes) {
    return optimizedSvg
  }

  // Convert attr="value" -> attr='value', but bail on any value that itself
  // contains a single quote (swapping would produce invalid markup).
  let canSwapAll = true
  const swapped = optimizedSvg.replace(/="([^"]*)"/g, (match, value) => {
    if (value.includes("'")) {
      canSwapAll = false
      return match
    }
    return `='${value}'`
  })

  return canSwapAll ? swapped : optimizedSvg
}
