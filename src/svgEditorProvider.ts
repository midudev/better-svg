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
import * as fs from 'fs'
import { optimizeSvgDocument } from './svgOptimizationService'

export class SvgPreviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'betterSvg.preview'
  private _view?: vscode.WebviewView | undefined
  private _currentDocument?: vscode.TextDocument | undefined

  constructor (private readonly context: vscode.ExtensionContext) { }

  public get isVisible (): boolean {
    return this._view?.visible ?? false
  }

  public resolveWebviewView (
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    }

    // Initialize with current document if it's an SVG
    const editor = vscode.window.activeTextEditor
    if (editor && editor.document.fileName.endsWith('.svg')) {
      this._currentDocument = editor.document
      webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, editor.document)
    } else {
      webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, null)
    }

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(e => {
      switch (e.type) {
        case 'update':
          if (this._currentDocument) {
            this.updateTextDocument(this._currentDocument, e.content)
          }
          break
        case 'optimize':
          if (this._currentDocument) {
            optimizeSvgDocument(this._currentDocument)
          }
          break
      }
    })
  }

  public updatePreview (document: vscode.TextDocument) {
    if (this._view) {
      this._currentDocument = document
      this._view.webview.postMessage({
        type: 'update',
        content: document.getText()
      })
    }
  }

  public clearPreview () {
    if (this._view) {
      this._currentDocument = undefined
      this._view.webview.postMessage({
        type: 'clear'
      })
    }
  }

  private getHtmlForWebview (webview: vscode.Webview, document: vscode.TextDocument | null): string {
    try {
      const svgContent = document ? document.getText() : '<svg></svg>'

      // Get default color from configuration
      const config = vscode.workspace.getConfiguration('betterSvg')
      const defaultColor = config.get<string>('defaultColor', '#ffffff')

      // Debug info
      const extensionUri = this.context.extensionUri
      if (!extensionUri) {
        vscode.window.showErrorMessage('Better SVG: extensionUri is undefined!')
        throw new Error('extensionUri is undefined')
      }

      // Get URIs for webview resources
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'main.js')
      )
      const stylesUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'styles.css')
      )

      // Read HTML template
      const htmlUri = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.html')
      const htmlPath = htmlUri.fsPath

      if (!htmlPath) {
        vscode.window.showErrorMessage(`Better SVG: htmlPath is undefined! URI: ${htmlUri.toString()}`)
        throw new Error('htmlPath is undefined')
      }

      let html: string
      try {
        html = fs.readFileSync(htmlPath, 'utf8')
      } catch (readError: any) {
        vscode.window.showErrorMessage(
          'Better SVG: Failed to read HTML file!\n' +
          `Path: ${htmlPath}\n` +
          `Error: ${readError.message}`
        )
        throw readError
      }

      // Replace placeholders
      html = html
        .replace(/{{cspSource}}/g, webview.cspSource)
        .replace(/{{stylesUri}}/g, stylesUri.toString())
        .replace(/{{scriptUri}}/g, scriptUri.toString())
        .replace(/{{svgContent}}/g, () => svgContent)
        .replace(/{{defaultColor}}/g, defaultColor)

      return html
    } catch (error: any) {
      vscode.window.showErrorMessage(
        'Better SVG: Error in getHtmlForWebview!\n' +
        `Message: ${error.message}\n` +
        `Stack: ${error.stack?.substring(0, 200)}`
      )
      throw error
    }
  }

  private updateTextDocument (document: vscode.TextDocument, content: string) {
    const edit = new vscode.WorkspaceEdit()
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content
    )
    vscode.workspace.applyEdit(edit)
  }
}
