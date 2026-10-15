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

import { map2src, nodeRangesSet, nodeRangesGet } from './svgUtils'

function findInDoc(tx: string, doc: vscode.TextDocument) {
  //if (message.type === 'nodeClicked') {
  const mapaRangos = nodeRangesGet(doc.uri);
  const rng = mapaRangos?.get(parseInt(tx));
  if (rng) {
    const startPos = doc.positionAt(rng.start);
    const endPos = doc.positionAt(rng.end);
    const range = new vscode.Range(startPos, endPos);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.selection = new vscode.Selection(startPos, endPos);
      editor.revealRange(range);
    }
  }
}

export class SvgPreviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'betterSvg.preview'
  private _view?: vscode.WebviewView | undefined
  private _currentDocument?: vscode.TextDocument | undefined
  private readonly context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  public get isVisible(): boolean {
    return this._view?.visible ?? false
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
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

      const txtOriginal = editor.document.getText();
      const { txtModified, mapaRangos } = map2src(txtOriginal);

      nodeRangesSet(editor.document.uri, mapaRangos); // ← guardas aquí

      webviewView.webview.html = this.getHtmlForWebview(
        webviewView.webview,
        //editor.document
        txtModified
      )
    } else {
      webviewView.webview.html = this.getHtmlForWebview(
        webviewView.webview,
        null
      )
    }

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((e) => {
      if (this._currentDocument) {
        switch (e.type) {
          case 'update':
            this.updateTextDocument(this._currentDocument, e.content)
            break
          case 'optimize':
            optimizeSvgDocument(this._currentDocument)
            break
          case 'find':
            findInDoc(e.text, this._currentDocument);
            break
        }
      }
    })
  }

  public updatePreview(document: vscode.TextDocument) {
    if (this._view) {
      const text = document.getText();
      // creamos ranges asociados a elementos de svg (excluidos los no renderizables)
      const { txtModified, mapaRangos } = map2src(text);
      nodeRangesSet(document.uri, mapaRangos);
      this._currentDocument = document
      this._view.webview.postMessage({
        type: 'update',
        content: txtModified
      })
    }
  }

  public clearPreview() {
    if (this._view) {
      this._currentDocument = undefined
      this._view.webview.postMessage({
        type: 'clear'
      })
    }
  }

  public postPreview(type: string, content: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: type, content: content })
    }
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    //document: vscode.TextDocument | null
    document: string | null
  ): string {
    try {
      // const svgContent = document ? document.getText() : '<svg></svg>'
      const svgContent = (document) ? document : '<svg></svg>'

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
      const htmlUri = vscode.Uri.joinPath(
        extensionUri,
        'dist',
        'webview',
        'index.html'
      )
      const htmlPath = htmlUri.fsPath

      if (!htmlPath) {
        vscode.window.showErrorMessage(
          `Better SVG: htmlPath is undefined! URI: ${htmlUri.toString()}`
        )
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

  private updateTextDocument(document: vscode.TextDocument, content: string) {
    const edit = new vscode.WorkspaceEdit()
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content
    )
    vscode.workspace.applyEdit(edit)
  }
}
