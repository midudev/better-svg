import { describe, it } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { optimize } from 'svgo'
import { getSvgoPlugins, type SvgoOptions } from './svgoPlugins'

const baseOptions: SvgoOptions = {
  removeClasses: true,
  removeComments: true,
  removeDoctype: true,
  cleanupIds: false,
  floatPrecision: 3,
  multipass: true
}

function optimizeWith(svg: string, plugins: any[]): string {
  return optimize(svg, { multipass: true, plugins }).data
}

function countOccurrences(text: string, value: string): number {
  return text.split(value).length - 1
}

// Same plugin list as before the inlineStyles fix: strips classes and the
// <style> block without inlining the rules first.
function legacyPlugins(): any[] {
  return [
    {
      name: 'preset-default',
      params: {
        overrides: { cleanupIds: false, removeUnknownsAndDefaults: true }
      }
    },
    'removeDoctype',
    'removeComments',
    {
      name: 'removeAttrs',
      params: { attrs: ['xmlns:xlink', 'xml:space', 'class'] }
    }
  ]
}

describe('getSvgoPlugins', () => {
  const fixture = readFileSync(
    new URL('../static/css-classes-sample.svg', import.meta.url),
    'utf8'
  )

  it('inlines shared class styles before removing the class attributes', () => {
    const result = optimizeWith(fixture, getSvgoPlugins(baseOptions))

    // Classes and the <style> block are gone after optimization.
    assert.ok(!result.includes('class='))
    assert.ok(!result.includes('<style'))

    // ...but every colour defined through those classes survived inlined.
    assert.ok(result.includes('#ffd166'), 'sun fill lost')
    assert.ok(result.includes('#eaf6ff'), 'panel/cloud fill lost')
    assert.ok(result.includes('#1b3a4b'), 'stroke colour lost')

    // The inline style attribute is preserved as well.
    assert.ok(result.includes('#06d6a0'), 'inline style fill lost')
  })

  it('regression guard: the legacy behaviour left shared-class elements unstyled', () => {
    const legacy = optimizeWith(fixture, legacyPlugins())
    const fixed = optimizeWith(fixture, getSvgoPlugins(baseOptions))

    const ellipsesWithoutStyle = (svg: string) =>
      (svg.match(/<ellipse\b[^>]*>/g) ?? []).filter(
        (tag) => !tag.includes('style=')
      ).length

    // The clouds share a class matched by several elements: the default
    // inlineStyles (onlyMatchedOnce: true) skips them, so they end up with no
    // fill/stroke at all — rendered black/invisible.
    assert.ok(ellipsesWithoutStyle(legacy) > 0)

    // With the fix every element keeps its styling...
    assert.strictEqual(ellipsesWithoutStyle(fixed), 0)

    // ...so the optimized output carries strictly more inline styles.
    assert.ok(
      countOccurrences(fixed, 'style=') > countOccurrences(legacy, 'style=')
    )
  })

  it('keeps the class attributes when removeClasses is disabled', () => {
    const plugins = getSvgoPlugins({ ...baseOptions, removeClasses: false })
    const result = optimizeWith(fixture, plugins)

    assert.ok(result.includes('class='))
  })
})
