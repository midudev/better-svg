
import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  prepareForOptimization,
  finalizeAfterOptimization,
  isJsxSvg
} from './svgTransform'

describe('Astro Support', () => {
    it('should handle Astro expression syntax (similar to JSX)', () => {
        const input = '<svg width={size} height={size}><path d={path} /></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // Should be detected as "JSX-like"
        assert.ok(wasJsx, 'Should detect Astro/JSX expression')
        assert.ok(preparedSvg.includes('data-better-svg-temp-width='))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx)
        assert.strictEqual(final, input)
    })

    it('should handle Astro class:list', () => {
        const input = '<svg class:list={["icon", className]}></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // class:list is a valid attribute name with : (namespace-like)
        // It has expression value ={...}
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-class__COLON__list='))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx)
        assert.strictEqual(final, input)
    })

    it('should preserve Astro boolean directives like client:only', () => {
        const input = '<svg client:only xmlns="http://www.w3.org/2000/svg"></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // isJsxSvg needs to recognize client:only as a reason to be JSX/Astro
        assert.ok(wasJsx, 'Should detect client:only as Astro/JSX')
        
        // Should be protected
        assert.ok(preparedSvg.includes('data-better-svg-temp-client__COLON__only'), `Should be protected: ${preparedSvg}`)
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx)
        assert.ok(final.includes('client:only'), `Final result missing client:only: ${final}`)
    })
})


describe('Vue Support', () => {
    // Vue uses :attr="value" or v-bind:attr="value"
    // CAUTION: The current `svgTransform` logic focuses on JSX-style `={}` expressions.
    // If Vue uses quotes `:width="size"`, replaceJsxExpressions will NOT touch it because it looks for `={`.
    // SVGO might strip `:width` if it doesn't recognize it.
    
    it('should preserve Vue :bound attributes', () => {
        const input = '<svg :width="size" :height="size"><path /></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // Now it detects and protects Vue syntax
        assert.strictEqual(wasJsx, true)
        assert.ok(preparedSvg.includes('data-better-svg-temp-__COLON__width="size"'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx)
        assert.strictEqual(final, input)
    })

    it('should preserve Vue v-bind attributes', () => {
        const input = '<svg v-bind:width="size"></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        assert.strictEqual(wasJsx, true)
        assert.ok(preparedSvg.includes('data-better-svg-temp-v-bind__COLON__width="size"'))
    })
    
    it('should preserve Vue @event handlers', () => {
        const input = '<svg @click="handleClick"></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        assert.strictEqual(wasJsx, true)
        assert.ok(preparedSvg.includes('data-better-svg-temp-__AT__click="handleClick"'))
    })

    it('should NOT convert kebab-case to camelCase in Astro/Vue (useCamelCase: false)', () => {
        const input = '<svg class:list={["foo"]} stroke-width="2"></svg>'
        const options = { useCamelCase: false }
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        // Should preserve stroke-width as is
        assert.ok(!preparedSvg.includes('strokeWidth'))
        assert.ok(preparedSvg.includes('stroke-width'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })

    it('should handle Astro define:vars with style object', () => {
        const input = '<svg define:vars={{ color: "red" }}></svg>'
        const options = { useCamelCase: false }
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-define__COLON__vars'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })
})

describe('Svelte Support', () => {
    const options = { useCamelCase: false }

    it('should handle Svelte on:event handlers', () => {
        const input = '<svg on:click={handleClick} on:mousedown={() => {}}></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-on__COLON__click'))
        assert.ok(preparedSvg.includes('data-better-svg-temp-on__COLON__mousedown'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })

    it('should handle Svelte bind:this and other bindings', () => {
        const input = '<svg bind:this={svgRef} bind:clientWidth={w}></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-bind__COLON__this'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })

    it('should handle Svelte class:active shorthand', () => {
        const input = '<svg class:active={isActive} class:red></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-class__COLON__active'))
        assert.ok(preparedSvg.includes('data-better-svg-temp-class__COLON__red'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })

    it('should handle Svelte interpolations in text', () => {
        const input = '<svg><text>{Math.random() > 0.5 ? "H" : "L"}</text></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('__JSX_BASE64__'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })
})

describe('Mixed Framework Edge Cases', () => {
    it('should handle Vue v-bind object shorthand', () => {
        const input = '<svg v-bind="{ id: 1, class: \'foo\' }"></svg>'
        const options = { useCamelCase: false }
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-v-bind'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })

    it('should handle Vue shorthand for events with modifiers', () => {
        const input = '<svg @click.stop.prevent="doSth"></svg>'
        const options = { useCamelCase: false }
        const { preparedSvg, wasJsx } = prepareForOptimization(input, options)
        
        assert.ok(wasJsx)
        assert.ok(preparedSvg.includes('data-better-svg-temp-__AT__click__DOT__stop__DOT__prevent'))
        
        const final = finalizeAfterOptimization(preparedSvg, wasJsx, options)
        assert.strictEqual(final, input)
    })
})
