import * as vscode from 'vscode'
import { optimize } from 'svgo/browser'

export function getSvgoPlugins (removeClasses: boolean): any[] {
  const plugins: any[] = [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Preserve important attributes by default
          cleanupIds: false,
          // Disable removing unknown attributes (like onClick, data-*) when preserving classes (inline mode)
          removeUnknownsAndDefaults: removeClasses
        }
      }
    },
    'removeDoctype',
    'removeComments',
    {
      name: 'removeAttrs',
      params: {
        // Remove attributes that are not useful in most cases
        attrs: [
          'xmlns:xlink',
          'xml:space',
          ...(removeClasses ? ['class'] : [])
        ]
      }
    }
  ]

  return plugins
}

export async function optimizeSvgDocument (document: vscode.TextDocument) {
  const svgContent = document.getText()

  try {
    const plugins = getSvgoPlugins(true)

    const result = optimize(svgContent, {
      multipass: true,
      plugins
    })

    const edit = new vscode.WorkspaceEdit()
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(svgContent.length)
    )
    edit.replace(document.uri, fullRange, result.data)

    await vscode.workspace.applyEdit(edit)

    // Calculate savings
    const originalSize = Buffer.byteLength(svgContent, 'utf8')
    const optimizedSize = Buffer.byteLength(result.data, 'utf8')
    const savingPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2)
    const originalSizeKB = (originalSize / 1024).toFixed(2)
    const optimizedSizeKB = (optimizedSize / 1024).toFixed(2)

    vscode.window.showInformationMessage(
      `SVG optimized. Reduced from ${originalSizeKB} KB to ${optimizedSizeKB} KB (${savingPercent}% saved)`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to optimize SVG: ${error}`)
  }
}
