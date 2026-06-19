import * as vscode from 'vscode'
import { optimize } from 'svgo/browser'
import { calculateSavings, formatKilobytes } from './utils'

/**
 * User-configurable SVGO options, resolved from the `betterSvg.*` settings.
 */
export interface SvgoOptions {
  removeClasses: boolean
  removeComments: boolean
  removeDoctype: boolean
  cleanupIds: boolean
  floatPrecision: number
  multipass: boolean
}

/**
 * Read the SVGO options from the user's configuration, allowing callers to
 * override specific values (e.g. inline/framework optimization always needs to
 * preserve classes and unknown attributes regardless of the user setting).
 */
export function getSvgoOptions(
  overrides: Partial<SvgoOptions> = {}
): SvgoOptions {
  const config = vscode.workspace.getConfiguration('betterSvg')

  return {
    removeClasses: config.get<boolean>('removeClasses', true),
    removeComments: config.get<boolean>('removeComments', true),
    removeDoctype: config.get<boolean>('removeDoctype', true),
    cleanupIds: config.get<boolean>('cleanupIds', false),
    floatPrecision: config.get<number>('floatPrecision', 3),
    multipass: config.get<boolean>('multipass', true),
    ...overrides
  }
}

export function getSvgoPlugins(options: SvgoOptions): any[] {
  const { removeClasses, removeComments, removeDoctype, cleanupIds } = options

  const plugins: any[] = [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Minify/remove unused IDs only when the user opts in (risky for sprites/refs)
          cleanupIds: cleanupIds ? {} : false,
          // Disable removing unknown attributes (like onClick, data-*) when preserving classes (inline mode)
          removeUnknownsAndDefaults: removeClasses
        }
      }
    }
  ]

  if (removeDoctype) {
    plugins.push('removeDoctype')
  }

  if (removeComments) {
    plugins.push('removeComments')
  }

  plugins.push({
    name: 'removeAttrs',
    params: {
      // Remove attributes that are not useful in most cases
      attrs: ['xmlns:xlink', 'xml:space', ...(removeClasses ? ['class'] : [])]
    }
  })

  return plugins
}

export async function optimizeSvgDocument(document: vscode.TextDocument) {
  const svgContent = document.getText()

  try {
    const svgoOptions = getSvgoOptions()
    const plugins = getSvgoPlugins(svgoOptions)

    const result = optimize(svgContent, {
      multipass: svgoOptions.multipass,
      floatPrecision: svgoOptions.floatPrecision,
      plugins
    })

    const edit = new vscode.WorkspaceEdit()
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(svgContent.length)
    )
    edit.replace(document.uri, fullRange, result.data)

    await vscode.workspace.applyEdit(edit)

    const { originalSize, optimizedSize, savingPercent } = calculateSavings(
      svgContent,
      result.data
    )

    vscode.window.showInformationMessage(
      `SVG optimized. Reduced from ${formatKilobytes(originalSize)} to ${formatKilobytes(optimizedSize)} (${savingPercent}% saved)`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to optimize SVG: ${error}`)
  }
}
