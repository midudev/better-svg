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

import * as vscode from 'vscode'
import { convertJsxToSvg } from './svgTransform'
import ts from 'typescript'

interface SvgCacheEntry {
  dataUri: string
  sizeBytes: number
  timestamp: number
}

interface HoverCommandArgs {
  uri: string
  start: number
  length: number
}
function findSvgRanges (
  document: vscode.TextDocument
): { start: number; end: number }[] {
  const source = ts.createSourceFile(
    document.fileName,
    document.getText(),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const ranges: { start: number; end: number }[] = []

  function visit (node: ts.Node) {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText() === 'svg'
    ) {
      ranges.push({ start: node.pos, end: node.end })
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return ranges
}

export class SvgHoverProvider implements vscode.HoverProvider {
  private cache: Map<string, SvgCacheEntry> = new Map()
  private cacheMaxAge = 5000 // 5 seconds

  public provideHover (
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.Hover | null {
  const config = vscode.workspace.getConfiguration('betterSvg')
  const enableHover = config.get<boolean>('enableHover', true)
  if (!enableHover) {
    return null
  }

  const ranges = findSvgRanges(document)

  for (const { start, end } of ranges) {
    const range = new vscode.Range(
      document.positionAt(start),
      document.positionAt(end)
    )

    if (!range.contains(position)) {
      continue
    }

    const originalSvg = document.getText(range)
    const sizeBytes = Buffer.byteLength(originalSvg, 'utf8')

    // Cache key (equivalente al anterior, pero sin regex)
    const cacheKey = `${document.uri.toString()}:${start}:${originalSvg.length}`
    const cached = this.cache.get(cacheKey)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < this.cacheMaxAge) {
      return this.createHoverFromCache(cached, range, document)
    }

    let svgContent = originalSvg
    const options = {
      useCamelCase: ['javascriptreact', 'typescriptreact'].includes(document.languageId)
    }

    // Convert JSX syntax to valid SVG
    svgContent = convertJsxToSvg(svgContent, options)

    // Add xmlns if missing
    const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
    const hasXmlnsInRoot =
      svgOpenTagMatch && /xmlns\s*=\s*["']/.test(svgOpenTagMatch[0])

    if (!hasXmlnsInRoot) {
      svgContent = svgContent.replace(
        /<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"'
      )
    }

    // Replace currentColor based on theme
    const isDarkTheme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast

    const contrastColor = isDarkTheme ? '#ffffff' : '#000000'
    svgContent = svgContent.replace(/currentColor/g, contrastColor)

    // Propagate stroke/fill
    svgContent = this.propagateStrokeAndFill(svgContent)

    // Ensure minimum size
    svgContent = this.ensureMinimumSize(svgContent, 128)

    // Validation
    const validationContent = svgContent.replace(/<style[\s\S]*?<\/style>/gi, '')
    if (validationContent.includes('{') || validationContent.includes('}')) {
      return null
    }

    // Encode SVG
    const base64Svg = Buffer.from(svgContent).toString('base64')
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`

    // Update cache
    this.cache.set(cacheKey, {
      dataUri,
      sizeBytes,
      timestamp: now
    })

    const commandArgs = this.buildHoverCommandArgs(document, range)
    return this.createHover(dataUri, sizeBytes, range, commandArgs)
  }

  return null
}

  private createHover (
    dataUri: string,
    sizeBytes: number,
    range: vscode.Range,
    commandArgs: HoverCommandArgs
  ): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true
    markdown.appendMarkdown(`![SVG Preview](${dataUri})\n\n`)
    markdown.appendMarkdown(`**Size:** ${this.formatBytes(sizeBytes)}\n\n`)
    const encodedArgs = encodeURIComponent(JSON.stringify(commandArgs))
    markdown.appendMarkdown(`[⚡ Optimizar SVG](command:betterSvg.optimizeFromHover?${encodedArgs})`)

    return new vscode.Hover(markdown, range)
  }

  private createHoverFromCache (
    cached: SvgCacheEntry,
    range: vscode.Range,
    document: vscode.TextDocument
  ): vscode.Hover {
    const commandArgs = this.buildHoverCommandArgs(document, range)
    return this.createHover(cached.dataUri, cached.sizeBytes, range, commandArgs)
  }

  private formatBytes (bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} bytes`
    }
    const kb = bytes / 1024
    return `${kb.toFixed(2)} KB`
  }

  private buildHoverCommandArgs (
    document: vscode.TextDocument,
    range: vscode.Range
  ): HoverCommandArgs {
    const start = document.offsetAt(range.start)
    const end = document.offsetAt(range.end)
    return {
      uri: document.uri.toString(),
      start,
      length: end - start
    }
  }

  private propagateStrokeAndFill (svgContent: string): string {
    // Extract stroke and fill from the root <svg> element
    const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
    if (!svgOpenTagMatch) return svgContent

    const svgOpenTag = svgOpenTagMatch[0]

    // Extract stroke attribute from svg tag
    const strokeMatch = svgOpenTag.match(/\bstroke\s*=\s*["']([^"']+)["']/)
    const stroke = strokeMatch ? strokeMatch[1] : null

    // If there's a stroke on the parent, propagate it to child elements that don't have one
    if (stroke) {
      const shapeElements = ['path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect']
      const shapeRegex = new RegExp(`<(${shapeElements.join('|')})([^>]*?)(\\/?>)`, 'gi')

      svgContent = svgContent.replace(shapeRegex, (match, tagName, attrs, ending) => {
        // Check if stroke is already present in attrs
        if (attrs && /\bstroke\s*=/.test(attrs)) {
          return match
        }
        return `<${tagName}${attrs || ''} stroke="${stroke}"${ending}`
      })
    }

    return svgContent
  }

  private ensureMinimumSize (svgContent: string, minSize: number): string {
    // Check if SVG has width/height attributes (only in svg tag, not child elements)
    const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
    if (!svgOpenTagMatch) return svgContent

    const svgOpenTag = svgOpenTagMatch[0]
    const hasWidth = /\bwidth\s*=\s*["'][^"']+["']/.test(svgOpenTag)
    const hasHeight = /\bheight\s*=\s*["'][^"']+["']/.test(svgOpenTag)

    // Try to get dimensions from viewBox if no explicit width/height
    const viewBoxMatch = svgOpenTag.match(/viewBox\s*=\s*["']([^"']+)["']/)

    if (!hasWidth && !hasHeight) {
      if (viewBoxMatch) {
        // Use viewBox dimensions scaled to minSize
        const viewBoxParts = viewBoxMatch[1].split(/\s+/)
        if (viewBoxParts.length >= 4) {
          const vbWidth = parseFloat(viewBoxParts[2])
          const vbHeight = parseFloat(viewBoxParts[3])
          const scale = minSize / Math.max(vbWidth, vbHeight)
          const newWidth = Math.round(vbWidth * scale)
          const newHeight = Math.round(vbHeight * scale)
          svgContent = svgContent.replace('<svg', `<svg width="${newWidth}" height="${newHeight}"`)
        } else {
          svgContent = svgContent.replace('<svg', `<svg width="${minSize}" height="${minSize}"`)
        }
      } else {
        // No viewBox either, add default size
        svgContent = svgContent.replace('<svg', `<svg width="${minSize}" height="${minSize}"`)
      }
    } else {
      // Scale up small SVGs
      const widthMatch = svgOpenTag.match(/\bwidth\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/)
      const heightMatch = svgOpenTag.match(/\bheight\s*=\s*["'](\d+(?:\.\d+)?)(?:px)?["']/)

      if (widthMatch && heightMatch) {
        const width = parseFloat(widthMatch[1])
        const height = parseFloat(heightMatch[1])

        if (width < minSize && height < minSize) {
          const scale = minSize / Math.max(width, height)
          const newWidth = Math.round(width * scale)
          const newHeight = Math.round(height * scale)

          svgContent = svgContent
            .replace(/\bwidth\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/, `width="${newWidth}"`)
            .replace(/\bheight\s*=\s*["']\d+(?:\.\d+)?(?:px)?["']/, `height="${newHeight}"`)
        }
      }
    }

    return svgContent
  }

  public clearCache (): void {
    this.cache.clear()
  }
}

export class SvgGutterPreview {
  private decorationTypes: Map<string, vscode.TextEditorDecorationType[]> = new Map()

  public updateDecorations (editor: vscode.TextEditor) {
    if (!editor) {
      return
    }

    const docUri = editor.document.uri.toString()

    // Dispose existing decorations for this document
    this.disposeDecorationsForUri(docUri)

    // Check if gutter preview is enabled in settings
    const config = vscode.workspace.getConfiguration('betterSvg')
    const showGutterPreview = config.get<boolean>('showGutterPreview', true)
    if (!showGutterPreview) {
      return
    }

    const text = editor.document.getText()
    const svgRegex = /<svg[\s\S]*?>[\s\S]*?<\/svg>/g
    const newDecorationTypes: vscode.TextEditorDecorationType[] = []

    let match
    while ((match = svgRegex.exec(text))) {
      const startPos = editor.document.positionAt(match.index)
      // Use a zero-length range at the start of the SVG to ensure only one gutter icon is shown
      const range = new vscode.Range(startPos, startPos)

      let svgContent = match[0]
      const options = {
        useCamelCase: ['javascriptreact', 'typescriptreact'].includes(editor.document.languageId)
      }

      // Convert JSX syntax to valid SVG
      svgContent = convertJsxToSvg(svgContent, options)

      // Add xmlns if missing (do this early so SVG is valid)
      // Check ONLY inside the opening <svg ... > tag
      const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
      const hasXmlnsInRoot = svgOpenTagMatch && /xmlns\s*=\s*["']/.test(svgOpenTagMatch[0])
      
      if (!hasXmlnsInRoot) {
        svgContent = svgContent.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"')
      }

      // Replace currentColor based on theme
      const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                          vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast

      const contrastColor = isDarkTheme ? '#ffffff' : '#000000'

      svgContent = svgContent.replace(/currentColor/g, contrastColor)

      // Propagate stroke/fill from parent to children (after currentColor is resolved)
      svgContent = this.propagateStrokeAndFill(svgContent)

      // Ensure minimum size for gutter icon
      svgContent = this.ensureMinimumSize(svgContent, 16)

      // Validate that the SVG is likely to be renderable.
      const validationContent = svgContent.replace(/<style[\s\S]*?<\/style>/gi, '')
      if (validationContent.includes('{') || validationContent.includes('}')) {
        continue
      }

      // Encode SVG content for data URI - use base64 for better compatibility
      const base64Svg = Buffer.from(svgContent).toString('base64')
      const dataUri = `data:image/svg+xml;base64,${base64Svg}`

      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse(dataUri),
        gutterIconSize: 'contain'
      })

      newDecorationTypes.push(decorationType)

      editor.setDecorations(decorationType, [{ range }])
    }

    this.decorationTypes.set(docUri, newDecorationTypes)
  }

  private disposeDecorationsForUri (uri: string) {
    const types = this.decorationTypes.get(uri)
    if (types) {
      types.forEach(t => t.dispose())
      this.decorationTypes.delete(uri)
    }
  }

  private propagateStrokeAndFill (svgContent: string): string {
    // Extract stroke and fill from the root <svg> element
    const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
    if (!svgOpenTagMatch) return svgContent

    const svgOpenTag = svgOpenTagMatch[0]

    // Extract stroke attribute from svg tag
    const strokeMatch = svgOpenTag.match(/\bstroke\s*=\s*["']([^"']+)["']/)
    const stroke = strokeMatch ? strokeMatch[1] : null

    // If there's a stroke on the parent, propagate it to child elements that don't have one
    if (stroke) {
      const shapeElements = ['path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect']
      const shapeRegex = new RegExp(`<(${shapeElements.join('|')})([^>]*?)(\\/?>)`, 'gi')

      svgContent = svgContent.replace(shapeRegex, (match, tagName, attrs, ending) => {
        // Check if stroke is already present in attrs
        if (attrs && /\bstroke\s*=/.test(attrs)) {
          return match
        }
        return `<${tagName}${attrs || ''} stroke="${stroke}"${ending}`
      })
    }

    return svgContent
  }

  private ensureMinimumSize (svgContent: string, minSize: number): string {
    // Check if SVG has width/height attributes (only in svg tag, not child elements)
    const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i)
    if (!svgOpenTagMatch) return svgContent

    const svgOpenTag = svgOpenTagMatch[0]
    const hasWidth = /\bwidth\s*=\s*["'][^"']+["']/.test(svgOpenTag)
    const hasHeight = /\bheight\s*=\s*["'][^"']+["']/.test(svgOpenTag)

    // Try to get dimensions from viewBox if no explicit width/height
    const viewBoxMatch = svgOpenTag.match(/viewBox\s*=\s*["']([^"']+)["']/)

    if (!hasWidth && !hasHeight) {
      if (viewBoxMatch) {
        const viewBoxParts = viewBoxMatch[1].split(/\s+/)
        if (viewBoxParts.length >= 4) {
          const vbWidth = parseFloat(viewBoxParts[2])
          const vbHeight = parseFloat(viewBoxParts[3])
          const scale = minSize / Math.max(vbWidth, vbHeight)
          const newWidth = Math.round(vbWidth * scale)
          const newHeight = Math.round(vbHeight * scale)
          svgContent = svgContent.replace('<svg', `<svg width="${newWidth}" height="${newHeight}"`)
        } else {
          svgContent = svgContent.replace('<svg', `<svg width="${minSize}" height="${minSize}"`)
        }
      } else {
        svgContent = svgContent.replace('<svg', `<svg width="${minSize}" height="${minSize}"`)
      }
    }

    return svgContent
  }

  public dispose () {
    this.decorationTypes.forEach(types => types.forEach(t => t.dispose()))
    this.decorationTypes.clear()
  }
}
