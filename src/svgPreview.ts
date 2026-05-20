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

import { convertJsxToSvg, type OptimizationOptions } from './svgTransform'

export type SvgPreviewKind = 'svg' | 'symbol' | 'use'

export interface SvgPreviewCandidate {
  kind: SvgPreviewKind
  source: string
  previewSvg: string
  startIndex: number
  length: number
}

export interface SvgPreviewOptions extends OptimizationOptions {
  contrastColor: string
  minSize: number
}

interface SvgSymbolDefinition {
  id: string
  source: string
  attrs: string
  inner: string
}

const SVG_TAG_REGEX = /<svg\b[\s\S]*?>[\s\S]*?<\/svg>/gi
const SYMBOL_TAG_REGEX = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/gi
const USE_TAG_REGEX = /<use\b[^>]*(?:\/>|>[\s\S]*?<\/use>)/gi

export function collectSvgPreviewCandidates (documentText: string, options: SvgPreviewOptions): SvgPreviewCandidate[] {
  const convertedDocumentText = convertJsxToSvg(documentText, options)
  const symbols = collectSymbols(convertedDocumentText)
  const candidates: SvgPreviewCandidate[] = []

  addMatches(documentText, SVG_TAG_REGEX, 'svg', candidates, (source) => buildSvgPreview(source, symbols, options))
  addMatches(documentText, SYMBOL_TAG_REGEX, 'symbol', candidates, (source) => buildSymbolPreview(source, options))
  addMatches(documentText, USE_TAG_REGEX, 'use', candidates, (source) => buildUsePreview(source, symbols, options))

  return candidates.sort((a, b) => a.startIndex - b.startIndex || a.length - b.length)
}

export function findSvgPreviewAtOffset (documentText: string, offset: number, options: SvgPreviewOptions): SvgPreviewCandidate | null {
  const candidates = collectSvgPreviewCandidates(documentText, options)
    .filter(candidate => offset >= candidate.startIndex && offset <= candidate.startIndex + candidate.length)
    .sort((a, b) => a.length - b.length)

  return candidates[0] ?? null
}

export function svgToDataUri (svgContent: string): string {
  const base64Svg = Buffer.from(svgContent).toString('base64')
  return `data:image/svg+xml;base64,${base64Svg}`
}

function addMatches (
  documentText: string,
  regex: RegExp,
  kind: SvgPreviewKind,
  candidates: SvgPreviewCandidate[],
  buildPreview: (source: string) => string | null
): void {
  regex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(documentText))) {
    const source = match[0]
    const previewSvg = buildPreview(source)
    if (!previewSvg) {
      continue
    }

    candidates.push({
      kind,
      source,
      previewSvg,
      startIndex: match.index,
      length: source.length
    })
  }
}

function collectSymbols (documentText: string): Map<string, SvgSymbolDefinition> {
  const symbols = new Map<string, SvgSymbolDefinition>()
  let match: RegExpExecArray | null

  SYMBOL_TAG_REGEX.lastIndex = 0
  while ((match = SYMBOL_TAG_REGEX.exec(documentText))) {
    const attrs = match[1] ?? ''
    const id = getAttribute(attrs, 'id')
    if (!id) {
      continue
    }

    symbols.set(id, {
      id,
      source: match[0],
      attrs,
      inner: match[2] ?? ''
    })
  }

  return symbols
}

function buildSvgPreview (
  source: string,
  symbols: Map<string, SvgSymbolDefinition>,
  options: SvgPreviewOptions
): string | null {
  const svgContent = convertJsxToSvg(source, options)
  return preparePreviewSvg(resolveUseReferences(svgContent, symbols), options)
}

function buildSymbolPreview (source: string, options: SvgPreviewOptions): string | null {
  const symbolContent = convertJsxToSvg(source, options)
  const match = symbolContent.match(/^<symbol\b([^>]*)>([\s\S]*?)<\/symbol>$/i)
  if (!match) {
    return null
  }

  const attrs = omitAttributes(match[1] ?? '', ['id'])
  return preparePreviewSvg(`<svg${attrs}>${match[2] ?? ''}</svg>`, options)
}

function buildUsePreview (
  source: string,
  symbols: Map<string, SvgSymbolDefinition>,
  options: SvgPreviewOptions
): string | null {
  const useContent = convertJsxToSvg(source, options)
  const referenceId = getUseReferenceId(useContent)
  if (!referenceId) {
    return null
  }

  const symbol = symbols.get(referenceId)
  if (!symbol) {
    return null
  }

  const rootAttrs = omitAttributes(symbol.attrs, ['id'])
  return preparePreviewSvg(`<svg${rootAttrs}><defs>${symbol.source}</defs>${useContent}</svg>`, options)
}

function resolveUseReferences (svgContent: string, symbols: Map<string, SvgSymbolDefinition>): string {
  const referenceIds = getUseReferenceIds(svgContent)
    .filter(id => !hasSymbolDefinition(svgContent, id) && symbols.has(id))

  if (referenceIds.length === 0) {
    return svgContent
  }

  const uniqueReferenceIds = [...new Set(referenceIds)]
  const defs = uniqueReferenceIds
    .map(id => symbols.get(id)?.source)
    .filter((source): source is string => Boolean(source))
    .join('')

  let resolvedSvg = ensureRootViewBox(svgContent, symbols.get(uniqueReferenceIds[0]))
  resolvedSvg = resolvedSvg.replace(/<svg\b[^>]*>/i, match => `${match}<defs>${defs}</defs>`)

  return resolvedSvg
}

function preparePreviewSvg (svgContent: string, options: SvgPreviewOptions): string | null {
  let previewSvg = ensureXmlns(svgContent)
  previewSvg = previewSvg.replace(/currentColor/g, options.contrastColor)
  previewSvg = propagateStrokeAndFill(previewSvg)
  previewSvg = ensureMinimumSize(previewSvg, options.minSize)

  const validationContent = previewSvg.replace(/<style[\s\S]*?<\/style>/gi, '')
  if (validationContent.includes('{') || validationContent.includes('}')) {
    return null
  }

  return previewSvg
}

function ensureXmlns (svgContent: string): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  const hasXmlnsInRoot = svgOpenTagMatch && /xmlns\s*=\s*["']/.test(svgOpenTagMatch[0])

  if (hasXmlnsInRoot) {
    return svgContent
  }

  return svgContent.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
}

function propagateStrokeAndFill (svgContent: string): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  if (!svgOpenTagMatch) return svgContent

  const svgOpenTag = svgOpenTagMatch[0]
  const stroke = getAttribute(svgOpenTag, 'stroke')

  if (!stroke) {
    return svgContent
  }

  const shapeElements = ['path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect']
  const shapeRegex = new RegExp(`<(${shapeElements.join('|')})([^>]*?)(\\/?>)`, 'gi')

  return svgContent.replace(shapeRegex, (match, tagName, attrs, ending) => {
    if (attrs && /\bstroke\s*=/.test(attrs)) {
      return match
    }

    return `<${tagName}${attrs || ''} stroke="${stroke}"${ending}`
  })
}

function ensureMinimumSize (svgContent: string, minSize: number): string {
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  if (!svgOpenTagMatch) return svgContent

  const svgOpenTag = svgOpenTagMatch[0]
  const hasWidth = /\bwidth\s*=\s*["'][^"']+["']/.test(svgOpenTag)
  const hasHeight = /\bheight\s*=\s*["'][^"']+["']/.test(svgOpenTag)
  const viewBox = getAttribute(svgOpenTag, 'viewBox')

  if (!hasWidth && !hasHeight) {
    if (viewBox) {
      const viewBoxParts = viewBox.split(/\s+/)
      if (viewBoxParts.length >= 4) {
        const vbWidth = parseFloat(viewBoxParts[2])
        const vbHeight = parseFloat(viewBoxParts[3])
        const scale = minSize / Math.max(vbWidth, vbHeight)
        const newWidth = Math.round(vbWidth * scale)
        const newHeight = Math.round(vbHeight * scale)
        return svgContent.replace('<svg', `<svg width="${newWidth}" height="${newHeight}"`)
      }
    }

    return svgContent.replace('<svg', `<svg width="${minSize}" height="${minSize}"`)
  }

  const widthMatch = svgOpenTag.match(/\bwidth\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/)
  const heightMatch = svgOpenTag.match(/\bheight\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/)

  if (!widthMatch || !heightMatch) {
    return svgContent
  }

  const width = parseFloat(widthMatch[1])
  const height = parseFloat(heightMatch[1])

  if (width >= minSize || height >= minSize) {
    return svgContent
  }

  const scale = minSize / Math.max(width, height)
  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  return svgContent
    .replace(/\bwidth\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/, `width="${newWidth}"`)
    .replace(/\bheight\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/, `height="${newHeight}"`)
}

function ensureRootViewBox (svgContent: string, symbol: SvgSymbolDefinition | undefined): string {
  if (!symbol) {
    return svgContent
  }

  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
  if (!svgOpenTagMatch || /\bviewBox\s*=/.test(svgOpenTagMatch[0])) {
    return svgContent
  }

  const viewBox = getAttribute(symbol.attrs, 'viewBox')
  if (!viewBox) {
    return svgContent
  }

  return svgContent.replace(/<svg\b([^>]*)>/i, `<svg$1 viewBox="${viewBox}">`)
}

function hasSymbolDefinition (svgContent: string, id: string): boolean {
  const escapedId = escapeRegExp(id)
  return new RegExp(`<symbol\\b[^>]*\\bid\\s*=\\s*["']${escapedId}["']`, 'i').test(svgContent)
}

function getUseReferenceIds (svgContent: string): string[] {
  const referenceIds: string[] = []
  let match: RegExpExecArray | null

  USE_TAG_REGEX.lastIndex = 0
  while ((match = USE_TAG_REGEX.exec(svgContent))) {
    const id = getUseReferenceId(match[0])
    if (id) {
      referenceIds.push(id)
    }
  }

  return referenceIds
}

function getUseReferenceId (useTag: string): string | null {
  const href = getAttribute(useTag, 'href') ?? getAttribute(useTag, 'xlink:href')
  if (!href?.startsWith('#')) {
    return null
  }

  return href.slice(1)
}

function getAttribute (attrs: string, name: string): string | null {
  const escapedName = escapeRegExp(name)
  const match = attrs.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  return match?.[2] ?? null
}

function omitAttributes (attrs: string, names: string[]): string {
  const result = names.reduce((currentAttrs, name) => {
    const escapedName = escapeRegExp(name)
    return currentAttrs.replace(new RegExp(`\\s*\\b${escapedName}\\s*=\\s*(["']).*?\\1`, 'gi'), '')
  }, attrs)

  if (result.length > 0 && !/^\s/.test(result)) {
    return ` ${result}`
  }

  return result
}

function escapeRegExp (value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
