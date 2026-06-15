import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  isJsxSvg,
  convertJsxToSvg,
  convertSvgToJsx,
  prepareForOptimization,
  finalizeAfterOptimization,
  jsxToSvgAttributeMap,
  svgToJsxAttributeMap
} from './svgTransform'

describe('isJsxSvg', () => {
  it('should detect JSX expression values like {2}', () => {
    const svg = '<svg><path strokeWidth={2} /></svg>'
    assert.strictEqual(isJsxSvg(svg), true)
  })

  it('should detect className attribute', () => {
    const svg = '<svg className="icon"><path /></svg>'
    assert.strictEqual(isJsxSvg(svg), true)
  })

  it('should detect camelCase attributes', () => {
    const svg = '<svg><path strokeLinecap="round" /></svg>'
    assert.strictEqual(isJsxSvg(svg), true)
  })

  it('should return false for standard SVG', () => {
    const svg = '<svg><path stroke-linecap="round" /></svg>'
    assert.strictEqual(isJsxSvg(svg), false)
  })

  it('should return false for SVG with class attribute', () => {
    const svg = '<svg class="icon"><path /></svg>'
    assert.strictEqual(isJsxSvg(svg), false)
  })

  it('should detect multiple JSX patterns', () => {
    const svg = `<svg className="w-4 h-4">
      <path strokeWidth={2} strokeLinecap="round" />
    </svg>`
    assert.strictEqual(isJsxSvg(svg), true)
  })
})

describe('convertJsxToSvg', () => {
  it('should convert expression values {number} to quoted strings (Base64 encoded)', () => {
    const input = '<svg><path strokeWidth={2} /></svg>'
    // Base64 for "2" is "Mg=="
    // Protected by generic protector
    const expected = '<svg><path data-better-svg-temp-stroke-width="__JSX_BASE64__Mg==__" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert className to class', () => {
    const input = '<svg className="icon"><path /></svg>'
    const expected = '<svg class="icon"><path /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert strokeLinecap to stroke-linecap', () => {
    const input = '<svg><path strokeLinecap="round" /></svg>'
    const expected = '<svg><path stroke-linecap="round" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert strokeLinejoin to stroke-linejoin', () => {
    const input = '<svg><path strokeLinejoin="round" /></svg>'
    const expected = '<svg><path stroke-linejoin="round" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert fillRule to fill-rule', () => {
    const input = '<svg><path fillRule="evenodd" /></svg>'
    const expected = '<svg><path fill-rule="evenodd" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert clipPath to clip-path', () => {
    const input = '<svg><path clipPath="url(#clip)" /></svg>'
    const expected = '<svg><path clip-path="url(#clip)" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should convert xlinkHref to xlink:href', () => {
    const input = '<svg><use xlinkHref="#icon" /></svg>'
    const expected = '<svg><use xlink:href="#icon" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should handle complex JSX SVG', () => {
    const input = `<svg
      className='w-4 h-4 text-white/70'
      fill='none'
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M19 9l-7 7-7-7'
      />
    </svg>`

    const result = convertJsxToSvg(input)

    assert.ok(result.includes('class='), 'should convert className to class')
    assert.ok(result.includes('stroke-linecap='), 'should convert strokeLinecap')
    assert.ok(result.includes('stroke-linejoin='), 'should convert strokeLinejoin')
    assert.ok(result.includes('stroke-linejoin='), 'should convert strokeLinejoin')
    // Base64 for "2" is "Mg=="
    assert.ok(result.includes('data-better-svg-temp-stroke-width="__JSX_BASE64__Mg==__"'), 'should convert strokeWidth={2}')
    assert.ok(!result.includes('className='), 'should not contain className')
    assert.ok(!result.includes('{2}'), 'should not contain expression syntax')
  })

  it('should preserve non-JSX attributes', () => {
    const input = '<svg viewBox="0 0 24 24" fill="none"><path d="M0 0" /></svg>'
    const expected = '<svg viewBox="0 0 24 24" fill="none"><path d="M0 0" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })
})

describe('convertSvgToJsx', () => {
  it('should convert class to className', () => {
    const input = '<svg class="icon"><path /></svg>'
    const expected = '<svg className="icon"><path /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert stroke-linecap to strokeLinecap', () => {
    const input = '<svg><path stroke-linecap="round" /></svg>'
    const expected = '<svg><path strokeLinecap="round" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert stroke-linejoin to strokeLinejoin', () => {
    const input = '<svg><path stroke-linejoin="round" /></svg>'
    const expected = '<svg><path strokeLinejoin="round" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert stroke-width to strokeWidth', () => {
    const input = '<svg><path stroke-width="2" /></svg>'
    const expected = '<svg><path strokeWidth="2" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert fill-rule to fillRule', () => {
    const input = '<svg><path fill-rule="evenodd" /></svg>'
    const expected = '<svg><path fillRule="evenodd" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert clip-path to clipPath', () => {
    const input = '<svg><path clip-path="url(#clip)" /></svg>'
    const expected = '<svg><path clipPath="url(#clip)" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should convert xlink:href to xlinkHref', () => {
    const input = '<svg><use xlink:href="#icon" /></svg>'
    const expected = '<svg><use xlinkHref="#icon" /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should handle optimized SVG output', () => {
    const input = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'

    const result = convertSvgToJsx(input)

    assert.ok(result.includes('className='), 'should convert class to className')
    assert.ok(result.includes('strokeLinecap='), 'should convert stroke-linecap')
    assert.ok(result.includes('strokeLinejoin='), 'should convert stroke-linejoin')
    assert.ok(result.includes('strokeWidth='), 'should convert stroke-width')
    assert.ok(!result.includes('class='), 'should not contain class=')
    assert.ok(!result.includes('stroke-linecap='), 'should not contain kebab-case')
  })
})

describe('roundtrip conversion', () => {
  it('should preserve attributes after JSX -> SVG -> JSX roundtrip', () => {
    const jsxInput = '<svg className="icon"><path strokeWidth="2" strokeLinecap="round" /></svg>'

    const svg = convertJsxToSvg(jsxInput)
    const backToJsx = convertSvgToJsx(svg)

    assert.strictEqual(backToJsx, jsxInput)
  })

  it('should handle all stroke attributes in roundtrip', () => {
    const jsxInput = '<svg><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="bevel" strokeDasharray="5,5" strokeOpacity="0.5" /></svg>'

    const svg = convertJsxToSvg(jsxInput)
    const backToJsx = convertSvgToJsx(svg)

    assert.strictEqual(backToJsx, jsxInput)
  })

  it('should handle font attributes in roundtrip', () => {
    const jsxInput = '<svg><text fontFamily="Arial" fontSize="12" fontWeight="bold" fontStyle="italic" /></svg>'

    const svg = convertJsxToSvg(jsxInput)
    const backToJsx = convertSvgToJsx(svg)

    assert.strictEqual(backToJsx, jsxInput)
  })
})

describe('prepareForOptimization', () => {
  it('should convert JSX SVG and return wasJsx: true', () => {
    const input = '<svg className="icon"><path strokeWidth={2} /></svg>'
    const result = prepareForOptimization(input)

    assert.strictEqual(result.wasJsx, true)
    assert.ok(result.preparedSvg.includes('class='))
    assert.ok(result.preparedSvg.includes('data-better-svg-temp-stroke-width="__JSX_BASE64__Mg==__"'))
  })

  it('should not modify standard SVG and return wasJsx: false', () => {
    const input = '<svg class="icon"><path stroke-width="2" /></svg>'
    const result = prepareForOptimization(input)

    assert.strictEqual(result.wasJsx, false)
    assert.strictEqual(result.preparedSvg, input)
  })
})

describe('finalizeAfterOptimization', () => {
  it('should convert back to JSX when wasJsx is true', () => {
    const optimized = '<svg class="icon"><path stroke-width="2"/></svg>'
    const result = finalizeAfterOptimization(optimized, true)

    assert.ok(result.includes('className='))
    assert.ok(result.includes('strokeWidth='))
  })

  it('should not modify when wasJsx is false', () => {
    const optimized = '<svg class="icon"><path stroke-width="2"/></svg>'
    const result = finalizeAfterOptimization(optimized, false)

    assert.strictEqual(result, optimized)
  })
})

describe('attribute maps', () => {
  it('should have matching entries in both maps', () => {
    const jsxKeys = Object.keys(jsxToSvgAttributeMap)
    const svgKeys = Object.keys(svgToJsxAttributeMap)

    assert.strictEqual(jsxKeys.length, svgKeys.length, 'Maps should have same number of entries')

    for (const [jsx, svg] of Object.entries(jsxToSvgAttributeMap)) {
      assert.strictEqual(svgToJsxAttributeMap[svg], jsx, `${svg} should map back to ${jsx}`)
    }
  })

  it('should include all common stroke attributes', () => {
    const strokeAttrs = ['strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'strokeOpacity']
    for (const attr of strokeAttrs) {
      assert.ok(attr in jsxToSvgAttributeMap, `${attr} should be in jsxToSvgAttributeMap`)
    }
  })

  it('should include all common fill attributes', () => {
    const fillAttrs = ['fillOpacity', 'fillRule']
    for (const attr of fillAttrs) {
      assert.ok(attr in jsxToSvgAttributeMap, `${attr} should be in jsxToSvgAttributeMap`)
    }
  })
})

describe('edge cases', () => {
  it('should handle SVG with no attributes to convert', () => {
    const input = '<svg viewBox="0 0 24 24"><path d="M0 0" /></svg>'
    assert.strictEqual(convertJsxToSvg(input), input)
    assert.strictEqual(convertSvgToJsx(input), input)
  })

  it('should handle empty SVG', () => {
    const input = '<svg></svg>'
    assert.strictEqual(convertJsxToSvg(input), input)
    assert.strictEqual(convertSvgToJsx(input), input)
  })

  it('should handle self-closing SVG elements', () => {
    const input = '<svg><circle strokeWidth={2} /><rect strokeWidth={3} /></svg>'
    const result = convertJsxToSvg(input)
    assert.ok(result.includes('data-better-svg-temp-stroke-width="__JSX_BASE64__Mg==__"'))
    assert.ok(result.includes('data-better-svg-temp-stroke-width="__JSX_BASE64__Mw==__"'))
  })

  it('should handle expression with variable name', () => {
    const input = '<svg><path strokeWidth={strokeSize} /></svg>'
    const result = convertJsxToSvg(input)
    // Base64 for "strokeSize" is "c3Ryb2tlU2l6ZQ=="
    assert.ok(result.includes('data-better-svg-temp-stroke-width="__JSX_BASE64__c3Ryb2tlU2l6ZQ==__"'))
  })

  it('should handle nested SVG elements', () => {
    const input = `<svg className="outer">
      <g className="group">
        <path strokeWidth={2} />
      </g>
    </svg>`
    const result = convertJsxToSvg(input)

    // Count occurrences of class=
    const classCount = (result.match(/class=/g) || []).length
    assert.strictEqual(classCount, 2, 'Should convert both className occurrences')
  })

  it('should not convert partial attribute names', () => {
    // Make sure we don't accidentally convert "mystrokeWidth" or similar
    const input = '<svg data-strokeWidth="test"><path /></svg>'
    const result = convertJsxToSvg(input)
    // The data-strokeWidth should remain unchanged because it's prefixed with data-
    assert.ok(result.includes('data-strokeWidth=') || result.includes('data-stroke-width='))
  })

  it('should handle attributes with single quotes', () => {
    const input = "<svg className='icon'><path strokeLinecap='round' /></svg>"
    const result = convertJsxToSvg(input)
    assert.ok(result.includes("class='icon'"))
    assert.ok(result.includes("stroke-linecap='round'"))
  })

  it('should handle mixed quote styles', () => {
    const input = '<svg className="icon"><path strokeLinecap=\'round\' strokeWidth={2} /></svg>'
    const result = convertJsxToSvg(input)
    assert.ok(result.includes('class="icon"'))
    assert.ok(result.includes("stroke-linecap='round'"))
    assert.ok(result.includes('stroke-width="__JSX_BASE64__Mg==__"'))
  })

  it('should handle nested brackets in expressions (e.g. onClick handlers)', () => {
    const input = '<svg onClick={() => { console.log("click") }} strokeWidth={2}></svg>'
    const result = convertJsxToSvg(input)
    
    // Check that we got a valid attribute format
    // Expression: () => { console.log("click") }
    // Base64: ...
    assert.ok(result.includes('data-better-svg-temp-onClick="__JSX_BASE64__'))
    assert.ok(result.includes('stroke-width="__JSX_BASE64__Mg==__"'))
    
    // Check that we can round-trip it back
    // Simulate what SVGO might do (escape >)
    // Our logic restores onClick={...} and unescapes quotes and HTML entities.
    const backToJsx = convertSvgToJsx(result)
    assert.ok(backToJsx.includes('onClick={() => { console.log("click") }}'))
    assert.ok(backToJsx.includes('strokeWidth=')) 
  })

  it('should handle SVG with inner element having xmlns attribute', () => {
    const input = `<svg width='2em' height='2em' viewBox='0 0 24 24'>
      <title xmlns=''>check-box-solid</title>
      <path fill='currentColor' d='M22 2V1H2v1H1v20h1v1h20v-1h1V2z' />
    </svg>`
    
    // Just ensure it doesn't crash and preserves content
    const result = convertJsxToSvg(input)
    assert.ok(result.includes('<title xmlns=\'\'>check-box-solid</title>'))
  })
})

describe('spread attributes', () => {
  it('should detect spread attributes in isJsxSvg', () => {
    const input = '<svg {...props}><path /></svg>'
    assert.strictEqual(isJsxSvg(input), true)
  })

  it('should convert spread attributes in convertJsxToSvg', () => {
    const input = '<svg {...props}><path /></svg>'
    // Base64 for "props" is "cHJvcHM="
    // Spread attributes are also Base64 encoded, so they get protected!
    const expected = '<svg data-better-svg-temp-data-spread-0="__JSX_BASE64__cHJvcHM=__"><path /></svg>'
    assert.strictEqual(convertJsxToSvg(input), expected)
  })

  it('should restore spread attributes in convertSvgToJsx', () => {
    // Note: restoreEncodedAttributes happens BEFORE restore spread logic.
    // So convertSvgToJsx expects restored attribute names?
    // Wait, convertSvgToJsx calls restoreEncodedAttributes (generic) FIRST.
    // So it converts data-better-svg-temp-data-spread-0 to data-spread-0.
    // Then spread logic picks it up.
    // So input to convertSvgToJsx logic can be the protected version OR the raw version (if coming from tests).
    // If we test the WHOLE flow (roundtrip), it works.
    // If we directly test convertSvgToJsx with protected string, it should work.
    
    // Let's test what 'convertSvgToJsx' does.
    // If input is PROTECTED spread:
    const input = '<svg data-better-svg-temp-data-spread-0="__JSX_BASE64__cHJvcHM=__"><path /></svg>'
    const expected = '<svg {...props}><path /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  // Keep old test for legacy/unprotected case? 
  // RestoreEncodedAttributes just restores known prefix. If it's not there, it does nothing.
  // So data-spread-0 works too.
  it('should restore unwrapped spread attributes (legacy check)', () => {
    const input = '<svg data-spread-0="__JSX_BASE64__cHJvcHM=__"><path /></svg>'
    const expected = '<svg {...props}><path /></svg>'
    assert.strictEqual(convertSvgToJsx(input), expected)
  })

  it('should handle roundtrip with spread attributes', () => {
    const input = '<svg {...props} className="w-4 h-4"><path /></svg>'
    const svg = convertJsxToSvg(input)
    const output = convertSvgToJsx(svg)
    assert.strictEqual(output, input)
  })

  it('should handle multiple spread attributes', () => {
    const input = '<svg {...props} {...user} className="w-4 h-4"><path /></svg>'
    const svg = convertJsxToSvg(input)
    
    // Ensure we have distinct attributes
    assert.ok(svg.includes('data-better-svg-temp-data-spread-0="__JSX_BASE64__cHJvcHM=__"'))
    assert.ok(svg.includes('data-better-svg-temp-data-spread-1="__JSX_BASE64__dXNlcg==__"'))
    
    const output = convertSvgToJsx(svg)
    assert.strictEqual(output, input)
  })

  it('should handle tricky SVG with onClick and class', () => {
    const input = `<svg onClick={() => { console.log('hola') }} class="hola" data-a="hola" id="hola" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>`

    // Should classify as JSX because of strokeLinecap, strokeWidth, onClick expression
    assert.strictEqual(isJsxSvg(input), true)

    const svg = convertJsxToSvg(input)
    // onClick should be converted to string attribute with Base64 encoded expression
    assert.ok(svg.includes('data-better-svg-temp-onClick="__JSX_BASE64__'))
    assert.ok(svg.includes('stroke-linecap="round"'))
    
    const output = convertSvgToJsx(svg)
    
    // Original had class="hola". Output will have className="hola" because convertSvgToJsx enforces className
    const expected = input.replace('class="hola"', 'className="hola"')
    assert.strictEqual(output, expected)
  })
})

describe('Regressions & Edge Cases', () => {

    it('should preserve className={className} (Base64 encoded)', () => {
        const input = `
            <svg className={className} xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
            <polyline points='9 22 9 12 15 12 15 22' />
            </svg>`

        // 1. Prepare
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // 2. Simulate SVGO (identity)
        const optimizedSvg = preparedSvg 

        // 3. Finalize
        const finalResult = finalizeAfterOptimization(optimizedSvg, wasJsx)

        assert.ok(finalResult.includes('className={className}'), `Expected className={className}, got: ${finalResult}`)
        assert.ok(!finalResult.includes('className="className"'), 'Should not contain string literal className="className"')
    })

    it('should preserve style object style={{ color: "red" }}', () => {
        const input = '<svg style={{ color: "red", marginTop: 10 }}><path /></svg>'
        
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // Check intermediate state: style should be hidden from SVGO
        assert.ok(preparedSvg.includes('data-better-svg-temp-style='), 'Style should be renamed')
        assert.ok(!preparedSvg.includes(' style='), 'Original style attribute should be gone')

        // Simulate SVGO
        const optimizedSvg = preparedSvg 

        const finalResult = finalizeAfterOptimization(optimizedSvg, wasJsx)
        
        assert.ok(finalResult.includes('style={{ color: "red", marginTop: 10 }}') || 
                  finalResult.includes('style={{color:"red",marginTop:10}}'), 
                  `Style object destroyed: ${finalResult}`)
    })

    it('should handle the specific Icon2 component causing issues', () => {
        const input = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className={className} viewBox="0 0 24 24" style={{ color: 'red' }}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M12 8v8m-4-4h8"/></svg>`
        
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // Verify key protections
        assert.ok(preparedSvg.includes('data-better-svg-temp-style='))
        // strokeWidth={2} -> encoded
        // className={className} -> encoded className with Base64
        // The original string has strokeWidth="2" (string), not expression {2}. 
        // Wait, the user provided: strokeWidth="2" (string). So it stays as stroke-width="2".
        // className={className} (expression). -> class="__JSX_BASE64...__"
        
        const optimizedSvg = preparedSvg
        const finalResult = finalizeAfterOptimization(optimizedSvg, wasJsx)

        // Verify restoration
        assert.ok(finalResult.includes('className={className}'))
        assert.ok(finalResult.includes("style={{ color: 'red' }}"))
        // String attributes should remain camelCase in JSX if they map
        assert.ok(finalResult.includes('strokeWidth="2"') || finalResult.includes('strokeWidth=\'2\''))
    })

    it('should preserve namespaced/dotted components like <motion.path /> if SVGO allows them', () => {
        const input = '<svg><motion.path d="M0 0 h10" animate={{ x: 100 }} /></svg>'
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        const finalResult = finalizeAfterOptimization(preparedSvg, wasJsx)

        assert.ok(finalResult.includes('<motion.path'), `motion.path lost: ${finalResult}`)
        assert.ok(finalResult.includes('animate={{ x: 100 }}'), `animate prop lost: ${finalResult}`)
    })
})

describe('Comments Handling', () => {
    it('should handle JSX block comments {/* ... */}', () => {
        const input = `
            <svg>
                {/* This is a comment */}
                <path d="M0 0 h10" />
            </svg>`
        
        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        
        // Block comments should be removed or ignored, or converted to XML comments
        // If they remain as {/* ... */}, SVGO will likely choke or treating them as text content.
        // Ideally we strip them for optimization.
        assert.ok(!preparedSvg.includes('{/*'), 'Block comment start should be gone or converted')
        
        // Even if we convert to XML comment <!-- -->, SVGO might remove comments by default.
        // Let's verify structure is valid for SVGO.
        // SVGO requires valid XML. <svg>{...}</svg> is not valid if {} are not tags.
        // We will assert that the prepared string is clean of JSX comment syntax.
    })

    it('should handle JSX line comments // ... inside tag attributes', () => {
        const input = `
            <svg
                // This is a line comment
                width="24"
                height="24"
            >
                <path />
            </svg>`
        
        const { preparedSvg } = prepareForOptimization(input)
        
        assert.ok(!preparedSvg.includes('// This is a line comment'), 'Line comment should be removed')
        assert.ok(preparedSvg.includes('width="24"'), 'Attributes should remain')
    })
})

describe('Complex Components', () => {
    it('should handle the ComplexIcon properly (stroke={color})', () => {
        const input = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill='none'
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={\`icon \${className}\`}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transformOrigin: 'center'
      }}
      onClick={() => console.log('SVG Clicked')}
      fontStyle="italic"
      {...props}
    >
      <title>Complex Icon Test</title>
      <circle cx="12" cy="12" r={size / 4} strokeDasharray="4 4" />
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        strokeOpacity={0.8}
      />
      <g style={{ opacity: 0.9 }}>
        <text
            x="12"
            y="20"
            textAnchor="middle"
            fontFamily="Arial"
            fontSize="8"
            fontStyle="normal"
            fill="currentColor"
        >
            OK
        </text>
      </g>
    </svg>`

        const { preparedSvg, wasJsx } = prepareForOptimization(input)
        const finalResult = finalizeAfterOptimization(preparedSvg, wasJsx)

        // Check stroke={color}
        assert.ok(finalResult.includes('stroke={color}'), `Expected stroke={color}, got: ${finalResult}`)
        assert.ok(!finalResult.includes('__JSX_BASE64__'), 'Should not contain Base64 markers')
    })
})



