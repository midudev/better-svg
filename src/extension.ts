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
import { SvgPreviewProvider } from './svgEditorProvider'
import { SvgGutterPreview, SvgHoverProvider } from './svgGutterPreview'
import { optimize } from 'svgo/browser'
import { prepareForOptimization, finalizeAfterOptimization } from './svgTransform'
import { SUPPORTED_LANGUAGES } from './consts'
import { calculateSavings } from './utils'
import { getSvgoPlugins, optimizeSvgDocument } from './svgOptimizationService'

let previewProvider: SvgPreviewProvider
let gutterPreview: SvgGutterPreview

export function activate (context: vscode.ExtensionContext) {
  try {
    if (!context.extensionUri) {
      vscode.window.showErrorMessage('Better SVG: Extension context.extensionUri is undefined!')
      throw new Error('Extension context.extensionUri is undefined')
    }

    // Initialize context for view visibility
    vscode.commands.executeCommand('setContext', 'betterSvg.hasSvgOpen', false)

    // Register preview provider
    previewProvider = new SvgPreviewProvider(context)
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'betterSvg.preview',
        previewProvider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    )

    // Initialize SVG Gutter Preview
    gutterPreview = new SvgGutterPreview()
    if (vscode.window.activeTextEditor) {
      gutterPreview.updateDecorations(vscode.window.activeTextEditor)
    }

    // Register SVG Hover Provider for all supported languages
    const svgHoverProvider = new SvgHoverProvider()

    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        SUPPORTED_LANGUAGES.map((language) => ({
          language,
          scheme: 'file',
        })),
        svgHoverProvider
      )
    )

    // Update decorations when active editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          gutterPreview.updateDecorations(editor)
        }
      })
    )

    // Update decorations when document changes
    let timeout: NodeJS.Timeout | undefined
    const triggerUpdate = (editor: vscode.TextEditor) => {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        gutterPreview.updateDecorations(editor)
      }, 500)
    }

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        const editor = vscode.window.activeTextEditor
        if (editor && editor.document === e.document) {
          triggerUpdate(editor)
        }
      })
    )

    // Update decorations when theme changes
    context.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        const editor = vscode.window.activeTextEditor
        if (editor) {
          gutterPreview.updateDecorations(editor)
        }
      })
    )

    const updateContext = (editor: vscode.TextEditor | undefined) => {
      if (editor && editor.document.fileName.toLowerCase().endsWith('.svg')) {
        // Show the view
        vscode.commands.executeCommand('setContext', 'betterSvg.hasSvgOpen', true)

        const config = vscode.workspace.getConfiguration('betterSvg')
        const autoReveal = config.get<boolean>('autoReveal', true)

        if (autoReveal && editor.document.uri.scheme === 'file' && previewProvider.isVisible) {
          vscode.commands.executeCommand('betterSvg.preview.focus')
        }

        if (previewProvider) {
          previewProvider.updatePreview(editor.document)
        }
      } else {
        // If we switched to a non-SVG file, collapse the panel
        const config = vscode.workspace.getConfiguration('betterSvg')
        const autoCollapse = config.get<boolean>('autoCollapse', true)

        if (autoCollapse) {
          vscode.commands.executeCommand('setContext', 'betterSvg.hasSvgOpen', false)

          if (previewProvider) {
            previewProvider.clearPreview()
          }
        }
      }
    }

    // Auto-reveal panel when SVG file is opened
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        updateContext(editor)
      })
    )

    // Update preview when document changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        const editor = vscode.window.activeTextEditor
        if (editor &&
          editor.document === e.document &&
          editor.document.fileName.toLowerCase().endsWith('.svg') &&
          previewProvider) {
          previewProvider.updatePreview(e.document)
        }
      })
    )

    // Collapse preview when SVG file is closed
    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument(document => {
        if (document.fileName.toLowerCase().endsWith('.svg')) {
          const config = vscode.workspace.getConfiguration('betterSvg')
          const autoCollapse = config.get<boolean>('autoCollapse', true)

          if (!autoCollapse) {
            return
          }

          // Check if there are any other SVG files still open
          const hasOpenSvg = vscode.window.visibleTextEditors.some(
            editor => editor.document.fileName.toLowerCase().endsWith('.svg')
          )

          // If no SVG files are open, hide the view
          if (!hasOpenSvg) {
            vscode.commands.executeCommand('setContext', 'betterSvg.hasSvgOpen', false)

            if (previewProvider) {
              previewProvider.clearPreview()
            }
          }
        }
      })
    )

    // Auto-reveal if an SVG is already open on activation
    // Add a small delay to ensure everything is ready
    setTimeout(() => {
      const activeEditor = vscode.window.activeTextEditor
      updateContext(activeEditor)
    }, 100)

    // Register optimize command
    context.subscriptions.push(
      vscode.commands.registerCommand('betterSvg.optimize', async (uri?: vscode.Uri) => {
        let document: vscode.TextDocument | undefined

        // If URI is provided (e.g. from context menu or title button), open that document
        if (uri && uri instanceof vscode.Uri) {
          try {
            document = await vscode.workspace.openTextDocument(uri)
            await vscode.window.showTextDocument(document)
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to open document: ${error}`)
            return
          }
        } else {
          // Fallback to active text editor
          const editor = vscode.window.activeTextEditor
          if (editor) {
            document = editor.document
          }
        }

        if (!document) {
          vscode.window.showErrorMessage('No active editor or file selected')
          return
        }

        if (!document.fileName.toLowerCase().endsWith('.svg')) {
          vscode.window.showErrorMessage('Not an SVG file')
          return
        }

        await optimizeSvgDocument(document)
      })
    )

    // Register optimize command from hover
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'betterSvg.optimizeFromHover',
        async (args?: { uri: string, start: number, length: number }) => {
          if (!args || !args.uri) {
            vscode.window.showErrorMessage('No SVG metadata provided')
            return
          }

          try {
            const uri = vscode.Uri.parse(args.uri)
            const document = await vscode.workspace.openTextDocument(uri)
            await vscode.window.showTextDocument(document)

            const start = args.start ?? 0
            const length = args.length ?? 0

            if (length <= 0) {
              vscode.window.showErrorMessage('Invalid SVG bounds')
              return
            }

            const range = new vscode.Range(
              document.positionAt(start),
              document.positionAt(start + length)
            )

            const svgContent = document.getText(range)
            await optimizeSvgInline(document, svgContent, range)
          } catch (error) {
            vscode.window.showErrorMessage(`No SVG found at cursor position (${error})`)
          }
        }
      )
    )
  } catch (error: any) {
    vscode.window.showErrorMessage(
      'Better SVG: Failed to activate extension!\n' +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack?.substring(0, 200)}`
    )
    throw error
  }
}

export async function optimizeSvgInline (document: vscode.TextDocument, svgContent: string, range: vscode.Range) {
  try {
    const plugins = getSvgoPlugins(false)
    const options = {
      useCamelCase: ['javascriptreact', 'typescriptreact'].includes(document.languageId)
    }

    // Prepare SVG for optimization (convert JSX to valid SVG if needed)
    const { preparedSvg, wasJsx } = prepareForOptimization(svgContent, options)

    const result = optimize(preparedSvg, {
      multipass: true,
      plugins
    })

    // Convert back to JSX if the original was JSX
    const finalSvg = finalizeAfterOptimization(result.data, wasJsx, options)

    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, range, finalSvg)

    await vscode.workspace.applyEdit(edit)

    const {
      originalSizeFormatted,
      optimizedSizeFormatted,
      savingPercent
    } = calculateSavings(svgContent, finalSvg)

    vscode.window.showInformationMessage(
      `SVG optimized. Reduced from ${originalSizeFormatted} to ${optimizedSizeFormatted} (${savingPercent}% saved)`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to optimize SVG: ${error}`)
  }
}

export function deactivate () { }
