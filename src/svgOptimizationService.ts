import * as vscode from 'vscode'
import { optimize } from 'svgo/browser'
import { calculateSavings, formatKilobytes } from './utils'

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

    const {
      originalSize,
      optimizedSize,
      savingPercent
    } = calculateSavings(svgContent, result.data)

    vscode.window.showInformationMessage(
      `SVG optimized. Reduced from ${formatKilobytes(originalSize)} to ${formatKilobytes(optimizedSize)} (${savingPercent}% saved)`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to optimize SVG: ${error}`)
  }
}
