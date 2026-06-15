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
import {
  collectSvgPreviewCandidates,
  findSvgPreviewAtOffset,
  svgToDataUri,
  type SvgPreviewOptions
} from './svgPreview'

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

function getPreviewOptions (languageId: string, minSize: number): SvgPreviewOptions {
  const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast

  return {
    useCamelCase: ['javascriptreact', 'typescriptreact'].includes(languageId),
    contrastColor: isDarkTheme ? '#ffffff' : '#000000',
    minSize
  }
}

export class SvgHoverProvider implements vscode.HoverProvider {
  private cache: Map<string, SvgCacheEntry> = new Map()
  private cacheMaxAge = 5000 // 5 seconds

  public provideHover (
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | null {
    // Check if hover is enabled in settings
    const config = vscode.workspace.getConfiguration('betterSvg')
    const enableHover = config.get<boolean>('enableHover', true)
    if (!enableHover) {
      return null
    }

    const text = document.getText()
    const offset = document.offsetAt(position)
    const candidate = findSvgPreviewAtOffset(text, offset, getPreviewOptions(document.languageId, 128))

    if (!candidate) {
      return null
    }

    const startPos = document.positionAt(candidate.startIndex)
    const endPos = document.positionAt(candidate.startIndex + candidate.length)
    const range = new vscode.Range(startPos, endPos)
    const sizeBytes = Buffer.byteLength(candidate.source, 'utf8')
    const cacheKey = `${document.uri.toString()}:${candidate.kind}:${candidate.startIndex}:${candidate.length}:${candidate.previewSvg.length}`
    const cached = this.cache.get(cacheKey)
    const now = Date.now()
    const commandArgs = candidate.kind === 'svg' ? this.buildHoverCommandArgs(document, range) : null

    if (cached && (now - cached.timestamp) < this.cacheMaxAge) {
      return this.createHoverFromCache(cached, range, commandArgs)
    }

    const dataUri = svgToDataUri(candidate.previewSvg)
    this.cache.set(cacheKey, { dataUri, sizeBytes, timestamp: now })

    return this.createHover(dataUri, sizeBytes, range, commandArgs)
  }

  private createHover (
    dataUri: string,
    sizeBytes: number,
    range: vscode.Range,
    commandArgs: HoverCommandArgs | null
  ): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true
    markdown.appendMarkdown(`![SVG Preview](${dataUri})\n\n`)
    markdown.appendMarkdown(`**Size:** ${this.formatBytes(sizeBytes)}\n\n`)

    if (commandArgs) {
      const encodedArgs = encodeURIComponent(JSON.stringify(commandArgs))
      markdown.appendMarkdown(`[⚡ Optimizar SVG](command:betterSvg.optimizeFromHover?${encodedArgs})`)
    }

    return new vscode.Hover(markdown, range)
  }

  private createHoverFromCache (
    cached: SvgCacheEntry,
    range: vscode.Range,
    commandArgs: HoverCommandArgs | null
  ): vscode.Hover {
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
    const candidates = collectSvgPreviewCandidates(
      text,
      getPreviewOptions(editor.document.languageId, 16)
    )
    const newDecorationTypes: vscode.TextEditorDecorationType[] = []

    for (const candidate of candidates) {
      const startPos = editor.document.positionAt(candidate.startIndex)
      // Use a zero-length range at the start of the SVG to ensure only one gutter icon is shown
      const range = new vscode.Range(startPos, startPos)
      const dataUri = svgToDataUri(candidate.previewSvg)

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

  public dispose () {
    this.decorationTypes.forEach(types => types.forEach(t => t.dispose()))
    this.decorationTypes.clear()
  }
}
