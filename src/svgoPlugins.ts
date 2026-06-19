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

/**
 * User-configurable SVGO options, resolved from the `betterSvg.*` settings.
 *
 * Kept in a vscode-free module so the plugin list can be unit tested without
 * the extension host.
 */
export interface SvgoOptions {
  removeClasses: boolean
  removeComments: boolean
  removeDoctype: boolean
  cleanupIds: boolean
  floatPrecision: number
  multipass: boolean
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
          removeUnknownsAndDefaults: removeClasses,
          // When we are about to strip the class attributes, inline every
          // class-based <style> rule first. Otherwise removing the classes
          // (and the <style> block) wipes out the fill/stroke of any element
          // styled through a shared class, leaving it black/invisible.
          // onlyMatchedOnce: false lets a rule shared by several elements be
          // inlined on all of them.
          ...(removeClasses
            ? { inlineStyles: { onlyMatchedOnce: false } }
            : {})
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
