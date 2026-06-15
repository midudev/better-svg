import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateSavings,
  ensureMinimumSize,
  formatBytes,
  formatKilobytes,
  propagateRootStroke
} from './utils'

describe('formatBytes', () => {
  it('formats bytes below 1 KB as bytes', () => {
    assert.strictEqual(formatBytes(512), '512 bytes')
  })

  it('formats bytes at or above 1 KB as KB', () => {
    assert.strictEqual(formatBytes(1536), '1.50 KB')
  })
})

describe('formatKilobytes', () => {
  it('formats bytes as KB', () => {
    assert.strictEqual(formatKilobytes(1536), '1.50 KB')
  })
})

describe('calculateSavings', () => {
  it('returns raw and formatted size information', () => {
    const result = calculateSavings('a'.repeat(2048), 'a'.repeat(1024))

    assert.strictEqual(result.originalSize, 2048)
    assert.strictEqual(result.optimizedSize, 1024)
    assert.strictEqual(result.savingPercent, '50.00')
    assert.strictEqual(result.originalSizeFormatted, '2.00 KB')
    assert.strictEqual(result.optimizedSizeFormatted, '1.00 KB')
  })
})

describe('propagateRootStroke', () => {
  it('copies root stroke to child shapes without an explicit stroke', () => {
    const svg = '<svg stroke="currentColor"><path d="M0 0" /><circle stroke="red" /></svg>'
    const result = propagateRootStroke(svg)
    const pathTag = result.match(/<path\b[^>]*>/)?.[0] ?? ''
    const circleTag = result.match(/<circle\b[^>]*>/)?.[0] ?? ''

    assert.match(pathTag, /\bstroke="currentColor"/)
    assert.match(circleTag, /\bstroke="red"/)
  })
})

describe('ensureMinimumSize', () => {
  it('scales explicit small dimensions', () => {
    const svg = '<svg width="12" height="6"><path /></svg>'

    assert.strictEqual(
      ensureMinimumSize(svg, 24),
      '<svg width="24" height="12"><path /></svg>'
    )
  })

  it('adds dimensions from viewBox when missing', () => {
    const svg = '<svg viewBox="0 0 10 20"><path /></svg>'

    assert.strictEqual(
      ensureMinimumSize(svg, 40),
      '<svg width="20" height="40" viewBox="0 0 10 20"><path /></svg>'
    )
  })

  it('adds dimensions to uppercase SVG tags', () => {
    const svg = '<SVG viewBox="0 0 10 20"><path /></SVG>'

    assert.strictEqual(
      ensureMinimumSize(svg, 40),
      '<SVG width="20" height="40" viewBox="0 0 10 20"><path /></SVG>'
    )
  })

  it('keeps dimensions when either side is already large enough', () => {
    const svg = '<svg width="24" height="12"><path /></svg>'

    assert.strictEqual(ensureMinimumSize(svg, 24), svg)
  })
})
